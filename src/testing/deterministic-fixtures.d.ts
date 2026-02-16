export type DeterministicFixtureSeeds = {
  evaluator: number
  scheduler: number
}

export type EvaluatorToyFixture = {
  seed: number
  input: number[][]
  weights: number[][]
  bias: number[]
  expectedOutput: number[][]
  metadata: {
    inputShape: [number, number]
    weightShape: [number, number]
    outputShape: [number, number]
  }
}

export type SchedulerAttempt = {
  problemId: string
  correctness: "pass" | "partial" | "fail"
  timeSpentMinutes: number
  hintTierUsed: number
  priorSuccessfulCompletions: number
  daysSinceLastExposure: number
}

export type SchedulerToyFixture = {
  seed: number
  attemptHistory: SchedulerAttempt[]
  expectedScheduling: {
    nextIntervalDays: number
    resurfacingPriority: number
  }
}

export function getDeterministicFixtureSeeds(): DeterministicFixtureSeeds
export function createEvaluatorToyFixture(options?: {
  seed?: number
}): EvaluatorToyFixture
export function createSchedulerToyFixture(options?: {
  seed?: number
}): SchedulerToyFixture
