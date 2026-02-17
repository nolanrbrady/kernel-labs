import type { ResurfacedCandidate } from "../scheduler/spaced-repetition-scheduler.js"

export const PROBLEM_FLAG_REASONS = [
  "incorrect_output",
  "ambiguous_prompt",
  "insufficient_context",
  "bad_hint",
  "other"
] as const

export type ProblemFlagReason = (typeof PROBLEM_FLAG_REASONS)[number]

export type ProblemVerificationStatus = "verified" | "needs_review" | "rejected"

export type ProblemFlagRecord = {
  flagId: string
  problemId: string
  problemVersion: number
  reason: ProblemFlagReason
  notes: string
  sessionId: string | null
  userCodeHash: string | null
  evaluationCorrectness: "pass" | "partial" | "fail" | "unknown"
  evaluationExplanation: string
  submittedAt: string
  triageAction: "queued_for_review" | "status_updated_to_needs_review"
}

export type SubmitProblemFlagInput = {
  problemId: string
  problemVersion?: number
  reason: ProblemFlagReason
  notes?: string
  sessionId?: string
  userCodeHash?: string
  evaluationCorrectness?: "pass" | "partial" | "fail"
  evaluationExplanation?: string
  submittedAt?: string
}

export type SubmitProblemFlagResult = {
  accepted: boolean
  deduplicated: boolean
  rateLimited: boolean
  message: string
  verificationStatus: ProblemVerificationStatus
  triageAction: ProblemFlagRecord["triageAction"]
  reviewQueueSize: number
  flag: ProblemFlagRecord | null
}

export type ProblemReviewQueueSnapshot = {
  items: ProblemFlagRecord[]
  totalFlags: number
  statusByProblemId: Record<string, ProblemVerificationStatus>
}

type ProblemReviewQueueOptions = {
  knownProblemIds: string[]
  problemVersionById?: Record<string, number>
  nowProvider?: () => number
}

type SessionProblemWindow = {
  key: string
  submittedAtMs: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SESSION_PROBLEM_RATE_LIMIT = 3
const NEEDS_REVIEW_COUNT_THRESHOLD = 3

function normalizeText(value: string | undefined): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = normalizeText(value)
  return normalized.length > 0 ? normalized : null
}

function normalizeDateIso(value: string | undefined, nowMs: number): string {
  if (typeof value !== "string") {
    return new Date(nowMs).toISOString()
  }

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return new Date(nowMs).toISOString()
  }

  return new Date(parsed).toISOString()
}

function buildDedupeKey(input: {
  problemId: string
  reason: ProblemFlagReason
  notes: string
  sessionId: string | null
}): string {
  return [
    input.problemId,
    input.reason,
    input.sessionId ?? "session:none",
    input.notes.toLowerCase()
  ].join("|")
}

function isWithinWindow(nowMs: number, candidateMs: number, windowMs: number): boolean {
  return nowMs - candidateMs <= windowMs
}

function isKnownReason(value: unknown): value is ProblemFlagReason {
  return PROBLEM_FLAG_REASONS.includes(value as ProblemFlagReason)
}

export type ProblemReviewQueueStore = {
  submitFlag: (input: SubmitProblemFlagInput) => SubmitProblemFlagResult
  getVerificationStatus: (problemId: string) => ProblemVerificationStatus
  getVerificationStatusSnapshot: () => Record<string, ProblemVerificationStatus>
  getReviewQueueSnapshot: () => ProblemReviewQueueSnapshot
  isProblemSchedulable: (problemId: string) => boolean
  filterSchedulableProblemIds: (problemIds: string[]) => string[]
  filterSchedulableResurfacedCandidates: (
    resurfacedCandidates: ResurfacedCandidate[]
  ) => ResurfacedCandidate[]
}

export function createProblemReviewQueueStore(
  options: ProblemReviewQueueOptions
): ProblemReviewQueueStore {
  const nowProvider = options.nowProvider ?? (() => Date.now())
  const knownProblemIds = Array.from(new Set(options.knownProblemIds))
  const knownProblemIdSet = new Set(knownProblemIds)
  const problemVersionById = options.problemVersionById ?? {}

  const statusByProblemId = new Map<string, ProblemVerificationStatus>()
  knownProblemIds.forEach((problemId) => {
    statusByProblemId.set(problemId, "verified")
  })

  const flagsByProblemId = new Map<string, ProblemFlagRecord[]>()
  const allFlags: ProblemFlagRecord[] = []
  const recentSessionFlags: SessionProblemWindow[] = []
  let nextFlagId = 1

  function getVerificationStatus(problemId: string): ProblemVerificationStatus {
    return statusByProblemId.get(problemId) ?? "verified"
  }

  function getReviewQueueSnapshot(): ProblemReviewQueueSnapshot {
    const orderedItems = [...allFlags].sort((left, right) => {
      return Date.parse(right.submittedAt) - Date.parse(left.submittedAt)
    })

    return {
      items: orderedItems,
      totalFlags: orderedItems.length,
      statusByProblemId: getVerificationStatusSnapshot()
    }
  }

  function getVerificationStatusSnapshot(): Record<string, ProblemVerificationStatus> {
    const snapshot: Record<string, ProblemVerificationStatus> = {}

    statusByProblemId.forEach((status, problemId) => {
      snapshot[problemId] = status
    })

    return snapshot
  }

  function isProblemSchedulable(problemId: string): boolean {
    if (!knownProblemIdSet.has(problemId) && !statusByProblemId.has(problemId)) {
      return true
    }

    return getVerificationStatus(problemId) === "verified"
  }

  function filterSchedulableProblemIds(problemIds: string[]): string[] {
    return problemIds.filter((problemId) => {
      return isProblemSchedulable(problemId)
    })
  }

  function filterSchedulableResurfacedCandidates(
    resurfacedCandidates: ResurfacedCandidate[]
  ): ResurfacedCandidate[] {
    return resurfacedCandidates.filter((candidate) => {
      return isProblemSchedulable(candidate.problemId)
    })
  }

  function submitFlag(input: SubmitProblemFlagInput): SubmitProblemFlagResult {
    const nowMs = nowProvider()
    const problemId = normalizeText(input.problemId)
    const reason = input.reason

    if (!problemId || !isKnownReason(reason)) {
      return {
        accepted: false,
        deduplicated: false,
        rateLimited: false,
        message: "Flag request is missing required problemId/reason fields.",
        verificationStatus: getVerificationStatus(problemId),
        triageAction: "queued_for_review",
        reviewQueueSize: allFlags.length,
        flag: null
      }
    }

    const notes = normalizeText(input.notes)
    const sessionId = normalizeOptionalText(input.sessionId)
    const userCodeHash = normalizeOptionalText(input.userCodeHash)
    const submittedAt = normalizeDateIso(input.submittedAt, nowMs)
    const submittedAtMs = Date.parse(submittedAt)

    const windowStartMs = nowMs - ONE_DAY_MS
    for (let index = recentSessionFlags.length - 1; index >= 0; index -= 1) {
      if (recentSessionFlags[index].submittedAtMs < windowStartMs) {
        recentSessionFlags.splice(index, 1)
      }
    }

    const dedupeKey = buildDedupeKey({
      problemId,
      reason,
      notes,
      sessionId
    })
    const existingForProblem = flagsByProblemId.get(problemId) ?? []
    const duplicatedRecord = existingForProblem.find((record) => {
      const recordMs = Date.parse(record.submittedAt)
      if (!isWithinWindow(nowMs, recordMs, ONE_DAY_MS)) {
        return false
      }

      return (
        buildDedupeKey({
          problemId: record.problemId,
          reason: record.reason,
          notes: record.notes,
          sessionId: record.sessionId
        }) === dedupeKey
      )
    })

    if (duplicatedRecord) {
      return {
        accepted: true,
        deduplicated: true,
        rateLimited: false,
        message: "Duplicate flag detected. Existing review item kept.",
        verificationStatus: getVerificationStatus(problemId),
        triageAction: duplicatedRecord.triageAction,
        reviewQueueSize: allFlags.length,
        flag: duplicatedRecord
      }
    }

    if (sessionId) {
      const sessionProblemKey = `${sessionId}|${problemId}`
      const recentCount = recentSessionFlags.reduce((count, entry) => {
        if (entry.key !== sessionProblemKey) {
          return count
        }

        if (!isWithinWindow(nowMs, entry.submittedAtMs, ONE_DAY_MS)) {
          return count
        }

        return count + 1
      }, 0)

      if (recentCount >= SESSION_PROBLEM_RATE_LIMIT) {
        return {
          accepted: false,
          deduplicated: false,
          rateLimited: true,
          message: "Too many flags from this session for the same problem. Try again later.",
          verificationStatus: getVerificationStatus(problemId),
          triageAction: "queued_for_review",
          reviewQueueSize: allFlags.length,
          flag: null
        }
      }

      recentSessionFlags.push({
        key: sessionProblemKey,
        submittedAtMs
      })
    }

    const priorStatus = getVerificationStatus(problemId)
    const recentProblemFlagCount = existingForProblem.reduce((count, entry) => {
      const entryMs = Date.parse(entry.submittedAt)
      if (!isWithinWindow(nowMs, entryMs, ONE_DAY_MS)) {
        return count
      }

      return count + 1
    }, 0)

    const shouldEscalateToNeedsReview =
      priorStatus !== "rejected" &&
      (reason === "incorrect_output" ||
        recentProblemFlagCount + 1 >= NEEDS_REVIEW_COUNT_THRESHOLD)
    const triageAction: ProblemFlagRecord["triageAction"] =
      shouldEscalateToNeedsReview && priorStatus !== "needs_review"
        ? "status_updated_to_needs_review"
        : "queued_for_review"

    if (shouldEscalateToNeedsReview) {
      statusByProblemId.set(problemId, "needs_review")
    } else if (!statusByProblemId.has(problemId)) {
      statusByProblemId.set(problemId, priorStatus)
    }

    const evaluationCorrectness = input.evaluationCorrectness
    const flagRecord: ProblemFlagRecord = {
      flagId: `flag_${String(nextFlagId).padStart(5, "0")}`,
      problemId,
      problemVersion:
        typeof input.problemVersion === "number" && Number.isFinite(input.problemVersion)
          ? Math.max(1, Math.round(input.problemVersion))
          : problemVersionById[problemId] ?? 1,
      reason,
      notes,
      sessionId,
      userCodeHash,
      evaluationCorrectness:
        evaluationCorrectness === "pass" ||
        evaluationCorrectness === "partial" ||
        evaluationCorrectness === "fail"
          ? evaluationCorrectness
          : "unknown",
      evaluationExplanation: normalizeText(input.evaluationExplanation),
      submittedAt,
      triageAction
    }

    nextFlagId += 1
    allFlags.push(flagRecord)
    flagsByProblemId.set(problemId, [...existingForProblem, flagRecord])

    const verificationStatus = getVerificationStatus(problemId)
    const triageMessage =
      triageAction === "status_updated_to_needs_review"
        ? "Flag recorded and card moved to needs_review."
        : "Flag recorded and queued for review."

    return {
      accepted: true,
      deduplicated: false,
      rateLimited: false,
      message: triageMessage,
      verificationStatus,
      triageAction,
      reviewQueueSize: allFlags.length,
      flag: flagRecord
    }
  }

  return {
    submitFlag,
    getVerificationStatus,
    getVerificationStatusSnapshot,
    getReviewQueueSnapshot,
    isProblemSchedulable,
    filterSchedulableProblemIds,
    filterSchedulableResurfacedCandidates
  }
}
