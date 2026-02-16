import {
  type AnonymousAttemptRecord,
  type AnonymousProgressSnapshot
} from "./anonymous-progress-store.js"

export type ProgressMergeRequest = {
  accountProgress: AnonymousProgressSnapshot
  anonymousProgress: AnonymousProgressSnapshot
  mergedAt?: string
}

function buildAttemptKey(attempt: AnonymousAttemptRecord): string {
  return [
    attempt.problemId,
    attempt.correctness,
    attempt.hintTierUsed,
    attempt.timeSpentMinutes,
    attempt.submittedAt
  ].join("|")
}

function mergeAttemptHistories(options: {
  accountAttempts: AnonymousAttemptRecord[]
  anonymousAttempts: AnonymousAttemptRecord[]
}): AnonymousAttemptRecord[] {
  const mergedAttempts: AnonymousAttemptRecord[] = []
  const seenKeys = new Set<string>()

  for (const attempt of [...options.accountAttempts, ...options.anonymousAttempts]) {
    const attemptKey = buildAttemptKey(attempt)

    if (seenKeys.has(attemptKey)) {
      continue
    }

    seenKeys.add(attemptKey)
    mergedAttempts.push(attempt)
  }

  return mergedAttempts.sort((first, second) => {
    return Date.parse(first.submittedAt) - Date.parse(second.submittedAt)
  })
}

export function mergeAnonymousProgressIntoAccount(
  request: ProgressMergeRequest
): AnonymousProgressSnapshot {
  const mergedAttemptHistory = mergeAttemptHistories({
    accountAttempts: request.accountProgress.attemptHistory,
    anonymousAttempts: request.anonymousProgress.attemptHistory
  })
  const mergedCompletedProblemIds = new Set<string>([
    ...request.accountProgress.completedProblemIds,
    ...request.anonymousProgress.completedProblemIds,
    ...mergedAttemptHistory.map((attempt) => attempt.problemId)
  ])

  return {
    version: 1,
    updatedAt: request.mergedAt ?? new Date().toISOString(),
    completedProblemIds: [...mergedCompletedProblemIds],
    attemptHistory: mergedAttemptHistory
  }
}
