import assert from "node:assert/strict"
import test from "node:test"

import { resolvePort, startServer } from "../src/backend/server.js"

test("resolvePort uses default when PORT is empty", () => {
  assert.equal(resolvePort(undefined), 3000)
  assert.equal(resolvePort(""), 3000)
})

test("resolvePort rejects invalid values", () => {
  assert.throws(() => {
    resolvePort("not-a-number")
  })
})

test("single start entrypoint serves health API and editor-first workspace", async (t) => {
  const startedServer = await startServer({ port: 0 })

  t.after(async () => {
    await startedServer.close()
  })

  const healthResponse = await fetch(
    `http://127.0.0.1:${startedServer.port}/health`
  )
  const healthPayload = await healthResponse.json()

  assert.equal(healthResponse.status, 200)
  assert.deepEqual(healthPayload, { ok: true })

  const rootResponse = await fetch(`http://127.0.0.1:${startedServer.port}/`)
  const rootHtml = await rootResponse.text()

  assert.equal(rootResponse.status, 200)
  assert.equal(rootResponse.headers.get("content-type")?.includes("text/html"), true)
  assert.equal(rootHtml.includes("problem-workspace"), true)
  assert.equal(rootHtml.includes("workspace-grid"), true)
  assert.equal(rootHtml.includes("Implement Scaled Dot-Product Attention"), true)
  assert.equal(rootHtml.includes("Run"), true)
  assert.equal(rootHtml.includes("Submit"), true)
  assert.equal(rootHtml.includes("data-theme=\"deepmlsr-workspace\""), true)
  assert.equal(rootHtml.includes("@media (max-width: 920px)"), true)
  assert.equal(rootHtml.includes("code-editor-shell"), true)
  assert.equal(rootHtml.includes("starter-code-editor"), true)
  assert.equal(rootHtml.includes("starter-code-highlight"), true)
  assert.equal(rootHtml.includes("import numpy as np"), true)
  assert.equal(rootHtml.includes("import torch"), false)
  assert.equal(rootHtml.includes("import pandas as pd"), false)
  assert.equal(rootHtml.includes(".token-keyword"), true)
  assert.equal(rootHtml.includes("Session status"), true)
  assert.equal(rootHtml.includes("/api/runtime/run"), true)
  assert.equal(rootHtml.includes("/api/session/submit"), true)
  assert.equal(rootHtml.includes("/api/scheduler/decision"), true)
  assert.equal(rootHtml.includes("hint-tier-1-button"), true)
  assert.equal(rootHtml.includes("hint-tier-2-button"), true)
  assert.equal(rootHtml.includes("hint-tier-3-button"), true)
  assert.equal(rootHtml.includes("schedule-status"), true)
  assert.equal(rootHtml.includes("Concept Background"), true)
  assert.equal(rootHtml.includes("Input Shape And Constraints"), true)
  assert.equal(rootHtml.includes("Expected Outputs And Evaluation"), true)
  assert.equal(rootHtml.includes("Formulas"), true)
  assert.equal(rootHtml.includes("<math"), true)
  assert.equal(rootHtml.includes('encoding="application/x-tex"'), true)
  assert.equal(rootHtml.includes("$$\\mathrm{scores}"), false)
  assert.equal(rootHtml.includes("Visible Test Cases"), true)
  assert.equal(rootHtml.includes("Case 1 - Balanced Tokens"), true)
  assert.equal(rootHtml.includes("visible-test-cases-panel"), true)
  assert.equal(rootHtml.includes("test-case-tabs"), true)
  assert.equal(rootHtml.includes("test-case-tab-case_1_balanced_tokens"), true)
  assert.equal(rootHtml.includes("test-case-status-case_1_balanced_tokens"), true)
  assert.equal(rootHtml.includes("test-case-panel-case_1_balanced_tokens"), true)
  assert.equal(rootHtml.includes("Primary Papers"), true)
  assert.equal(rootHtml.includes("https://arxiv.org/abs/1706.03762"), true)
  assert.equal(rootHtml.includes("key !== \"Tab\""), true)
  assert.equal(rootHtml.includes("debug-shell-output"), true)
  assert.equal(rootHtml.includes("Run as many times as needed before submit"), true)
  assert.equal(rootHtml.includes("$ run #"), true)
  assert.equal(
    rootHtml.indexOf("debug-shell-output") < rootHtml.indexOf("run-status"),
    true
  )
  assert.equal(
    rootHtml.indexOf("debug-shell-output") < rootHtml.indexOf("visible-test-cases-panel"),
    true
  )
  assert.equal(
    rootHtml.indexOf("visible-test-cases-panel") < rootHtml.indexOf("run-status"),
    true
  )
  assert.equal(rootHtml.includes("start-problem-button"), true)
  assert.equal(rootHtml.includes("session-timer-status"), true)
  assert.equal(rootHtml.includes("timer-cap-message"), true)
  assert.equal(
    rootHtml.includes("Timer starts when you click Start Problem or type your first character."),
    true
  )
  assert.equal(rootHtml.includes("30-minute cap reached"), true)
  assert.equal(rootHtml.includes("workspace-tab-problem"), true)
  assert.equal(rootHtml.includes("workspace-tab-library"), true)
  assert.equal(rootHtml.includes("Question Bank"), true)
  assert.equal(rootHtml.includes("workspace-problem-tab-panel"), true)
  assert.equal(rootHtml.includes("workspace-library-tab-panel"), true)
  assert.equal(rootHtml.includes("workspace-library-tab-panel\" hidden"), true)
  assert.equal(rootHtml.includes("Question Library"), true)
  assert.equal(rootHtml.includes("question-search-input"), true)
  assert.equal(rootHtml.includes("question-type-filter"), true)
  assert.equal(rootHtml.includes("Suggest a Topic"), true)
  assert.equal(rootHtml.includes("suggest-topic-modal"), true)
  assert.equal(rootHtml.includes("suggest-topic-form"), true)
  assert.equal(rootHtml.includes("suggest-topic-title"), true)
  assert.equal(rootHtml.includes("suggest-topic-problem-type"), true)
  assert.equal(rootHtml.includes("suggest-topic-learning-objective"), true)
  assert.equal(rootHtml.includes("suggest-topic-input-spec"), true)
  assert.equal(rootHtml.includes("suggest-topic-output-spec"), true)
  assert.equal(rootHtml.includes("suggest-topic-starter-signature"), true)
  assert.equal(rootHtml.includes("Submit Topic"), true)
  assert.equal(rootHtml.includes("Showing 11 of 11 questions."), true)
  assert.equal(rootHtml.includes("Implement LayerNorm Forward Pass"), true)
  assert.equal(rootHtml.includes("conditioning_film_affine_shift_scale_v1"), true)
})
