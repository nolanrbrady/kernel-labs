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
  interchangeableResurfacedProblemIds: string[]
  interchangeableThreshold: number
}

export type SessionAssignmentPlan = {
  primaryProblemId: string | null
  assignedProblemIds: string[]
  resurfacedAssignedCount: 0 | 1
  deferredResurfacedProblemIds: string[]
  interchangeableResurfacedProblemIds: string[]
  selectedInterchangeableProblemId: string | null
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

const DEFAULT_INTERCHANGEABLE_THRESHOLD = 0.03
const INTERCHANGEABLE_THRESHOLD_EPSILON = 1e-9

function clamp(minimum: number, value: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeInterchangeableThreshold(threshold: number | undefined): number {
  if (typeof threshold !== "number" || Number.isFinite(threshold) === false) {
    return DEFAULT_INTERCHANGEABLE_THRESHOLD
  }

  return Math.max(0, threshold)
}

function sortResurfacedCandidates(
  resurfacedCandidates: ResurfacedCandidate[]
): ResurfacedCandidate[] {
  return [...resurfacedCandidates].sort((first, second) => {
    const priorityDelta = second.resurfacingPriority - first.resurfacingPriority

    if (priorityDelta !== 0) {
      return priorityDelta
    }

    return first.problemId.localeCompare(second.problemId)
  })
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
  interchangeableThreshold?: number
}): RankedSessionCandidates {
  const interchangeableThreshold = normalizeInterchangeableThreshold(
    options.interchangeableThreshold
  )
  const rankedResurfacedCandidates = sortResurfacedCandidates(
    options.resurfacedCandidates
  )
  const rankedResurfacedProblemIds = rankedResurfacedCandidates.map((candidate) => {
    return candidate.problemId
  })

  const prioritizedNewProblem = options.newProblemIds.length > 0
  const primaryProblemId = prioritizedNewProblem
    ? options.newProblemIds[0] ?? null
    : rankedResurfacedProblemIds[0] ?? null
  const interchangeableResurfacedProblemIds =
    prioritizedNewProblem || rankedResurfacedCandidates.length === 0
      ? []
      : rankedResurfacedCandidates
          .filter((candidate) => {
            return (
              rankedResurfacedCandidates[0].resurfacingPriority -
                candidate.resurfacingPriority <=
              interchangeableThreshold + INTERCHANGEABLE_THRESHOLD_EPSILON
            )
          })
          .map((candidate) => {
            return candidate.problemId
          })

  return {
    primaryProblemId,
    prioritizedNewProblem,
    resurfacingDebtCount: 0,
    rankedResurfacedProblemIds,
    interchangeableResurfacedProblemIds,
    interchangeableThreshold
  }
}

export function planSessionAssignment(options: {
  newProblemIds: string[]
  resurfacedCandidates: ResurfacedCandidate[]
  interchangeableThreshold?: number
  selectedProblemId?: string | null
}): SessionAssignmentPlan {
  const rankedCandidates = rankSessionCandidates({
    newProblemIds: options.newProblemIds,
    resurfacedCandidates: options.resurfacedCandidates,
    interchangeableThreshold: options.interchangeableThreshold
  })
  const selectedInterchangeableProblemId =
    rankedCandidates.prioritizedNewProblem ||
    rankedCandidates.interchangeableResurfacedProblemIds.length === 0
      ? null
      : typeof options.selectedProblemId === "string" &&
          rankedCandidates.interchangeableResurfacedProblemIds.includes(
            options.selectedProblemId
          )
        ? options.selectedProblemId
        : rankedCandidates.primaryProblemId
  const primaryProblemId =
    rankedCandidates.prioritizedNewProblem ||
    selectedInterchangeableProblemId === null
      ? rankedCandidates.primaryProblemId
      : selectedInterchangeableProblemId
  const assignedProblemIds =
    primaryProblemId === null ? [] : [primaryProblemId]
  const resurfacedAssignedCount = rankedCandidates.prioritizedNewProblem
    ? 0
    : assignedProblemIds.length === 0
      ? 0
      : 1

  return {
    primaryProblemId,
    assignedProblemIds,
    resurfacedAssignedCount,
    interchangeableResurfacedProblemIds:
      rankedCandidates.interchangeableResurfacedProblemIds,
    selectedInterchangeableProblemId,
    deferredResurfacedProblemIds:
      resurfacedAssignedCount === 1
        ? rankedCandidates.rankedResurfacedProblemIds.filter((problemId) => {
            return problemId !== primaryProblemId
          })
        : rankedCandidates.rankedResurfacedProblemIds
  }
}
