import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("optional auth account endpoint is available without blocking anonymous runtime", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const authResponse = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/auth/create-optional-account`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        displayName: "anonymous-user"
      })
    }
  )
  const authPayload = await authResponse.json()

  assert.equal(authResponse.status, 200)
  assert.equal(authPayload.account.optional, true)
  assert.equal(typeof authPayload.account.accountId, "string")

  const runtimeResponse = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/runtime/run`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        problemId: "attention_scaled_dot_product_v1",
        userCode:
          "def scaled_dot_product_attention(q, k, v, mask=None):\n    scores = q @ k.transpose(-1, -2)\n    return scores"
      })
    }
  )
  const runtimePayload = await runtimeResponse.json()

  assert.equal(runtimeResponse.status, 200)
  assert.equal(runtimePayload.status, "success")
})
