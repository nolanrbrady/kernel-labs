import assert from "node:assert/strict"
import test from "node:test"

import { getRuntimeProblemFixture } from "../src/problems/runtime-problem-fixtures.js"
import { startServer } from "../src/backend/server.js"

test("evaluator endpoint returns pass for expected deterministic output", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const fixture = getRuntimeProblemFixture("attention_scaled_dot_product_v1")
  assert.notEqual(fixture, null)
  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/evaluator/evaluate`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        problemId: "attention_scaled_dot_product_v1",
        candidateOutput: fixture!.expectedOutput
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.correctness, "pass")
  assert.equal(typeof payload.explanation, "string")
  assert.equal(payload.checks.shape.passed, true)
  assert.equal(payload.checks.invariance.passed, true)
  assert.equal(payload.checks.numericalSanity.passed, true)
})

test("evaluator endpoint returns fail when output shape is wrong", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/evaluator/evaluate`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        problemId: "attention_scaled_dot_product_v1",
        candidateOutput: [[0.1], [0.2]]
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.correctness, "fail")
  assert.equal(payload.checks.shape.passed, false)
})
