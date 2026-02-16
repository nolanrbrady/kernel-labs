export type AttentionRuntimeFixture = {
  problemId: string
  deterministicSeed: number
  functionName: "scaled_dot_product_attention"
  inputs: {
    q: number[][]
    k: number[][]
    v: number[][]
    mask: number[][] | null
  }
  expectedOutput: number[][]
  testCases: Array<{
    id: string
    name: string
    inputs: {
      q: number[][]
      k: number[][]
      v: number[][]
      mask: number[][] | null
    }
    expectedOutput: number[][]
  }>
}

const ATTENTION_PROBLEM_IDS = new Set([
  "attention_scaled_dot_product_v1",
  "attention_scaled_dot_product_core_v1"
])

function dotProduct(left: number[], right: number[]): number {
  const width = Math.min(left.length, right.length)
  let sum = 0

  for (let index = 0; index < width; index += 1) {
    sum += left[index] * right[index]
  }

  return sum
}

function softmaxRow(values: number[]): number[] {
  if (values.length === 0) {
    return []
  }

  const maxValue = values.reduce((max, value) => {
    return Math.max(max, value)
  }, Number.NEGATIVE_INFINITY)
  const exps = values.map((value) => {
    return Math.exp(value - maxValue)
  })
  const normalizer = exps.reduce((sum, value) => {
    return sum + value
  }, 0)

  return exps.map((value) => {
    return value / normalizer
  })
}

function referenceScaledDotProductAttention(options: {
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

  const weights = scores.map((row) => {
    return softmaxRow(row)
  })
  const outputWidth = v[0]?.length ?? 0

  return weights.map((weightRow) => {
    return Array.from({ length: outputWidth }, (_, columnIndex) => {
      return weightRow.reduce((valueSum, weight, valueRowIndex) => {
        return valueSum + weight * (v[valueRowIndex]?.[columnIndex] ?? 0)
      }, 0)
    })
  })
}

export function getRuntimeProblemFixture(
  problemId: string
): AttentionRuntimeFixture | null {
  if (!ATTENTION_PROBLEM_IDS.has(problemId)) {
    return null
  }

  const testCases: AttentionRuntimeFixture["testCases"] = [
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
      expectedOutput: referenceScaledDotProductAttention({
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
      expectedOutput: referenceScaledDotProductAttention({
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
      id: "case_3_batched_stability",
      name: "Case 3 - Batched Stability",
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
      expectedOutput: referenceScaledDotProductAttention({
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

  const primaryTestCase = testCases[0]

  return {
    problemId,
    deterministicSeed: 20260216,
    functionName: "scaled_dot_product_attention",
    inputs: {
      q: primaryTestCase.inputs.q,
      k: primaryTestCase.inputs.k,
      v: primaryTestCase.inputs.v,
      mask: primaryTestCase.inputs.mask
    },
    expectedOutput: primaryTestCase.expectedOutput,
    testCases
  }
}
