import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("scheduler plan endpoint accepts explicit interchangeable user choice", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/scheduler/plan`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        newProblemIds: [],
        resurfacedCandidates: [
          { problemId: "top_card", resurfacingPriority: 0.91 },
          { problemId: "near_equal_card", resurfacingPriority: 0.89 },
          { problemId: "deferred_card", resurfacingPriority: 0.72 }
        ],
        interchangeableThreshold: 0.02,
        selectedProblemId: "near_equal_card"
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.primaryProblemId, "near_equal_card")
  assert.deepEqual(payload.assignedProblemIds, ["near_equal_card"])
  assert.equal(payload.resurfacedAssignedCount, 1)
  assert.deepEqual(payload.interchangeableResurfacedProblemIds, [
    "top_card",
    "near_equal_card"
  ])
  assert.equal(payload.selectedInterchangeableProblemId, "near_equal_card")
  assert.deepEqual(payload.deferredResurfacedProblemIds, [
    "top_card",
    "deferred_card"
  ])
})

test("scheduler plan endpoint falls back to deterministic top card when no choice is provided", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/scheduler/plan`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        newProblemIds: [],
        resurfacedCandidates: [
          { problemId: "z_top_card", resurfacingPriority: 0.9 },
          { problemId: "a_top_card", resurfacingPriority: 0.9 },
          { problemId: "lower_card", resurfacingPriority: 0.82 }
        ],
        interchangeableThreshold: 0.01
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.primaryProblemId, "a_top_card")
  assert.deepEqual(payload.assignedProblemIds, ["a_top_card"])
  assert.equal(payload.selectedInterchangeableProblemId, "a_top_card")
  assert.deepEqual(payload.interchangeableResurfacedProblemIds, [
    "a_top_card",
    "z_top_card"
  ])
  assert.deepEqual(payload.deferredResurfacedProblemIds, [
    "z_top_card",
    "lower_card"
  ])
})
