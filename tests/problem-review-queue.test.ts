import assert from "node:assert/strict"
import test from "node:test"

import { createProblemReviewQueueStore } from "../src/problems/problem-review-queue.js"

test("incorrect-output flags escalate card to needs_review and exclude from scheduling", () => {
  let nowMs = Date.parse("2026-02-17T10:00:00.000Z")
  const store = createProblemReviewQueueStore({
    knownProblemIds: ["mlp_affine_relu_step_v1", "normalization_layernorm_forward_v1"],
    problemVersionById: {
      mlp_affine_relu_step_v1: 1,
      normalization_layernorm_forward_v1: 1
    },
    nowProvider: () => nowMs
  })

  const result = store.submitFlag({
    problemId: "mlp_affine_relu_step_v1",
    reason: "incorrect_output",
    notes: "Expected values mismatch hidden deterministic case.",
    sessionId: "session-1",
    evaluationCorrectness: "partial"
  })

  assert.equal(result.accepted, true)
  assert.equal(result.deduplicated, false)
  assert.equal(result.rateLimited, false)
  assert.equal(result.verificationStatus, "needs_review")
  assert.equal(result.triageAction, "status_updated_to_needs_review")
  assert.equal(store.isProblemSchedulable("mlp_affine_relu_step_v1"), false)
  assert.equal(store.isProblemSchedulable("normalization_layernorm_forward_v1"), true)

  const schedulable = store.filterSchedulableProblemIds([
    "mlp_affine_relu_step_v1",
    "normalization_layernorm_forward_v1"
  ])
  assert.deepEqual(schedulable, ["normalization_layernorm_forward_v1"])

  nowMs += 1000
  const snapshot = store.getReviewQueueSnapshot()
  assert.equal(snapshot.totalFlags, 1)
  assert.equal(snapshot.items[0]?.problemId, "mlp_affine_relu_step_v1")
})

test("duplicate flag payloads are deduplicated and queue size stays stable", () => {
  const store = createProblemReviewQueueStore({
    knownProblemIds: ["attention_scaled_dot_product_v1"],
    nowProvider: () => Date.parse("2026-02-17T11:00:00.000Z")
  })

  const first = store.submitFlag({
    problemId: "attention_scaled_dot_product_v1",
    reason: "ambiguous_prompt",
    notes: "Mask semantics are unclear.",
    sessionId: "session-2"
  })
  const second = store.submitFlag({
    problemId: "attention_scaled_dot_product_v1",
    reason: "ambiguous_prompt",
    notes: "Mask semantics are unclear.",
    sessionId: "session-2"
  })

  assert.equal(first.accepted, true)
  assert.equal(first.deduplicated, false)
  assert.equal(second.accepted, true)
  assert.equal(second.deduplicated, true)

  const snapshot = store.getReviewQueueSnapshot()
  assert.equal(snapshot.totalFlags, 1)
})

test("session-problem rate limiting blocks excessive flag spam", () => {
  let nowMs = Date.parse("2026-02-17T12:00:00.000Z")
  const store = createProblemReviewQueueStore({
    knownProblemIds: ["attention_scaled_dot_product_v1"],
    nowProvider: () => nowMs
  })

  const payload = {
    problemId: "attention_scaled_dot_product_v1",
    reason: "other" as const,
    notes: "Potential issue",
    sessionId: "session-3"
  }

  const first = store.submitFlag(payload)
  nowMs += 1000
  const second = store.submitFlag({ ...payload, notes: "Potential issue 2" })
  nowMs += 1000
  const third = store.submitFlag({ ...payload, notes: "Potential issue 3" })
  nowMs += 1000
  const fourth = store.submitFlag({ ...payload, notes: "Potential issue 4" })

  assert.equal(first.accepted, true)
  assert.equal(second.accepted, true)
  assert.equal(third.accepted, true)
  assert.equal(fourth.accepted, false)
  assert.equal(fourth.rateLimited, true)
})
