const DETERMINISTIC_FIXTURE_SEEDS = Object.freeze({
  evaluator: 2026021601,
  scheduler: 2026021607
})

function createSeededRandom(seed) {
  let state = seed >>> 0

  if (state === 0) {
    state = 1
  }

  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function roundToSixDecimals(value) {
  return Number(value.toFixed(6))
}

function createToyMatrix(rows, columns, random) {
  const matrix = []

  for (let row = 0; row < rows; row += 1) {
    const values = []

    for (let column = 0; column < columns; column += 1) {
      const sampledValue = random() * 2 - 1
      values.push(roundToSixDecimals(sampledValue))
    }

    matrix.push(values)
  }

  return matrix
}

function createToyVector(length, random) {
  const vector = []

  for (let index = 0; index < length; index += 1) {
    const sampledValue = random() * 0.5 - 0.25
    vector.push(roundToSixDecimals(sampledValue))
  }

  return vector
}

function multiplyAndAddBias(input, weights, bias) {
  const output = []

  for (let row = 0; row < input.length; row += 1) {
    const outputRow = []

    for (let column = 0; column < weights[0].length; column += 1) {
      let accumulator = 0

      for (let k = 0; k < weights.length; k += 1) {
        accumulator += input[row][k] * weights[k][column]
      }

      outputRow.push(roundToSixDecimals(accumulator + bias[column]))
    }

    output.push(outputRow)
  }

  return output
}

function deriveExpectedScheduling(attemptHistory) {
  const correctnessWeights = {
    pass: 0,
    partial: 1,
    fail: 2
  }

  const totals = attemptHistory.reduce(
    (accumulator, attempt) => {
      return {
        correctness:
          accumulator.correctness + correctnessWeights[attempt.correctness],
        hintTier: accumulator.hintTier + attempt.hintTierUsed,
        recency: accumulator.recency + attempt.daysSinceLastExposure,
        duration: accumulator.duration + attempt.timeSpentMinutes
      }
    },
    {
      correctness: 0,
      hintTier: 0,
      recency: 0,
      duration: 0
    }
  )

  const attemptCount = attemptHistory.length
  const averageCorrectness = totals.correctness / attemptCount
  const averageHintTier = totals.hintTier / attemptCount
  const averageRecency = totals.recency / attemptCount
  const averageDuration = totals.duration / attemptCount

  const nextIntervalDays = Math.max(
    1,
    Math.round(
      7 - averageCorrectness * 2 - averageHintTier * 0.6 + averageRecency * 0.15
    )
  )

  const resurfacingPriority = roundToSixDecimals(
    Math.min(
      1,
      0.15 +
        averageCorrectness * 0.22 +
        averageHintTier * 0.09 +
        averageDuration * 0.005 +
        averageRecency * 0.012
    )
  )

  return {
    nextIntervalDays,
    resurfacingPriority
  }
}

export function getDeterministicFixtureSeeds() {
  return DETERMINISTIC_FIXTURE_SEEDS
}

export function createEvaluatorToyFixture(options = {}) {
  const seed = options.seed ?? DETERMINISTIC_FIXTURE_SEEDS.evaluator
  const random = createSeededRandom(seed)
  const input = createToyMatrix(2, 3, random)
  const weights = createToyMatrix(3, 2, random)
  const bias = createToyVector(2, random)
  const expectedOutput = multiplyAndAddBias(input, weights, bias)

  return {
    seed,
    input,
    weights,
    bias,
    expectedOutput,
    metadata: {
      inputShape: [2, 3],
      weightShape: [3, 2],
      outputShape: [2, 2]
    }
  }
}

export function createSchedulerToyFixture(options = {}) {
  const seed = options.seed ?? DETERMINISTIC_FIXTURE_SEEDS.scheduler
  const random = createSeededRandom(seed)
  const correctnessBands = ["pass", "partial", "fail"]
  const problemIds = [
    "attention_scaled_dot_product_v1",
    "rnn_gru_step_v1",
    "normalization_layernorm_v1"
  ]

  const attemptHistory = problemIds.map((problemId) => {
    const correctnessIndex = Math.floor(random() * correctnessBands.length)

    return {
      problemId,
      correctness: correctnessBands[correctnessIndex],
      timeSpentMinutes: 8 + Math.floor(random() * 12),
      hintTierUsed: 1 + Math.floor(random() * 3),
      priorSuccessfulCompletions: Math.floor(random() * 4),
      daysSinceLastExposure: 1 + Math.floor(random() * 11)
    }
  })

  return {
    seed,
    attemptHistory,
    expectedScheduling: deriveExpectedScheduling(attemptHistory)
  }
}
