import assert from "node:assert/strict"
import test from "node:test"

import {
  createActiveSession,
  submitSessionAttempt
} from "../src/session/submission-session.js"

test("submission transitions active session to explicit done state", () => {
  const activeSession = createActiveSession({
    sessionId: "session-001",
    problemId: "attention_scaled_dot_product_v1"
  })

  const submissionResult = submitSessionAttempt(activeSession, {
    correctness: "pass",
    explanation: "All evaluator checks passed.",
    submittedAt: "2026-02-16T18:10:00Z"
  })

  assert.equal(submissionResult.submissionAccepted, true)
  assert.equal(submissionResult.nextState.status, "done")
  assert.equal(submissionResult.nextState.endedAt, "2026-02-16T18:10:00Z")
  assert.equal(submissionResult.nextState.submissions.length, 1)
})

test("incorrect submissions are accepted with supportive non-punitive feedback", () => {
  const activeSession = createActiveSession({
    sessionId: "session-002",
    problemId: "normalization_layernorm_v1"
  })

  const submissionResult = submitSessionAttempt(activeSession, {
    correctness: "fail",
    explanation: "Shape mismatch on output tensor.",
    submittedAt: "2026-02-16T18:10:30Z"
  })

  assert.equal(submissionResult.submissionAccepted, true)
  assert.equal(submissionResult.nextState.status, "done")
  assert.notEqual(submissionResult.nextState.outcome, null)
  assert.equal(submissionResult.nextState.outcome?.correctness, "fail")
  assert.equal(submissionResult.supportiveFeedback.includes("informative"), true)
  assert.equal(submissionResult.supportiveFeedback.includes("penalty"), false)
})
