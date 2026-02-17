export type RuntimeFixtureValue =
  | number
  | null
  | number[]
  | number[][]

export type RuntimeFixtureInputs = Record<string, RuntimeFixtureValue>

export type RuntimeProblemTestCase = {
  id: string
  name: string
  inputs: RuntimeFixtureInputs
  expectedOutput: number[][]
}

export type RuntimeProblemFixture = {
  problemId: string
  deterministicSeed: number
  functionName: string
  inputOrder: string[]
  inputs: RuntimeFixtureInputs
  expectedOutput: number[][]
  testCases: RuntimeProblemTestCase[]
}

const DETERMINISTIC_SEED = 20260216

function dotProduct(left: number[], right: number[]): number {
  const width = Math.min(left.length, right.length)
  let sum = 0

  for (let index = 0; index < width; index += 1) {
    sum += left[index] * right[index]
  }

  return sum
}

function matMul(left: number[][], right: number[][]): number[][] {
  const rows = left.length
  const shared = left[0]?.length ?? 0
  const cols = right[0]?.length ?? 0

  const result: number[][] = Array.from({ length: rows }, () => {
    return Array.from({ length: cols }, () => 0)
  })

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const leftRow = left[rowIndex] ?? []
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      let sum = 0
      for (let sharedIndex = 0; sharedIndex < shared; sharedIndex += 1) {
        sum += (leftRow[sharedIndex] ?? 0) * (right[sharedIndex]?.[colIndex] ?? 0)
      }
      result[rowIndex][colIndex] = sum
    }
  }

  return result
}

function addBiasRows(matrix: number[][], bias: number[]): number[][] {
  return matrix.map((row) => {
    return row.map((value, index) => value + (bias[index] ?? 0))
  })
}

function relu(matrix: number[][]): number[][] {
  return matrix.map((row) => row.map((value) => (value > 0 ? value : 0)))
}

function tanh(matrix: number[][]): number[][] {
  return matrix.map((row) => row.map((value) => Math.tanh(value)))
}

function sigmoid(matrix: number[][]): number[][] {
  return matrix.map((row) => {
    return row.map((value) => {
      if (value >= 0) {
        const expNeg = Math.exp(-value)
        return 1 / (1 + expNeg)
      }
      const expPos = Math.exp(value)
      return expPos / (1 + expPos)
    })
  })
}

function elementwiseMultiply(left: number[][], right: number[][]): number[][] {
  return left.map((row, rowIndex) => {
    return row.map((value, colIndex) => {
      return value * (right[rowIndex]?.[colIndex] ?? 0)
    })
  })
}

function elementwiseAdd(left: number[][], right: number[][]): number[][] {
  return left.map((row, rowIndex) => {
    return row.map((value, colIndex) => {
      return value + (right[rowIndex]?.[colIndex] ?? 0)
    })
  })
}

function elementwiseScale(matrix: number[][], scale: number): number[][] {
  return matrix.map((row) => row.map((value) => value * scale))
}

function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  const result: number[][] = Array.from({ length: cols }, () => {
    return Array.from({ length: rows }, () => 0)
  })

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      result[colIndex][rowIndex] = matrix[rowIndex]?.[colIndex] ?? 0
    }
  }

  return result
}

function softmaxRow(values: number[]): number[] {
  if (values.length === 0) {
    return []
  }

  const maxValue = values.reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY)
  const exps = values.map((value) => Math.exp(value - maxValue))
  const normalizer = exps.reduce((sum, value) => sum + value, 0) || 1
  return exps.map((value) => value / normalizer)
}

function scaledDotProductAttentionCore(options: {
  q: number[][]
  k: number[][]
  v: number[][]
  mask: number[][] | null
}): number[][] {
  const { q, k, v, mask } = options
  const keyWidth = k[0]?.length ?? 1
  const scaling = Math.sqrt(keyWidth)

  const scores = q.map((qRow, rowIndex) => {
    return k.map((kRow, columnIndex) => {
      const maskBias = mask?.[rowIndex]?.[columnIndex] ?? 0
      return dotProduct(qRow, kRow) / scaling + maskBias
    })
  })

  const weights = scores.map((row) => softmaxRow(row))
  const outputWidth = v[0]?.length ?? 0

  return weights.map((weightRow) => {
    return Array.from({ length: outputWidth }, (_, columnIndex) => {
      return weightRow.reduce((valueSum, weight, valueRowIndex) => {
        return valueSum + weight * (v[valueRowIndex]?.[columnIndex] ?? 0)
      }, 0)
    })
  })
}

function layerNormForward(options: {
  x: number[][]
  gamma: number[]
  beta: number[]
  eps?: number
}): number[][] {
  const eps = options.eps ?? 1e-5
  const { x, gamma, beta } = options

  return x.map((row) => {
    const mean = row.length === 0 ? 0 : row.reduce((sum, value) => sum + value, 0) / row.length
    const variance =
      row.length === 0
        ? 0
        : row.reduce((sum, value) => {
            const delta = value - mean
            return sum + delta * delta
          }, 0) / row.length
    const denom = Math.sqrt(variance + eps)

    return row.map((value, index) => {
      const normalized = denom === 0 ? 0 : (value - mean) / denom
      return normalized * (gamma[index] ?? 1) + (beta[index] ?? 0)
    })
  })
}

function sinusoidalPositionTable(options: { seqLen: number; dModel: number }): number[][] {
  const { seqLen, dModel } = options
  const table: number[][] = Array.from({ length: seqLen }, () => {
    return Array.from({ length: dModel }, () => 0)
  })

  for (let pos = 0; pos < seqLen; pos += 1) {
    for (let channel = 0; channel < dModel; channel += 1) {
      const pairIndex = Math.floor(channel / 2)
      const angleRate = Math.pow(10000, (2 * pairIndex) / dModel)
      const angle = pos / angleRate
      table[pos][channel] = channel % 2 === 0 ? Math.sin(angle) : Math.cos(angle)
    }
  }

  return table
}

function ropeRotate(options: {
  x: number[][]
  cos: number[][]
  sin: number[][]
}): number[][] {
  const { x, cos, sin } = options

  return x.map((row, rowIndex) => {
    const output = [...row]
    const pairs = Math.floor(row.length / 2)

    for (let pairIndex = 0; pairIndex < pairs; pairIndex += 1) {
      const leftIndex = pairIndex * 2
      const rightIndex = leftIndex + 1
      const x1 = row[leftIndex] ?? 0
      const x2 = row[rightIndex] ?? 0
      const c = cos[rowIndex]?.[pairIndex] ?? 1
      const s = sin[rowIndex]?.[pairIndex] ?? 0
      output[leftIndex] = x1 * c - x2 * s
      output[rightIndex] = x1 * s + x2 * c
    }

    return output
  })
}

function buildFixture(options: {
  problemId: string
  functionName: string
  inputOrder: string[]
  testCases: Array<Omit<RuntimeProblemTestCase, "expectedOutput"> & { expectedOutput: number[][] }>
}): RuntimeProblemFixture {
  const primary = options.testCases[0]
  if (!primary) {
    throw new Error(`Fixture for ${options.problemId} must include at least one test case.`)
  }

  return {
    problemId: options.problemId,
    deterministicSeed: DETERMINISTIC_SEED,
    functionName: options.functionName,
    inputOrder: options.inputOrder,
    inputs: primary.inputs,
    expectedOutput: primary.expectedOutput,
    testCases: options.testCases
  }
}

function buildFixtures(): RuntimeProblemFixture[] {
  const fixtures: RuntimeProblemFixture[] = []

  fixtures.push(
    buildFixture({
      problemId: "mlp_affine_relu_step_v1",
      functionName: "mlp_affine_relu",
      inputOrder: ["x", "weight", "bias"],
      testCases: [
        {
          id: "case_1_basic_relu",
          name: "Case 1 - Basic ReLU",
          inputs: {
            x: [
              [1, -2, 3],
              [0, 1, -1]
            ],
            weight: [
              [1, 0],
              [0, 1],
              [1, -1]
            ],
            bias: [0.5, -0.5]
          },
          expectedOutput: relu(
            addBiasRows(
              matMul(
                [
                  [1, -2, 3],
                  [0, 1, -1]
                ],
                [
                  [1, 0],
                  [0, 1],
                  [1, -1]
                ]
              ),
              [0.5, -0.5]
            )
          )
        },
        {
          id: "case_2_all_negative_pre_activation",
          name: "Case 2 - All Negative Pre-Activation",
          inputs: {
            x: [
              [-1, -1, -1],
              [-2, -1, 0]
            ],
            weight: [
              [1, 1],
              [1, 1],
              [1, 1]
            ],
            bias: [-10, -10]
          },
          expectedOutput: relu(
            addBiasRows(
              matMul(
                [
                  [-1, -1, -1],
                  [-2, -1, 0]
                ],
                [
                  [1, 1],
                  [1, 1],
                  [1, 1]
                ]
              ),
              [-10, -10]
            )
          )
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "normalization_layernorm_forward_v1",
      functionName: "layer_norm_forward",
      inputOrder: ["x", "gamma", "beta"],
      testCases: [
        {
          id: "case_1_identity_gamma_beta",
          name: "Case 1 - Identity Gamma/Beta",
          inputs: {
            x: [
              [1, 2, 3],
              [2, 2, 2]
            ],
            gamma: [1, 1, 1],
            beta: [0, 0, 0]
          },
          expectedOutput: layerNormForward({
            x: [
              [1, 2, 3],
              [2, 2, 2]
            ],
            gamma: [1, 1, 1],
            beta: [0, 0, 0]
          })
        },
        {
          id: "case_2_nontrivial_affine",
          name: "Case 2 - Nontrivial Gamma/Beta",
          inputs: {
            x: [
              [-1, 0, 1],
              [1, 2, 4]
            ],
            gamma: [1.5, -0.5, 0.25],
            beta: [0.1, 0.2, -0.3]
          },
          expectedOutput: layerNormForward({
            x: [
              [-1, 0, 1],
              [1, 2, 4]
            ],
            gamma: [1.5, -0.5, 0.25],
            beta: [0.1, 0.2, -0.3]
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "rnn_hidden_state_update_v1",
      functionName: "rnn_step",
      inputOrder: ["x_t", "h_prev", "w_xh", "w_hh", "b_h"],
      testCases: [
        {
          id: "case_1_basic_step",
          name: "Case 1 - Basic Step",
          inputs: {
            x_t: [
              [1, 0, -1],
              [0.5, 0.5, 0]
            ],
            h_prev: [
              [0, 1, 0, -1],
              [1, 0, -1, 0]
            ],
            w_xh: [
              [0.2, -0.1, 0.3, 0],
              [0.1, 0.4, -0.2, 0.2],
              [-0.3, 0.2, 0.1, -0.1]
            ],
            w_hh: [
              [0.5, 0, 0, 0],
              [0, 0.5, 0, 0],
              [0, 0, 0.5, 0],
              [0, 0, 0, 0.5]
            ],
            b_h: [0.05, -0.1, 0.0, 0.1]
          },
          expectedOutput: tanh(
            addBiasRows(
              elementwiseAdd(
                matMul(
                  [
                    [1, 0, -1],
                    [0.5, 0.5, 0]
                  ],
                  [
                    [0.2, -0.1, 0.3, 0],
                    [0.1, 0.4, -0.2, 0.2],
                    [-0.3, 0.2, 0.1, -0.1]
                  ]
                ),
                matMul(
                  [
                    [0, 1, 0, -1],
                    [1, 0, -1, 0]
                  ],
                  [
                    [0.5, 0, 0, 0],
                    [0, 0.5, 0, 0],
                    [0, 0, 0.5, 0],
                    [0, 0, 0, 0.5]
                  ]
                )
              ),
              [0.05, -0.1, 0.0, 0.1]
            )
          )
        },
        {
          id: "case_2_zero_hidden",
          name: "Case 2 - Zero Hidden State",
          inputs: {
            x_t: [
              [0, 1, 0],
              [1, 1, 1]
            ],
            h_prev: [
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ],
            w_xh: [
              [0.1, 0.2, 0.3, 0.4],
              [0.0, -0.1, 0.1, 0.0],
              [0.2, 0.0, -0.2, 0.1]
            ],
            w_hh: [
              [0.5, 0, 0, 0],
              [0, 0.5, 0, 0],
              [0, 0, 0.5, 0],
              [0, 0, 0, 0.5]
            ],
            b_h: [0, 0, 0, 0]
          },
          expectedOutput: tanh(
            matMul(
              [
                [0, 1, 0],
                [1, 1, 1]
              ],
              [
                [0.1, 0.2, 0.3, 0.4],
                [0.0, -0.1, 0.1, 0.0],
                [0.2, 0.0, -0.2, 0.1]
              ]
            )
          )
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "attention_scaled_dot_product_v1",
      functionName: "scaled_dot_product_attention",
      inputOrder: ["q", "k", "v", "mask"],
      testCases: [
        {
          id: "case_1_balanced_tokens",
          name: "Case 1 - Balanced Tokens",
          inputs: {
            q: [
              [1, 0],
              [0, 1]
            ],
            k: [
              [1, 0],
              [0, 1]
            ],
            v: [
              [2, 1],
              [0, 3]
            ],
            mask: null
          },
          expectedOutput: scaledDotProductAttentionCore({
            q: [
              [1, 0],
              [0, 1]
            ],
            k: [
              [1, 0],
              [0, 1]
            ],
            v: [
              [2, 1],
              [0, 3]
            ],
            mask: null
          })
        },
        {
          id: "case_2_causal_masking",
          name: "Case 2 - Causal Masking",
          inputs: {
            q: [
              [1, 0],
              [0.5, 0.5],
              [0, 1]
            ],
            k: [
              [1, 0],
              [0.5, 0.5],
              [0, 1]
            ],
            v: [
              [2, 1],
              [1, 2],
              [0, 3]
            ],
            mask: [
              [0, -1000000000, -1000000000],
              [0, 0, -1000000000],
              [0, 0, 0]
            ]
          },
          expectedOutput: scaledDotProductAttentionCore({
            q: [
              [1, 0],
              [0.5, 0.5],
              [0, 1]
            ],
            k: [
              [1, 0],
              [0.5, 0.5],
              [0, 1]
            ],
            v: [
              [2, 1],
              [1, 2],
              [0, 3]
            ],
            mask: [
              [0, -1000000000, -1000000000],
              [0, 0, -1000000000],
              [0, 0, 0]
            ]
          })
        },
        {
          id: "case_3_stability_magnitudes",
          name: "Case 3 - Stability Magnitudes",
          inputs: {
            q: [
              [2, -1],
              [0.2, 0.9],
              [-0.4, 1.3]
            ],
            k: [
              [1, 0.5],
              [-0.3, 1.4],
              [0.8, -0.2]
            ],
            v: [
              [3, -1],
              [0, 2],
              [1, 1.5]
            ],
            mask: null
          },
          expectedOutput: scaledDotProductAttentionCore({
            q: [
              [2, -1],
              [0.2, 0.9],
              [-0.4, 1.3]
            ],
            k: [
              [1, 0.5],
              [-0.3, 1.4],
              [0.8, -0.2]
            ],
            v: [
              [3, -1],
              [0, 2],
              [1, 1.5]
            ],
            mask: null
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "attention_scaled_dot_product_core_v1",
      functionName: "scaled_dot_product_attention",
      inputOrder: ["q", "k", "v", "mask"],
      testCases: [
        {
          id: "case_1_balanced_tokens",
          name: "Case 1 - Balanced Tokens",
          inputs: {
            q: [
              [1, 0],
              [0, 1]
            ],
            k: [
              [1, 0],
              [0, 1]
            ],
            v: [
              [2, 1],
              [0, 3]
            ],
            mask: null
          },
          expectedOutput: scaledDotProductAttentionCore({
            q: [
              [1, 0],
              [0, 1]
            ],
            k: [
              [1, 0],
              [0, 1]
            ],
            v: [
              [2, 1],
              [0, 3]
            ],
            mask: null
          })
        },
        {
          id: "case_2_strict_mask",
          name: "Case 2 - Strict Mask",
          inputs: {
            q: [
              [1, 0],
              [0, 1]
            ],
            k: [
              [1, 0],
              [0, 1]
            ],
            v: [
              [2, 1],
              [0, 3]
            ],
            mask: [
              [0, -1000000000],
              [0, 0]
            ]
          },
          expectedOutput: scaledDotProductAttentionCore({
            q: [
              [1, 0],
              [0, 1]
            ],
            k: [
              [1, 0],
              [0, 1]
            ],
            v: [
              [2, 1],
              [0, 3]
            ],
            mask: [
              [0, -1000000000],
              [0, 0]
            ]
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "conditioning_film_affine_shift_scale_v1",
      functionName: "film_affine",
      inputOrder: ["x", "gamma", "beta"],
      testCases: [
        {
          id: "case_1_identity",
          name: "Case 1 - Identity Gamma, Zero Beta",
          inputs: {
            x: [
              [1, 2, 3, 4],
              [-1, 0, 1, 2]
            ],
            gamma: [
              [1, 1, 1, 1],
              [1, 1, 1, 1]
            ],
            beta: [
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ]
          },
          expectedOutput: [
            [1, 2, 3, 4],
            [-1, 0, 1, 2]
          ]
        },
        {
          id: "case_2_nontrivial_modulation",
          name: "Case 2 - Nontrivial Gamma/Beta",
          inputs: {
            x: [
              [1, -2, 0.5, 3],
              [0, 1, -1, 2]
            ],
            gamma: [
              [2, 0.5, -1, 1],
              [1, 2, 1, 0.25]
            ],
            beta: [
              [0.1, -0.2, 0.3, 0],
              [1, 0, -1, 0.5]
            ]
          },
          expectedOutput: elementwiseAdd(
            elementwiseMultiply(
              [
                [1, -2, 0.5, 3],
                [0, 1, -1, 2]
              ],
              [
                [2, 0.5, -1, 1],
                [1, 2, 1, 0.25]
              ]
            ),
            [
              [0.1, -0.2, 0.3, 0],
              [1, 0, -1, 0.5]
            ]
          )
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "conditioning_gated_feature_modulation_v2",
      functionName: "gated_conditioning",
      inputOrder: ["x", "gate_logits"],
      testCases: [
        {
          id: "case_1_zero_logits",
          name: "Case 1 - Zero Logits (Gate=0.5)",
          inputs: {
            x: [
              [2, -2, 1, 0],
              [1, 1, 1, 1]
            ],
            gate_logits: [
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ]
          },
          expectedOutput: elementwiseMultiply(
            [
              [2, -2, 1, 0],
              [1, 1, 1, 1]
            ],
            sigmoid([
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ])
          )
        },
        {
          id: "case_2_mixed_logits",
          name: "Case 2 - Mixed Logits",
          inputs: {
            x: [
              [1, 2, 3, 4],
              [-1, -2, -3, -4]
            ],
            gate_logits: [
              [-2, 0, 2, 4],
              [4, 2, 0, -2]
            ]
          },
          expectedOutput: elementwiseMultiply(
            [
              [1, 2, 3, 4],
              [-1, -2, -3, -4]
            ],
            sigmoid([
              [-2, 0, 2, 4],
              [4, 2, 0, -2]
            ])
          )
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "adaptation_lora_low_rank_projection_v1",
      functionName: "lora_projection",
      inputOrder: ["x", "base_w", "a", "b", "alpha"],
      testCases: [
        {
          id: "case_1_alpha_zero_matches_base",
          name: "Case 1 - Alpha Zero Matches Base",
          inputs: {
            x: [
              [1, 0, -1],
              [0.5, 0.5, 0]
            ],
            base_w: [
              [1, 0, 0],
              [0, 1, 0],
              [0, 0, 1]
            ],
            a: [
              [0.1, 0.0],
              [0.0, 0.2],
              [0.3, -0.1]
            ],
            b: [
              [0.5, 0, 0.5],
              [0, 0.5, 0.5]
            ],
            alpha: 0
          },
          expectedOutput: matMul(
            [
              [1, 0, -1],
              [0.5, 0.5, 0]
            ],
            [
              [1, 0, 0],
              [0, 1, 0],
              [0, 0, 1]
            ]
          )
        },
        {
          id: "case_2_nonzero_alpha",
          name: "Case 2 - Nonzero Alpha",
          inputs: {
            x: [
              [1, 2, 3],
              [-1, 0, 1]
            ],
            base_w: [
              [0.2, 0, 0.1],
              [0.1, 0.3, 0],
              [-0.2, 0.1, 0.4]
            ],
            a: [
              [0.1, -0.2],
              [0.0, 0.3],
              [0.2, 0.1]
            ],
            b: [
              [0.5, 0, 0.25],
              [0.0, 0.5, -0.25]
            ],
            alpha: 0.75
          },
          expectedOutput: elementwiseAdd(
            matMul(
              [
                [1, 2, 3],
                [-1, 0, 1]
              ],
              [
                [0.2, 0, 0.1],
                [0.1, 0.3, 0],
                [-0.2, 0.1, 0.4]
              ]
            ),
            elementwiseScale(
              matMul(
                matMul(
                  [
                    [1, 2, 3],
                    [-1, 0, 1]
                  ],
                  [
                    [0.1, -0.2],
                    [0.0, 0.3],
                    [0.2, 0.1]
                  ]
                ),
                [
                  [0.5, 0, 0.25],
                  [0.0, 0.5, -0.25]
                ]
              ),
              0.75
            )
          )
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "adaptation_linear_adapter_blend_v2",
      functionName: "linear_adapter_blend",
      inputOrder: ["x", "adapter_w", "blend_scale"],
      testCases: [
        {
          id: "case_1_blend_scale_zero",
          name: "Case 1 - Blend Scale Zero",
          inputs: {
            x: [
              [1, 0, -1, 2],
              [0.5, 0.5, 0, -0.5]
            ],
            adapter_w: [
              [0.2, 0, 0, 0],
              [0, 0.2, 0, 0],
              [0, 0, 0.2, 0],
              [0, 0, 0, 0.2]
            ],
            blend_scale: 0
          },
          expectedOutput: [
            [1, 0, -1, 2],
            [0.5, 0.5, 0, -0.5]
          ]
        },
        {
          id: "case_2_scaled_adapter",
          name: "Case 2 - Scaled Adapter",
          inputs: {
            x: [
              [1, 2, 3, 4],
              [-1, 0, 1, 2]
            ],
            adapter_w: [
              [1, 0, 0, 0],
              [0, 0.5, 0, 0],
              [0, 0, 0.25, 0],
              [0, 0, 0, -1]
            ],
            blend_scale: 0.1
          },
          expectedOutput: elementwiseAdd(
            [
              [1, 2, 3, 4],
              [-1, 0, 1, 2]
            ],
            elementwiseScale(
              matMul(
                [
                  [1, 2, 3, 4],
                  [-1, 0, 1, 2]
                ],
                [
                  [1, 0, 0, 0],
                  [0, 0.5, 0, 0],
                  [0, 0, 0.25, 0],
                  [0, 0, 0, -1]
                ]
              ),
              0.1
            )
          )
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "positional_sinusoidal_encoding_table_v1",
      functionName: "sinusoidal_positions",
      inputOrder: ["seq_len", "d_model"],
      testCases: [
        {
          id: "case_1_seq2_d4",
          name: "Case 1 - seq_len=2, d_model=4",
          inputs: {
            seq_len: 2,
            d_model: 4
          },
          expectedOutput: sinusoidalPositionTable({ seqLen: 2, dModel: 4 })
        },
        {
          id: "case_2_seq3_d6",
          name: "Case 2 - seq_len=3, d_model=6",
          inputs: {
            seq_len: 3,
            d_model: 6
          },
          expectedOutput: sinusoidalPositionTable({ seqLen: 3, dModel: 6 })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "positional_rope_simplified_rotation_v2",
      functionName: "rope_rotate",
      inputOrder: ["x", "cos_cache", "sin_cache"],
      testCases: [
        {
          id: "case_1_identity_rotation",
          name: "Case 1 - Identity Rotation (cos=1, sin=0)",
          inputs: {
            x: [
              [1, 2, 3, 4],
              [-1, 0, 1, 2]
            ],
            cos_cache: [
              [1, 1],
              [1, 1]
            ],
            sin_cache: [
              [0, 0],
              [0, 0]
            ]
          },
          expectedOutput: [
            [1, 2, 3, 4],
            [-1, 0, 1, 2]
          ]
        },
        {
          id: "case_2_mixed_angles",
          name: "Case 2 - Mixed Angles",
          inputs: {
            x: [
              [1, 0, 0, 1],
              [0, 1, 1, 0]
            ],
            cos_cache: [
              [0, 1],
              [Math.SQRT1_2, Math.SQRT1_2]
            ],
            sin_cache: [
              [1, 0],
              [Math.SQRT1_2, -Math.SQRT1_2]
            ]
          },
          expectedOutput: ropeRotate({
            x: [
              [1, 0, 0, 1],
              [0, 1, 1, 0]
            ],
            cos: [
              [0, 1],
              [Math.SQRT1_2, Math.SQRT1_2]
            ],
            sin: [
              [1, 0],
              [Math.SQRT1_2, -Math.SQRT1_2]
            ]
          })
        }
      ]
    })
  )

  return fixtures
}

const FIXTURES = buildFixtures()

export function listRuntimeProblemFixtures(): RuntimeProblemFixture[] {
  return FIXTURES.map((fixture) => ({ ...fixture }))
}

export function getRuntimeProblemFixture(problemId: string): RuntimeProblemFixture | null {
  const fixture = FIXTURES.find((candidate) => candidate.problemId === problemId)
  return fixture ? { ...fixture } : null
}

