import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("session timer endpoint enforces 30-minute cap with supportive message", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/session/timer`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        startedAt: "2026-02-16T18:00:00Z",
        now: "2026-02-16T18:30:00Z"
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.hasTimedOut, true)
  assert.equal(payload.status, "timed_out")
  assert.equal(payload.remainingSeconds, 0)
  assert.equal(payload.message.includes("penalty"), false)
})
