import assert from "node:assert/strict"
import test from "node:test"

import { getRuntimeProblemFixture } from "../src/problems/runtime-problem-fixtures.js"
import { startServer } from "../src/backend/server.js"

const CORRECT_ATTENTION_CODE = `
def scaled_dot_product_attention(q, k, v, mask=None):
    import numpy as np
    scores = (q @ k.T) / np.sqrt(k.shape[-1])
    if mask is not None:
        scores = scores + mask
    weights = np.exp(scores - np.max(scores, axis=-1, keepdims=True))
    weights = weights / np.sum(weights, axis=-1, keepdims=True)
    return weights @ v
`

test("runtime run endpoint executes submitted code on deterministic input", async (t) => {
  const startedServer = await startServer({ port: 0 })
  const fixture = getRuntimeProblemFixture("attention_scaled_dot_product_v1")

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/runtime/run`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        problemId: "attention_scaled_dot_product_v1",
        userCode: CORRECT_ATTENTION_CODE
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "success")

  if (payload.status === "success") {
    assert.equal(payload.problemId, "attention_scaled_dot_product_v1")
    assert.equal(Array.isArray(payload.inputs.q), true)
    assert.equal(Array.isArray(payload.output), true)
    assert.deepEqual(payload.output, fixture?.expectedOutput)
    assert.equal(Array.isArray(payload.testCaseResults), true)
    assert.equal(payload.testCaseResults.length > 0, true)
    assert.equal(
      (payload.testCaseResults as Array<{ passed: boolean }>).every((entry) => {
        return entry.passed
      }),
      true
    )
    assert.equal(typeof payload.runtimeStdout, "string")
    assert.equal(Array.isArray(payload.preloadedPackages), true)
    assert.equal(payload.preloadedPackages.includes("numpy"), true)
    assert.equal(payload.message.includes("Run complete"), true)

    const evaluatorResponse = await fetch(
      `http://127.0.0.1:${startedServer.port}/api/evaluator/evaluate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          problemId: "attention_scaled_dot_product_v1",
          candidateOutput: payload.output
        })
      }
    )
    const evaluatorPayload = await evaluatorResponse.json()

    assert.equal(evaluatorResponse.status, 200)
    assert.equal(evaluatorPayload.correctness, "pass")
  }
})

test("runtime + evaluator mark incorrect attention implementation as fail", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

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
          "def scaled_dot_product_attention(q, k, v, mask=None):\n    return q @ k.T"
      })
    }
  )
  const runtimePayload = await runtimeResponse.json()

  assert.equal(runtimeResponse.status, 200)
  assert.equal(runtimePayload.status, "success")

  if (runtimePayload.status === "success") {
    assert.equal(
      (runtimePayload.testCaseResults as Array<{ passed: boolean }>).some(
        (entry) => {
          return entry.passed === false
        }
      ),
      true
    )
    const evaluatorResponse = await fetch(
      `http://127.0.0.1:${startedServer.port}/api/evaluator/evaluate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          problemId: "attention_scaled_dot_product_v1",
          candidateOutput: runtimePayload.output
        })
      }
    )
    const evaluatorPayload = await evaluatorResponse.json()

    assert.equal(evaluatorResponse.status, 200)
    assert.equal(evaluatorPayload.correctness, "fail")
  }
})

test("runtime run endpoint returns supportive failure on execution error", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/runtime/run`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        problemId: "attention_scaled_dot_product_v1",
        userCode:
          "def scaled_dot_product_attention(q, k, v, mask=None):\n    raise RuntimeError('boom')"
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "failure")

  if (payload.status === "failure") {
    assert.equal(payload.errorCode, "EXECUTION_ERROR")
    assert.equal(payload.supportiveTone, true)
    assert.equal(payload.actionableSteps.length > 0, true)
    assert.equal(Array.isArray(payload.preloadedPackages), true)
  }
})

test("runtime run endpoint failure payload includes captured stdout", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/runtime/run`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        problemId: "attention_scaled_dot_product_v1",
        userCode:
          "def scaled_dot_product_attention(q, k, v, mask=None):\n    print('debug-line')\n    raise RuntimeError('boom')"
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "failure")

  if (payload.status === "failure") {
    assert.equal(typeof payload.runtimeStdout, "string")
    assert.equal(payload.runtimeStdout.includes("debug-line"), true)
    assert.equal(Array.isArray(payload.preloadedPackages), true)
    assert.equal(payload.preloadedPackages.includes("numpy"), true)
  }
})
