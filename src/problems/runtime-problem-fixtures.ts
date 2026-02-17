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

function elementwiseOneMinus(matrix: number[][]): number[][] {
  return matrix.map((row) => row.map((value) => 1 - value))
}

function elementwiseAddScalar(matrix: number[][], scalar: number): number[][] {
  return matrix.map((row) => row.map((value) => value + scalar))
}

function scaleRowsByVector(matrix: number[][], vector: number[]): number[][] {
  return matrix.map((row) => {
    return row.map((value, index) => value * (vector[index] ?? 0))
  })
}

function batchNormForwardTrain(options: {
  x: number[][]
  gamma: number[]
  beta: number[]
  eps?: number
}): number[][] {
  const eps = options.eps ?? 1e-5
  const { x, gamma, beta } = options
  const batch = x.length
  const features = x[0]?.length ?? 0

  const means: number[] = Array.from({ length: features }, () => 0)
  for (let feature = 0; feature < features; feature += 1) {
    let sum = 0
    for (let rowIndex = 0; rowIndex < batch; rowIndex += 1) {
      sum += x[rowIndex]?.[feature] ?? 0
    }
    means[feature] = batch === 0 ? 0 : sum / batch
  }

  const variances: number[] = Array.from({ length: features }, () => 0)
  for (let feature = 0; feature < features; feature += 1) {
    const mean = means[feature] ?? 0
    let sumSq = 0
    for (let rowIndex = 0; rowIndex < batch; rowIndex += 1) {
      const delta = (x[rowIndex]?.[feature] ?? 0) - mean
      sumSq += delta * delta
    }
    variances[feature] = batch === 0 ? 0 : sumSq / batch
  }

  const normalized = x.map((row) => {
    return row.map((value, feature) => {
      const denom = Math.sqrt((variances[feature] ?? 0) + eps)
      return denom === 0 ? 0 : (value - (means[feature] ?? 0)) / denom
    })
  })

  return addBiasRows(scaleRowsByVector(normalized, gamma), beta)
}

function rmsNormForward(options: {
  x: number[][]
  gamma: number[]
  eps?: number
}): number[][] {
  const eps = options.eps ?? 1e-8
  const { x, gamma } = options

  return x.map((row) => {
    const meanSq =
      row.length === 0
        ? 0
        : row.reduce((sum, value) => sum + value * value, 0) / row.length
    const denom = Math.sqrt(meanSq + eps)
    return row.map((value, index) => {
      const normalized = denom === 0 ? 0 : value / denom
      return normalized * (gamma[index] ?? 0)
    })
  })
}

function geluTanh(matrix: number[][]): number[][] {
  const c = Math.sqrt(2 / Math.PI)
  const cubicCoeff = 0.044715

  return matrix.map((row) => {
    return row.map((value) => {
      const inner = c * (value + cubicCoeff * value * value * value)
      return 0.5 * value * (1 + Math.tanh(inner))
    })
  })
}

function maskedSoftmax(options: { scores: number[][]; mask: number[][] | null }): number[][] {
  const { scores, mask } = options

  return scores.map((row, rowIndex) => {
    const maskedRow = row.map((value, columnIndex) => {
      const maskBias = mask?.[rowIndex]?.[columnIndex] ?? 0
      return value + maskBias
    })
    return softmaxRow(maskedRow)
  })
}

function causalMask(options: { seqLen: number; maskedValue: number }): number[][] {
  const mask: number[][] = Array.from({ length: options.seqLen }, () => {
    return Array.from({ length: options.seqLen }, () => 0)
  })

  for (let rowIndex = 0; rowIndex < options.seqLen; rowIndex += 1) {
    for (let columnIndex = rowIndex + 1; columnIndex < options.seqLen; columnIndex += 1) {
      mask[rowIndex][columnIndex] = options.maskedValue
    }
  }

  return mask
}

function splitHeadsFlat(options: { x: number[][]; numHeads: number }): number[][] {
  const { x, numHeads } = options
  const seqLen = x.length
  const dModel = x[0]?.length ?? 0
  const headDim = numHeads === 0 ? 0 : Math.floor(dModel / numHeads)

  const out: number[][] = []
  for (let tokenIndex = 0; tokenIndex < seqLen; tokenIndex += 1) {
    const row = x[tokenIndex] ?? []
    for (let headIndex = 0; headIndex < numHeads; headIndex += 1) {
      const start = headIndex * headDim
      out.push(row.slice(start, start + headDim))
    }
  }
  return out
}

function gruStep(options: {
  x_t: number[][]
  h_prev: number[][]
  w_xz: number[][]
  w_hz: number[][]
  b_z: number[]
  w_xr: number[][]
  w_hr: number[][]
  b_r: number[]
  w_xn: number[][]
  w_hn: number[][]
  b_n: number[]
}): number[][] {
  const z = sigmoid(
    addBiasRows(
      elementwiseAdd(matMul(options.x_t, options.w_xz), matMul(options.h_prev, options.w_hz)),
      options.b_z
    )
  )
  const r = sigmoid(
    addBiasRows(
      elementwiseAdd(matMul(options.x_t, options.w_xr), matMul(options.h_prev, options.w_hr)),
      options.b_r
    )
  )
  const resetHidden = elementwiseMultiply(r, options.h_prev)
  const n = tanh(
    addBiasRows(
      elementwiseAdd(matMul(options.x_t, options.w_xn), matMul(resetHidden, options.w_hn)),
      options.b_n
    )
  )

  return elementwiseAdd(
    elementwiseMultiply(elementwiseOneMinus(z), n),
    elementwiseMultiply(z, options.h_prev)
  )
}

function mergeLoraWeights(options: {
  baseW: number[][]
  a: number[][]
  b: number[][]
  alpha: number
}): number[][] {
  return elementwiseAdd(options.baseW, elementwiseScale(matMul(options.a, options.b), options.alpha))
}

function layerNormPlain(options: { x: number[][]; eps?: number }): number[][] {
  const eps = options.eps ?? 1e-5
  const { x } = options

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

    return row.map((value) => {
      return denom === 0 ? 0 : (value - mean) / denom
    })
  })
}

function adaLayerNorm(options: {
  x: number[][]
  scale: number[][]
  shift: number[][]
  eps?: number
}): number[][] {
  const xHat = layerNormPlain({ x: options.x, eps: options.eps })
  const scalePlusOne = elementwiseAddScalar(options.scale, 1)
  return elementwiseAdd(elementwiseMultiply(xHat, scalePlusOne), options.shift)
}

function moeMlpTop1(options: {
  x: number[][]
  gateLogits: number[][]
  w0: number[][]
  b0: number[]
  w1: number[][]
  b1: number[]
}): number[][] {
  const expert0 = relu(addBiasRows(matMul(options.x, options.w0), options.b0))
  const expert1 = relu(addBiasRows(matMul(options.x, options.w1), options.b1))

  return options.x.map((_, tokenIndex) => {
    const logits = options.gateLogits[tokenIndex] ?? []
    const logit0 = logits[0] ?? Number.NEGATIVE_INFINITY
    const logit1 = logits[1] ?? Number.NEGATIVE_INFINITY
    const expertIndex = logit1 > logit0 ? 1 : 0
    return expertIndex === 0
      ? [...(expert0[tokenIndex] ?? [])]
      : [...(expert1[tokenIndex] ?? [])]
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

  fixtures.push(
    buildFixture({
      problemId: "normalization_batchnorm_forward_train_v1",
      functionName: "batch_norm_forward_train",
      inputOrder: ["x", "gamma", "beta"],
      testCases: [
        {
          id: "case_1_identity_gamma_beta",
          name: "Case 1 - Identity Gamma/Beta",
          inputs: {
            x: [
              [1, 2, 3, 4],
              [2, 3, 4, 5],
              [0, 1, 2, 3]
            ],
            gamma: [1, 1, 1, 1],
            beta: [0, 0, 0, 0]
          },
          expectedOutput: batchNormForwardTrain({
            x: [
              [1, 2, 3, 4],
              [2, 3, 4, 5],
              [0, 1, 2, 3]
            ],
            gamma: [1, 1, 1, 1],
            beta: [0, 0, 0, 0]
          })
        },
        {
          id: "case_2_zero_variance_columns",
          name: "Case 2 - Zero Variance Columns",
          inputs: {
            x: [
              [1, 1, 1, 1],
              [1, 2, 1, 2],
              [1, 3, 1, 3]
            ],
            gamma: [0.5, -1, 2, 0.25],
            beta: [0.1, 0.2, -0.3, 0.4]
          },
          expectedOutput: batchNormForwardTrain({
            x: [
              [1, 1, 1, 1],
              [1, 2, 1, 2],
              [1, 3, 1, 3]
            ],
            gamma: [0.5, -1, 2, 0.25],
            beta: [0.1, 0.2, -0.3, 0.4]
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "normalization_rmsnorm_forward_v1",
      functionName: "rms_norm_forward",
      inputOrder: ["x", "gamma"],
      testCases: [
        {
          id: "case_1_identity_gamma",
          name: "Case 1 - Identity Gamma",
          inputs: {
            x: [
              [1, 2, 0, -2],
              [0, 0, 0, 0]
            ],
            gamma: [1, 1, 1, 1]
          },
          expectedOutput: rmsNormForward({
            x: [
              [1, 2, 0, -2],
              [0, 0, 0, 0]
            ],
            gamma: [1, 1, 1, 1]
          })
        },
        {
          id: "case_2_nontrivial_gamma",
          name: "Case 2 - Nontrivial Gamma",
          inputs: {
            x: [
              [-1, 1, 2, -2],
              [3, 0, -3, 0.5]
            ],
            gamma: [1.5, 0.5, -1, 2]
          },
          expectedOutput: rmsNormForward({
            x: [
              [-1, 1, 2, -2],
              [3, 0, -3, 0.5]
            ],
            gamma: [1.5, 0.5, -1, 2]
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "mlp_gelu_tanh_approx_v1",
      functionName: "gelu_tanh",
      inputOrder: ["x"],
      testCases: [
        {
          id: "case_1_small_values",
          name: "Case 1 - Small Values",
          inputs: {
            x: [
              [-1, 0, 1, 2],
              [0.5, -0.5, 3, -2]
            ]
          },
          expectedOutput: geluTanh([
            [-1, 0, 1, 2],
            [0.5, -0.5, 3, -2]
          ])
        },
        {
          id: "case_2_large_magnitudes",
          name: "Case 2 - Large Magnitudes",
          inputs: {
            x: [
              [-5, -2, 2, 5],
              [4, -4, 1, -1]
            ]
          },
          expectedOutput: geluTanh([
            [-5, -2, 2, 5],
            [4, -4, 1, -1]
          ])
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "mlp_swiglu_block_v1",
      functionName: "swiglu_block",
      inputOrder: ["x", "w_gate", "b_gate", "w_up", "b_up"],
      testCases: [
        {
          id: "case_1_basic_gate",
          name: "Case 1 - Basic Gate",
          inputs: {
            x: [
              [1, 0, -1],
              [0.5, 0.5, 0]
            ],
            w_gate: [
              [0.2, -0.1, 0.0, 0.3],
              [0.1, 0.4, -0.2, 0.0],
              [-0.3, 0.2, 0.1, -0.1]
            ],
            b_gate: [0.05, -0.1, 0.0, 0.1],
            w_up: [
              [0.1, 0.0, -0.2, 0.3],
              [0.0, 0.2, 0.1, 0.0],
              [0.2, -0.1, 0.0, 0.1]
            ],
            b_up: [0.0, 0.1, -0.05, 0.0]
          },
          expectedOutput: elementwiseMultiply(
            elementwiseMultiply(
              addBiasRows(
                matMul(
                  [
                    [1, 0, -1],
                    [0.5, 0.5, 0]
                  ],
                  [
                    [0.2, -0.1, 0.0, 0.3],
                    [0.1, 0.4, -0.2, 0.0],
                    [-0.3, 0.2, 0.1, -0.1]
                  ]
                ),
                [0.05, -0.1, 0.0, 0.1]
              ),
              sigmoid(
                addBiasRows(
                  matMul(
                    [
                      [1, 0, -1],
                      [0.5, 0.5, 0]
                    ],
                    [
                      [0.2, -0.1, 0.0, 0.3],
                      [0.1, 0.4, -0.2, 0.0],
                      [-0.3, 0.2, 0.1, -0.1]
                    ]
                  ),
                  [0.05, -0.1, 0.0, 0.1]
                )
              )
            ),
            addBiasRows(
              matMul(
                [
                  [1, 0, -1],
                  [0.5, 0.5, 0]
                ],
                [
                  [0.1, 0.0, -0.2, 0.3],
                  [0.0, 0.2, 0.1, 0.0],
                  [0.2, -0.1, 0.0, 0.1]
                ]
              ),
              [0.0, 0.1, -0.05, 0.0]
            )
          )
        },
        {
          id: "case_2_nontrivial_bias",
          name: "Case 2 - Nontrivial Bias",
          inputs: {
            x: [
              [0, 1, 2],
              [-1, 0, 1]
            ],
            w_gate: [
              [0.1, 0.2, -0.1, 0.0],
              [0.0, -0.2, 0.3, 0.1],
              [0.2, 0.0, 0.1, -0.3]
            ],
            b_gate: [0.2, 0.0, -0.1, 0.05],
            w_up: [
              [0.3, 0.0, 0.1, -0.2],
              [0.0, 0.1, 0.0, 0.2],
              [-0.1, 0.2, 0.3, 0.0]
            ],
            b_up: [-0.05, 0.0, 0.1, 0.2]
          },
          expectedOutput: elementwiseMultiply(
            elementwiseMultiply(
              addBiasRows(
                matMul(
                  [
                    [0, 1, 2],
                    [-1, 0, 1]
                  ],
                  [
                    [0.1, 0.2, -0.1, 0.0],
                    [0.0, -0.2, 0.3, 0.1],
                    [0.2, 0.0, 0.1, -0.3]
                  ]
                ),
                [0.2, 0.0, -0.1, 0.05]
              ),
              sigmoid(
                addBiasRows(
                  matMul(
                    [
                      [0, 1, 2],
                      [-1, 0, 1]
                    ],
                    [
                      [0.1, 0.2, -0.1, 0.0],
                      [0.0, -0.2, 0.3, 0.1],
                      [0.2, 0.0, 0.1, -0.3]
                    ]
                  ),
                  [0.2, 0.0, -0.1, 0.05]
                )
              )
            ),
            addBiasRows(
              matMul(
                [
                  [0, 1, 2],
                  [-1, 0, 1]
                ],
                [
                  [0.3, 0.0, 0.1, -0.2],
                  [0.0, 0.1, 0.0, 0.2],
                  [-0.1, 0.2, 0.3, 0.0]
                ]
              ),
              [-0.05, 0.0, 0.1, 0.2]
            )
          )
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "mlp_moe_top1_routed_relu_v1",
      functionName: "moe_mlp_top1",
      inputOrder: ["x", "gate_logits", "w0", "b0", "w1", "b1"],
      testCases: [
        {
          id: "case_1_mixed_routes_with_tie",
          name: "Case 1 - Mixed Routes With Tie",
          inputs: {
            x: [
              [1, -1],
              [0, 2],
              [-1, 1]
            ],
            gate_logits: [
              [2, 0],
              [0, 3],
              [1, 1]
            ],
            w0: [
              [1, 0, -1],
              [0.5, 1, 0]
            ],
            b0: [0.1, -0.2, 0.0],
            w1: [
              [0.2, 0.5, 0.0],
              [-0.3, 0.0, 1.0]
            ],
            b1: [0.0, 0.2, -0.1]
          },
          expectedOutput: moeMlpTop1({
            x: [
              [1, -1],
              [0, 2],
              [-1, 1]
            ],
            gateLogits: [
              [2, 0],
              [0, 3],
              [1, 1]
            ],
            w0: [
              [1, 0, -1],
              [0.5, 1, 0]
            ],
            b0: [0.1, -0.2, 0.0],
            w1: [
              [0.2, 0.5, 0.0],
              [-0.3, 0.0, 1.0]
            ],
            b1: [0.0, 0.2, -0.1]
          })
        },
        {
          id: "case_2_all_expert_one",
          name: "Case 2 - All Expert One",
          inputs: {
            x: [
              [2, 0],
              [-1, -1],
              [0.5, 1.5]
            ],
            gate_logits: [
              [0, 1],
              [-2, 0],
              [1, 2]
            ],
            w0: [
              [1, 0, -1],
              [0.5, 1, 0]
            ],
            b0: [0.1, -0.2, 0.0],
            w1: [
              [0.2, 0.5, 0.0],
              [-0.3, 0.0, 1.0]
            ],
            b1: [0.0, 0.2, -0.1]
          },
          expectedOutput: moeMlpTop1({
            x: [
              [2, 0],
              [-1, -1],
              [0.5, 1.5]
            ],
            gateLogits: [
              [0, 1],
              [-2, 0],
              [1, 2]
            ],
            w0: [
              [1, 0, -1],
              [0.5, 1, 0]
            ],
            b0: [0.1, -0.2, 0.0],
            w1: [
              [0.2, 0.5, 0.0],
              [-0.3, 0.0, 1.0]
            ],
            b1: [0.0, 0.2, -0.1]
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "attention_causal_mask_additive_v1",
      functionName: "causal_mask",
      inputOrder: ["seq_len", "masked_value"],
      testCases: [
        {
          id: "case_1_default_scale",
          name: "Case 1 - Masked Value -1e9",
          inputs: {
            seq_len: 3,
            masked_value: -1000000000
          },
          expectedOutput: causalMask({ seqLen: 3, maskedValue: -1000000000 })
        },
        {
          id: "case_2_smaller_negative",
          name: "Case 2 - Masked Value -1000",
          inputs: {
            seq_len: 3,
            masked_value: -1000
          },
          expectedOutput: causalMask({ seqLen: 3, maskedValue: -1000 })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "attention_masked_softmax_v1",
      functionName: "masked_softmax",
      inputOrder: ["scores", "mask"],
      testCases: [
        {
          id: "case_1_no_mask",
          name: "Case 1 - No Mask",
          inputs: {
            scores: [
              [1, 0, -1],
              [0.5, 0.5, 0],
              [-2, 1, 3]
            ],
            mask: null
          },
          expectedOutput: maskedSoftmax({
            scores: [
              [1, 0, -1],
              [0.5, 0.5, 0],
              [-2, 1, 3]
            ],
            mask: null
          })
        },
        {
          id: "case_2_causal_mask",
          name: "Case 2 - Causal Mask",
          inputs: {
            scores: [
              [1, 0, -1],
              [0.5, 0.5, 0],
              [-2, 1, 3]
            ],
            mask: [
              [0, -1000000000, -1000000000],
              [0, 0, -1000000000],
              [0, 0, 0]
            ]
          },
          expectedOutput: maskedSoftmax({
            scores: [
              [1, 0, -1],
              [0.5, 0.5, 0],
              [-2, 1, 3]
            ],
            mask: [
              [0, -1000000000, -1000000000],
              [0, 0, -1000000000],
              [0, 0, 0]
            ]
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "attention_split_heads_flat_v1",
      functionName: "split_heads_flat",
      inputOrder: ["x", "num_heads"],
      testCases: [
        {
          id: "case_1_seq2_heads2",
          name: "Case 1 - Seq2 Heads2",
          inputs: {
            x: [
              [1, 2, 3, 4],
              [5, 6, 7, 8]
            ],
            num_heads: 2
          },
          expectedOutput: splitHeadsFlat({
            x: [
              [1, 2, 3, 4],
              [5, 6, 7, 8]
            ],
            numHeads: 2
          })
        },
        {
          id: "case_2_mixed_values",
          name: "Case 2 - Mixed Values",
          inputs: {
            x: [
              [0.1, -0.2, 0.3, -0.4],
              [-1, 0, 1, 2]
            ],
            num_heads: 2
          },
          expectedOutput: splitHeadsFlat({
            x: [
              [0.1, -0.2, 0.3, -0.4],
              [-1, 0, 1, 2]
            ],
            numHeads: 2
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "rnn_gru_step_v1",
      functionName: "gru_step",
      inputOrder: [
        "x_t",
        "h_prev",
        "w_xz",
        "w_hz",
        "b_z",
        "w_xr",
        "w_hr",
        "b_r",
        "w_xn",
        "w_hn",
        "b_n"
      ],
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
            w_xz: [
              [0.1, -0.2, 0.0, 0.2],
              [0.0, 0.1, -0.1, 0.0],
              [-0.2, 0.0, 0.1, -0.1]
            ],
            w_hz: [
              [0.3, 0.0, 0.0, 0.0],
              [0.0, 0.3, 0.0, 0.0],
              [0.0, 0.0, 0.3, 0.0],
              [0.0, 0.0, 0.0, 0.3]
            ],
            b_z: [0.05, -0.05, 0.0, 0.1],
            w_xr: [
              [0.0, 0.1, 0.2, -0.1],
              [0.1, 0.0, -0.1, 0.2],
              [-0.1, 0.2, 0.0, 0.1]
            ],
            w_hr: [
              [0.25, 0.0, 0.0, 0.0],
              [0.0, 0.25, 0.0, 0.0],
              [0.0, 0.0, 0.25, 0.0],
              [0.0, 0.0, 0.0, 0.25]
            ],
            b_r: [0.0, 0.1, -0.05, 0.0],
            w_xn: [
              [0.2, 0.0, -0.1, 0.1],
              [0.0, 0.2, 0.1, 0.0],
              [-0.2, 0.1, 0.0, 0.2]
            ],
            w_hn: [
              [0.4, 0.0, 0.0, 0.0],
              [0.0, 0.4, 0.0, 0.0],
              [0.0, 0.0, 0.4, 0.0],
              [0.0, 0.0, 0.0, 0.4]
            ],
            b_n: [0.0, -0.1, 0.05, 0.0]
          },
          expectedOutput: gruStep({
            x_t: [
              [1, 0, -1],
              [0.5, 0.5, 0]
            ],
            h_prev: [
              [0, 1, 0, -1],
              [1, 0, -1, 0]
            ],
            w_xz: [
              [0.1, -0.2, 0.0, 0.2],
              [0.0, 0.1, -0.1, 0.0],
              [-0.2, 0.0, 0.1, -0.1]
            ],
            w_hz: [
              [0.3, 0.0, 0.0, 0.0],
              [0.0, 0.3, 0.0, 0.0],
              [0.0, 0.0, 0.3, 0.0],
              [0.0, 0.0, 0.0, 0.3]
            ],
            b_z: [0.05, -0.05, 0.0, 0.1],
            w_xr: [
              [0.0, 0.1, 0.2, -0.1],
              [0.1, 0.0, -0.1, 0.2],
              [-0.1, 0.2, 0.0, 0.1]
            ],
            w_hr: [
              [0.25, 0.0, 0.0, 0.0],
              [0.0, 0.25, 0.0, 0.0],
              [0.0, 0.0, 0.25, 0.0],
              [0.0, 0.0, 0.0, 0.25]
            ],
            b_r: [0.0, 0.1, -0.05, 0.0],
            w_xn: [
              [0.2, 0.0, -0.1, 0.1],
              [0.0, 0.2, 0.1, 0.0],
              [-0.2, 0.1, 0.0, 0.2]
            ],
            w_hn: [
              [0.4, 0.0, 0.0, 0.0],
              [0.0, 0.4, 0.0, 0.0],
              [0.0, 0.0, 0.4, 0.0],
              [0.0, 0.0, 0.0, 0.4]
            ],
            b_n: [0.0, -0.1, 0.05, 0.0]
          })
        },
        {
          id: "case_2_high_update_gate_bias",
          name: "Case 2 - High Update Gate Bias",
          inputs: {
            x_t: [
              [0, 1, 0],
              [1, 1, 1]
            ],
            h_prev: [
              [0.2, -0.2, 0.4, -0.4],
              [1.0, 0.0, -1.0, 0.5]
            ],
            w_xz: [
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0]
            ],
            w_hz: [
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0]
            ],
            b_z: [5, 5, 5, 5],
            w_xr: [
              [0.1, 0.0, 0.0, 0.0],
              [0.0, 0.1, 0.0, 0.0],
              [0.0, 0.0, 0.1, 0.0]
            ],
            w_hr: [
              [0.1, 0.0, 0.0, 0.0],
              [0.0, 0.1, 0.0, 0.0],
              [0.0, 0.0, 0.1, 0.0],
              [0.0, 0.0, 0.0, 0.1]
            ],
            b_r: [0.0, 0.0, 0.0, 0.0],
            w_xn: [
              [0.2, 0.0, 0.0, 0.0],
              [0.0, 0.2, 0.0, 0.0],
              [0.0, 0.0, 0.2, 0.0]
            ],
            w_hn: [
              [0.2, 0.0, 0.0, 0.0],
              [0.0, 0.2, 0.0, 0.0],
              [0.0, 0.0, 0.2, 0.0],
              [0.0, 0.0, 0.0, 0.2]
            ],
            b_n: [0.0, 0.0, 0.0, 0.0]
          },
          expectedOutput: gruStep({
            x_t: [
              [0, 1, 0],
              [1, 1, 1]
            ],
            h_prev: [
              [0.2, -0.2, 0.4, -0.4],
              [1.0, 0.0, -1.0, 0.5]
            ],
            w_xz: [
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0]
            ],
            w_hz: [
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0],
              [0.0, 0.0, 0.0, 0.0]
            ],
            b_z: [5, 5, 5, 5],
            w_xr: [
              [0.1, 0.0, 0.0, 0.0],
              [0.0, 0.1, 0.0, 0.0],
              [0.0, 0.0, 0.1, 0.0]
            ],
            w_hr: [
              [0.1, 0.0, 0.0, 0.0],
              [0.0, 0.1, 0.0, 0.0],
              [0.0, 0.0, 0.1, 0.0],
              [0.0, 0.0, 0.0, 0.1]
            ],
            b_r: [0.0, 0.0, 0.0, 0.0],
            w_xn: [
              [0.2, 0.0, 0.0, 0.0],
              [0.0, 0.2, 0.0, 0.0],
              [0.0, 0.0, 0.2, 0.0]
            ],
            w_hn: [
              [0.2, 0.0, 0.0, 0.0],
              [0.0, 0.2, 0.0, 0.0],
              [0.0, 0.0, 0.2, 0.0],
              [0.0, 0.0, 0.0, 0.2]
            ],
            b_n: [0.0, 0.0, 0.0, 0.0]
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "adaptation_lora_merge_weights_v1",
      functionName: "merge_lora_weights",
      inputOrder: ["base_w", "a", "b", "alpha"],
      testCases: [
        {
          id: "case_1_alpha_zero_matches_base",
          name: "Case 1 - Alpha Zero Matches Base",
          inputs: {
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
          expectedOutput: mergeLoraWeights({
            baseW: [
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
          })
        },
        {
          id: "case_2_nonzero_alpha",
          name: "Case 2 - Nonzero Alpha",
          inputs: {
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
          expectedOutput: mergeLoraWeights({
            baseW: [
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
          })
        }
      ]
    })
  )

  fixtures.push(
    buildFixture({
      problemId: "conditioning_adaln_modulation_v1",
      functionName: "adaln",
      inputOrder: ["x", "scale", "shift"],
      testCases: [
        {
          id: "case_1_zero_modulation_matches_ln",
          name: "Case 1 - Zero Modulation Matches LayerNorm",
          inputs: {
            x: [
              [1, 2, 3, 4],
              [2, 2, 2, 2]
            ],
            scale: [
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ],
            shift: [
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ]
          },
          expectedOutput: adaLayerNorm({
            x: [
              [1, 2, 3, 4],
              [2, 2, 2, 2]
            ],
            scale: [
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ],
            shift: [
              [0, 0, 0, 0],
              [0, 0, 0, 0]
            ]
          })
        },
        {
          id: "case_2_nontrivial_modulation",
          name: "Case 2 - Nontrivial Modulation",
          inputs: {
            x: [
              [-1, 0, 1, 2],
              [1, 2, 4, 8]
            ],
            scale: [
              [0.1, -0.2, 0.0, 0.5],
              [0.0, 0.25, -0.1, 0.0]
            ],
            shift: [
              [0.0, 0.1, -0.1, 0.0],
              [0.2, 0.0, 0.0, -0.2]
            ]
          },
          expectedOutput: adaLayerNorm({
            x: [
              [-1, 0, 1, 2],
              [1, 2, 4, 8]
            ],
            scale: [
              [0.1, -0.2, 0.0, 0.5],
              [0.0, 0.25, -0.1, 0.0]
            ],
            shift: [
              [0.0, 0.1, -0.1, 0.0],
              [0.2, 0.0, 0.0, -0.2]
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
