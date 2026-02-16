import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("session submit endpoint transitions session to done on pass", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/session/submit`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sessionId: "session-003",
        problemId: "attention_scaled_dot_product_v1",
        correctness: "pass",
        explanation: "All checks passed.",
        submittedAt: "2026-02-16T18:10:00Z"
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.submissionAccepted, true)
  assert.equal(payload.nextState.status, "done")
  assert.equal(payload.nextState.endedAt, "2026-02-16T18:10:00Z")
})

test("session submit endpoint accepts incorrect submissions without punitive response", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/session/submit`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sessionId: "session-004",
        problemId: "normalization_layernorm_v1",
        correctness: "fail",
        explanation: "Shape mismatch remains.",
        submittedAt: "2026-02-16T18:10:30Z"
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.submissionAccepted, true)
  assert.equal(payload.nextState.status, "done")
  assert.equal(payload.nextState.outcome.correctness, "fail")
  assert.equal(payload.supportiveFeedback.includes("penalty"), false)
})
