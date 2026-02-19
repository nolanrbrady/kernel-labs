import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"
import { getSeedProblemPack } from "../src/problems/seed-problem-pack.js"

test("verify-card endpoint returns verified status and diagnostics for a valid card", async (t) => {
  const startedServer = await startServer({ port: 0 })
  t.after(async () => {
    await startedServer.close()
  })

  const card = getSeedProblemPack()[0]
  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/problems/verify-card`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(card)
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "verified")
  assert.equal(payload.approvalType, "auto_provisional")
  assert.equal(Array.isArray(payload.diagnostics), true)
})

test("verify-card endpoint rejects invalid card payloads with actionable blockers", async (t) => {
  const startedServer = await startServer({ port: 0 })
  t.after(async () => {
    await startedServer.close()
  })

  const invalidCard = getSeedProblemPack()[0]
  invalidCard.evaluation_artifacts.hidden_tests = []

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/problems/verify-card`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(invalidCard)
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "rejected")
  assert.equal(
    payload.blockers.some((entry: string) => entry.includes("SCHEMA_INVALID")),
    true
  )
})
