import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("problem flag endpoint queues reports, deduplicates repeats, and moves cards to needs_review", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const baseUrl = `http://127.0.0.1:${startedServer.port}`

  const firstFlagResponse = await fetch(`${baseUrl}/api/problems/flag`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      problemId: "mlp_affine_relu_step_v1",
      problemVersion: 1,
      reason: "incorrect_output",
      notes: "Hidden deterministic case output does not match expected matrix.",
      sessionId: "session-flag-1",
      evaluationCorrectness: "partial",
      evaluationExplanation: "Shape is correct but values drift."
    })
  })
  const firstFlagPayload = await firstFlagResponse.json()

  assert.equal(firstFlagResponse.status, 200)
  assert.equal(firstFlagPayload.status, "accepted")
  assert.equal(firstFlagPayload.deduplicated, false)
  assert.equal(firstFlagPayload.verificationStatus, "needs_review")
  assert.equal(firstFlagPayload.triageAction, "status_updated_to_needs_review")

  const duplicateFlagResponse = await fetch(`${baseUrl}/api/problems/flag`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      problemId: "mlp_affine_relu_step_v1",
      problemVersion: 1,
      reason: "incorrect_output",
      notes: "Hidden deterministic case output does not match expected matrix.",
      sessionId: "session-flag-1",
      evaluationCorrectness: "partial",
      evaluationExplanation: "Shape is correct but values drift."
    })
  })
  const duplicateFlagPayload = await duplicateFlagResponse.json()

  assert.equal(duplicateFlagResponse.status, 200)
  assert.equal(duplicateFlagPayload.status, "accepted")
  assert.equal(duplicateFlagPayload.deduplicated, true)

  const reviewQueueResponse = await fetch(`${baseUrl}/api/problems/review-queue`)
  const reviewQueuePayload = await reviewQueueResponse.json()

  assert.equal(reviewQueueResponse.status, 200)
  assert.equal(reviewQueuePayload.totalFlags, 1)
  assert.equal(reviewQueuePayload.items[0]?.problemId, "mlp_affine_relu_step_v1")
  assert.equal(
    reviewQueuePayload.statusByProblemId.mlp_affine_relu_step_v1,
    "needs_review"
  )
})

test("scheduler plan endpoint excludes needs_review cards by default", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const baseUrl = `http://127.0.0.1:${startedServer.port}`

  const flagResponse = await fetch(`${baseUrl}/api/problems/flag`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      problemId: "mlp_affine_relu_step_v1",
      reason: "incorrect_output",
      notes: "Incorrect deterministic output",
      sessionId: "session-flag-2"
    })
  })
  assert.equal(flagResponse.status, 200)

  const schedulerPlanResponse = await fetch(`${baseUrl}/api/scheduler/plan`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      newProblemIds: [
        "mlp_affine_relu_step_v1",
        "normalization_layernorm_forward_v1"
      ],
      resurfacedCandidates: []
    })
  })
  const schedulerPlanPayload = await schedulerPlanResponse.json()

  assert.equal(schedulerPlanResponse.status, 200)
  assert.equal(schedulerPlanPayload.primaryProblemId, "normalization_layernorm_forward_v1")
  assert.deepEqual(schedulerPlanPayload.assignedProblemIds, ["normalization_layernorm_forward_v1"])
  assert.deepEqual(schedulerPlanPayload.excludedProblemIdsByVerification, ["mlp_affine_relu_step_v1"])
})
