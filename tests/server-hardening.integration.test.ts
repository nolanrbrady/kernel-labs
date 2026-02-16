import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("server hardening adds baseline security headers", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(`http://127.0.0.1:${startedServer.port}/`)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("x-content-type-options"), "nosniff")
  assert.equal(response.headers.get("x-frame-options"), "DENY")
  assert.equal(response.headers.get("referrer-policy"), "no-referrer")
  assert.equal(response.headers.get("x-powered-by"), null)
  assert.equal(
    response.headers
      .get("content-security-policy")
      ?.includes("script-src 'self' 'unsafe-inline'"),
    true
  )
})

test("oversized JSON payloads are rejected with a safe 413 response", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const oversizedCode = "a".repeat(80_000)
  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/runtime/run`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        problemId: "attention_scaled_dot_product_v1",
        userCode: oversizedCode
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 413)
  assert.equal(payload.status, "failure")
  assert.equal(payload.errorCode, "PAYLOAD_TOO_LARGE")
})

test("unexpected errors return sanitized 500 responses", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/scheduler/decision`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        correctness: "pass",
        timeSpentMinutes: "bad-type",
        hintTierUsed: 1,
        priorSuccessfulCompletions: 0,
        daysSinceLastExposure: 1
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.status, "failure")
  assert.equal(Object.hasOwn(payload, "stack"), false)
})
