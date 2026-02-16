export type SchedulerCorrectness = "pass" | "partial" | "fail"

export type SchedulerDecisionInput = {
  correctness: SchedulerCorrectness
  timeSpentMinutes: number
  hintTierUsed: number
  priorSuccessfulCompletions: number
  daysSinceLastExposure: number
}

export type SchedulerDecision = {
  nextIntervalDays: number
  resurfacingPriority: number
}

export type ResurfacedCandidate = {
  problemId: string
  resurfacingPriority: number
}

export type RankedSessionCandidates = {
  primaryProblemId: string | null
  prioritizedNewProblem: boolean
  resurfacingDebtCount: 0
  rankedResurfacedProblemIds: string[]
}

export type SessionAssignmentPlan = {
  primaryProblemId: string | null
  assignedProblemIds: string[]
  resurfacedAssignedCount: 0 | 1
  deferredResurfacedProblemIds: string[]
}

const CORRECTNESS_INTERVAL_BASE: Record<SchedulerCorrectness, number> = {
  pass: 7,
  partial: 4,
  fail: 2
}

const CORRECTNESS_PRIORITY_BASE: Record<SchedulerCorrectness, number> = {
  pass: 0.2,
  partial: 0.55,
  fail: 0.8
}

function clamp(minimum: number, value: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function calculateSpacedRepetitionSchedule(
  input: SchedulerDecisionInput
): SchedulerDecision {
  const baseInterval = CORRECTNESS_INTERVAL_BASE[input.correctness]
  const hintPenalty = Math.max(0, input.hintTierUsed - 1)
  const durationPenalty = input.timeSpentMinutes > 20 ? 1 : 0
  const successBonus = Math.min(input.priorSuccessfulCompletions, 5)
  const recencyBonus = input.daysSinceLastExposure / 7

  const nextIntervalDays = Math.max(
    1,
    Math.round(baseInterval + recencyBonus + successBonus - hintPenalty - durationPenalty)
  )

  const resurfacingPriority = clamp(
    0,
    Number(
      (
        CORRECTNESS_PRIORITY_BASE[input.correctness] +
        Math.min(input.hintTierUsed, 3) * 0.06 +
        Math.min(input.timeSpentMinutes / 30, 1) * 0.08 +
        Math.min(input.daysSinceLastExposure / 14, 1) * 0.1 -
        Math.min(input.priorSuccessfulCompletions, 5) * 0.05
      ).toFixed(6)
    ),
    1
  )

  return {
    nextIntervalDays,
    resurfacingPriority
  }
}

export function rankSessionCandidates(options: {
  newProblemIds: string[]
  resurfacedCandidates: ResurfacedCandidate[]
}): RankedSessionCandidates {
  const rankedResurfacedProblemIds = [...options.resurfacedCandidates]
    .sort((first, second) => {
      return second.resurfacingPriority - first.resurfacingPriority
    })
    .map((candidate) => candidate.problemId)

  const prioritizedNewProblem = options.newProblemIds.length > 0
  const primaryProblemId = prioritizedNewProblem
    ? options.newProblemIds[0] ?? null
    : rankedResurfacedProblemIds[0] ?? null

  return {
    primaryProblemId,
    prioritizedNewProblem,
    resurfacingDebtCount: 0,
    rankedResurfacedProblemIds
  }
}

export function planSessionAssignment(options: {
  newProblemIds: string[]
  resurfacedCandidates: ResurfacedCandidate[]
}): SessionAssignmentPlan {
  const rankedCandidates = rankSessionCandidates(options)
  const assignedProblemIds =
    rankedCandidates.primaryProblemId === null
      ? []
      : [rankedCandidates.primaryProblemId]
  const resurfacedAssignedCount = rankedCandidates.prioritizedNewProblem
    ? 0
    : assignedProblemIds.length === 0
      ? 0
      : 1

  return {
    primaryProblemId: rankedCandidates.primaryProblemId,
    assignedProblemIds,
    resurfacedAssignedCount,
    deferredResurfacedProblemIds:
      resurfacedAssignedCount === 1
        ? rankedCandidates.rankedResurfacedProblemIds.slice(1)
        : rankedCandidates.rankedResurfacedProblemIds
  }
}
