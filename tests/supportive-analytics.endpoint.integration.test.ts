import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("analytics endpoint returns supportive summaries for private trend data", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/analytics/summaries`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        categoryMetrics: [
          {
            category: "Attention",
            averageHintTierUsed: 2.7,
            averageTimeSpentMinutes: 23,
            resurfacingFrequencyPerWeek: 2.4
          }
        ]
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(Array.isArray(payload.summaries), true)
  assert.equal(payload.summaries.length, 1)
  assert.equal(payload.summaries[0]?.category, "Attention")
})
