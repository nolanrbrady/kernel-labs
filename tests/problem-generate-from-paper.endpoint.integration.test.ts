import assert from "node:assert/strict"
import test from "node:test"

import { startServer } from "../src/backend/server.js"
import { getSeedProblemPack } from "../src/problems/seed-problem-pack.js"
import { getRuntimeProblemFixture } from "../src/problems/runtime-problem-fixtures.js"
import { getReferencePythonSolution } from "../src/problems/reference-python-solutions.js"

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

test("generate-from-paper endpoint iterates and improves candidate quality using validation feedback", async (t) => {
  const startedServer = await startServer({ port: 0 })

  const originalApiKey = process.env.ANTHROPIC_API_KEY
  process.env.ANTHROPIC_API_KEY = "test-api-key"

  const seedProblem = clone(getSeedProblemPack()[0])
  const fixture = getRuntimeProblemFixture(seedProblem.id)
  const referenceSolution = getReferencePythonSolution(seedProblem.id)
  assert.notEqual(fixture, null)
  assert.notEqual(referenceSolution, null)

  const firstAttempt = {
    problem_spec: {
      ...seedProblem,
      evaluation_artifacts: {
        ...seedProblem.evaluation_artifacts,
        hidden_tests: []
      }
    },
    runtime_fixture: fixture,
    reference_solution: referenceSolution,
    refinement_notes: "first attempt"
  }

  const secondAttempt = {
    problem_spec: seedProblem,
    runtime_fixture: fixture,
    reference_solution: referenceSolution,
    refinement_notes: "fixed hidden tests"
  }

  const originalFetch = globalThis.fetch
  let anthropicCalls = 0
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (url.startsWith(`http://127.0.0.1:${startedServer.port}`)) {
      return originalFetch(input, init)
    }

    if (url === "https://papers.example/attention-note") {
      return new Response(
        "Scaled dot-product attention computes scores, softmax weights, and value mixing.",
        {
          status: 200,
          headers: {
            "content-type": "text/plain"
          }
        }
      )
    }

    if (url === "https://api.anthropic.com/v1/messages") {
      anthropicCalls += 1
      const parsedBody =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as {
              system?: string
              messages?: Array<{ content?: string }>
            })
          : {}
      assert.equal(
        (parsedBody.system ?? "").includes("Prefer concise rubric wording."),
        true
      )
      assert.equal(
        (parsedBody.messages?.[0]?.content ?? "").includes("Include one metamorphic edge case."),
        true
      )
      const payload = anthropicCalls === 1 ? firstAttempt : secondAttempt
      return new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify(payload)
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    }

    throw new Error(`Unexpected fetch URL in test: ${url}`)
  }) as typeof globalThis.fetch

  t.after(async () => {
    globalThis.fetch = originalFetch
    process.env.ANTHROPIC_API_KEY = originalApiKey
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/problems/generate-from-paper`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        paperLinks: ["https://papers.example/attention-note"],
        targetDescription: "Transformer attention block core",
        maxIterations: 3,
        promptPatch: {
          system: "Prefer concise rubric wording.",
          user: "Include one metamorphic edge case."
        }
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "ok")
  assert.equal(anthropicCalls, 2)
  assert.equal(payload.generation.iterations.length, 2)
  assert.equal(payload.generation.iterations[0].verification.status, "rejected")
  assert.equal(payload.generation.iterations[1].verification.status, "verified")
  assert.equal(payload.generation.best.verification.status, "verified")
})

test("generate-from-paper endpoint accepts inline PDF payloads", async (t) => {
  const startedServer = await startServer({ port: 0 })

  const originalApiKey = process.env.ANTHROPIC_API_KEY
  process.env.ANTHROPIC_API_KEY = "test-api-key"

  const seedProblem = clone(getSeedProblemPack()[0])
  const fixture = getRuntimeProblemFixture(seedProblem.id)
  const referenceSolution = getReferencePythonSolution(seedProblem.id)
  assert.notEqual(fixture, null)
  assert.notEqual(referenceSolution, null)

  const candidate = {
    problem_spec: seedProblem,
    runtime_fixture: fixture,
    reference_solution: referenceSolution,
    refinement_notes: "single-pass valid candidate"
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (url.startsWith(`http://127.0.0.1:${startedServer.port}`)) {
      return originalFetch(input, init)
    }

    if (url === "https://api.anthropic.com/v1/messages") {
      return new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify(candidate)
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    }

    throw new Error(`Unexpected fetch URL in test: ${url}`)
  }) as typeof globalThis.fetch

  t.after(async () => {
    globalThis.fetch = originalFetch
    process.env.ANTHROPIC_API_KEY = originalApiKey
    await startedServer.close()
  })

  const response = await fetch(
    `http://127.0.0.1:${startedServer.port}/api/problems/generate-from-paper`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        paperPdfs: [
          {
            filename: "attention_notes.pdf",
            dataBase64: Buffer.from(
              "Toy text fallback payload for PDF ingestion in tests."
            ).toString("base64")
          }
        ],
        targetDescription: "Attention implementation target",
        maxIterations: 1
      })
    }
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, "ok")
  assert.equal(payload.generation.sourceSummaries.length, 1)
  assert.equal(payload.generation.sourceSummaries[0].sourceType, "inline_pdf")
  assert.equal(payload.generation.best.verification.status, "verified")
})
