import assert from "node:assert/strict"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { startServer } from "../src/backend/server.js"

test("create-account route renders a working signup form", async (t) => {
  const previousAccountStoreFile = process.env.ACCOUNT_STORE_FILE
  process.env.ACCOUNT_STORE_FILE = join(
    tmpdir(),
    `deepmlsr-accounts-${Date.now()}-route.json`
  )
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    if (previousAccountStoreFile === undefined) {
      delete process.env.ACCOUNT_STORE_FILE
    } else {
      process.env.ACCOUNT_STORE_FILE = previousAccountStoreFile
    }
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/auth/create-account`
  )
  const html = await response.text()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type")?.includes("text/html"), true)
  assert.equal(html.includes("id=\"create-account-form\""), true)
  assert.equal(html.includes("id=\"account-email\""), true)
  assert.equal(html.includes("id=\"account-password\""), true)
  assert.equal(html.includes("/api/auth/create-account"), true)
  assert.equal(html.includes("/auth/sign-in"), true)

  const signInResponse = await fetch(
    `http://127.0.0.1:${startedServer.port}/auth/sign-in`
  )
  const signInHtml = await signInResponse.text()

  assert.equal(signInResponse.status, 200)
  assert.equal(signInHtml.includes("id=\"sign-in-form\""), true)
  assert.equal(signInHtml.includes("/api/auth/sign-in"), true)
})

test("create-account api creates accounts, rejects duplicates, and keeps runtime flow available", async (t) => {
  const previousAccountStoreFile = process.env.ACCOUNT_STORE_FILE
  process.env.ACCOUNT_STORE_FILE = join(
    tmpdir(),
    `deepmlsr-accounts-${Date.now()}-api.json`
  )
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    if (previousAccountStoreFile === undefined) {
      delete process.env.ACCOUNT_STORE_FILE
    } else {
      process.env.ACCOUNT_STORE_FILE = previousAccountStoreFile
    }
    await startedServer.close()
  })

  const createResponse = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/auth/create-account`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: "new-user@example.com",
        password: "strong-password-123",
        displayName: "New User"
      })
    }
  )
  const createPayload = await createResponse.json()

  assert.equal(createResponse.status, 201)
  assert.equal(createPayload.status, "success")
  assert.equal(createPayload.account.optional, false)
  assert.equal(createPayload.account.email, "new-user@example.com")
  assert.equal(typeof createPayload.account.accountId, "string")
  assert.equal(createPayload.account.accountId.startsWith("acct_"), true)
  assert.equal(typeof createPayload.session?.sessionToken, "string")

  const duplicateResponse = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/auth/create-account`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: "NEW-USER@example.com",
        password: "another-strong-password-123"
      })
    }
  )
  const duplicatePayload = await duplicateResponse.json()

  assert.equal(duplicateResponse.status, 409)
  assert.equal(duplicatePayload.errorCode, "EMAIL_TAKEN")

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

test("sign-in returns a session and account progress persists across server restart", async (t) => {
  const previousAccountStoreFile = process.env.ACCOUNT_STORE_FILE
  const previousAccountProgressFile = process.env.ACCOUNT_PROGRESS_FILE
  const uniqueSuffix = `${Date.now()}-persist`
  process.env.ACCOUNT_STORE_FILE = join(
    tmpdir(),
    `deepmlsr-accounts-${uniqueSuffix}.json`
  )
  process.env.ACCOUNT_PROGRESS_FILE = join(
    tmpdir(),
    `deepmlsr-account-progress-${uniqueSuffix}.json`
  )

  const firstServer = await startServer({ port: 0 })
  let firstServerClosed = false

  const restoreEnvironment = () => {
    if (previousAccountStoreFile === undefined) {
      delete process.env.ACCOUNT_STORE_FILE
    } else {
      process.env.ACCOUNT_STORE_FILE = previousAccountStoreFile
    }

    if (previousAccountProgressFile === undefined) {
      delete process.env.ACCOUNT_PROGRESS_FILE
    } else {
      process.env.ACCOUNT_PROGRESS_FILE = previousAccountProgressFile
    }
  }

  t.after(async () => {
    restoreEnvironment()
    if (!firstServerClosed) {
      await firstServer.close()
    }
  })

  const createResponse = await fetch(
    `http://127.0.0.1:${firstServer.port}/api/auth/create-account`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: "persisted-user@example.com",
        password: "strong-password-123"
      })
    }
  )
  const createPayload = await createResponse.json()
  assert.equal(createResponse.status, 201)

  const firstSessionToken = String(createPayload.session?.sessionToken ?? "")
  assert.equal(firstSessionToken.length > 10, true)

  const initialProgressResponse = await fetch(
    `http://127.0.0.1:${firstServer.port}/api/progress/account`,
    {
      headers: {
        authorization: `Bearer ${firstSessionToken}`
      }
    }
  )
  const initialProgress = await initialProgressResponse.json()
  assert.equal(initialProgressResponse.status, 200)
  assert.deepEqual(initialProgress.completedProblemIds, [])

  const saveProgressResponse = await fetch(
    `http://127.0.0.1:${firstServer.port}/api/progress/account`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${firstSessionToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        version: 1,
        completedProblemIds: ["attention_scaled_dot_product_v1"],
        attemptHistory: [
          {
            problemId: "attention_scaled_dot_product_v1",
            correctness: "pass",
            submittedAt: "2026-02-17T16:00:00.000Z"
          }
        ]
      })
    }
  )
  assert.equal(saveProgressResponse.status, 200)

  await firstServer.close()
  firstServerClosed = true
  const secondServer = await startServer({ port: 0 })
  t.after(async () => {
    await secondServer.close()
  })

  const signInResponse = await fetch(
    `http://127.0.0.1:${secondServer.port}/api/auth/sign-in`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: "persisted-user@example.com",
        password: "strong-password-123"
      })
    }
  )
  const signInPayload = await signInResponse.json()
  assert.equal(signInResponse.status, 200)
  const secondSessionToken = String(signInPayload.session?.sessionToken ?? "")
  assert.equal(secondSessionToken.length > 10, true)

  const savedProgressResponse = await fetch(
    `http://127.0.0.1:${secondServer.port}/api/progress/account`,
    {
      headers: {
        authorization: `Bearer ${secondSessionToken}`
      }
    }
  )
  const savedProgress = await savedProgressResponse.json()
  assert.equal(savedProgressResponse.status, 200)
  assert.equal(
    savedProgress.completedProblemIds.includes("attention_scaled_dot_product_v1"),
    true
  )
  assert.equal(Array.isArray(savedProgress.attemptHistory), true)
  assert.equal(savedProgress.attemptHistory.length, 1)
})
