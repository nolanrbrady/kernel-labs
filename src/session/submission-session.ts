export type SubmissionCorrectness = "pass" | "partial" | "fail"

export type SubmissionAttempt = {
  correctness: SubmissionCorrectness
  explanation: string
  submittedAt?: string
}

export type SessionSubmissionRecord = {
  correctness: SubmissionCorrectness
  explanation: string
  submittedAt: string
}

export type SessionState = {
  sessionId: string
  problemId: string
  status: "active" | "done"
  startedAt: string
  endedAt: string | null
  submissions: SessionSubmissionRecord[]
  outcome: {
    correctness: SubmissionCorrectness
    explanation: string
  } | null
}

export type SubmissionTransition = {
  submissionAccepted: true
  supportiveFeedback: string
  nextState: SessionState
}

export function createActiveSession(options: {
  sessionId: string
  problemId: string
  startedAt?: string
}): SessionState {
  return {
    sessionId: options.sessionId,
    problemId: options.problemId,
    status: "active",
    startedAt: options.startedAt ?? new Date().toISOString(),
    endedAt: null,
    submissions: [],
    outcome: null
  }
}

function getSupportiveFeedback(
  correctness: SubmissionCorrectness
): string {
  if (correctness === "pass") {
    return "Submission accepted. Session complete for today."
  }

  if (correctness === "partial") {
    return "Submission accepted. This partial result is informative for your next practice session."
  }

  return "Submission accepted. Incorrect attempts are informative and help guide the next session."
}

export function submitSessionAttempt(
  sessionState: SessionState,
  attempt: SubmissionAttempt
): SubmissionTransition {
  const submittedAt = attempt.submittedAt ?? new Date().toISOString()
  const submissionRecord: SessionSubmissionRecord = {
    correctness: attempt.correctness,
    explanation: attempt.explanation,
    submittedAt
  }
  const nextState: SessionState = {
    ...sessionState,
    status: "done",
    endedAt: submittedAt,
    submissions: [...sessionState.submissions, submissionRecord],
    outcome: {
      correctness: attempt.correctness,
      explanation: attempt.explanation
    }
  }

  return {
    submissionAccepted: true,
    supportiveFeedback: getSupportiveFeedback(attempt.correctness),
    nextState
  }
}
