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
  const base = `http://127.0.0.1:${startedServer.port}`

  t.after(async () => {
    await startedServer.close()
  })

  const healthResponse = await fetch(`${base}/health`)
  const healthPayload = await healthResponse.json()

  assert.equal(healthResponse.status, 200)
  assert.deepEqual(healthPayload, { ok: true })

  const rootResponse = await fetch(`${base}/`)
  const rootHtml = await rootResponse.text()

  assert.equal(rootResponse.status, 200)
  assert.equal(rootResponse.headers.get("content-type")?.includes("text/html"), true)

  // HTML document references external static assets
  assert.equal(rootHtml.includes('href="/static/problem-workspace.css?v='), true)
  assert.equal(rootHtml.includes('type="module" src="/static/problem-workspace-client.js?v='), true)
  assert.equal(rootHtml.includes('src="/static/problem-workspace-client.js?v='), true)
  assert.equal(rootHtml.includes("data-theme=\"deepmlsr-workspace\""), true)

  // React-rendered workspace markup
  assert.equal(rootHtml.includes("problem-workspace"), true)
  assert.equal(rootHtml.includes("workspace-grid"), true)
  assert.equal(rootHtml.includes("Implement Scaled Dot-Product Attention"), true)
  assert.equal(rootHtml.includes("Run"), true)
  assert.equal(rootHtml.includes("Submit"), true)
  assert.equal(rootHtml.includes("code-editor-shell"), true)
  assert.equal(rootHtml.includes("starter-code-editor"), true)
  assert.equal(rootHtml.includes("starter-code-highlight"), true)
  assert.equal(rootHtml.includes("import numpy as np"), true)
  assert.equal(rootHtml.includes("import torch"), false)
  assert.equal(rootHtml.includes("import pandas as pd"), false)
  assert.equal(rootHtml.includes("Session status"), true)
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
  assert.equal(rootHtml.includes("debug-shell-output"), true)
  assert.equal(rootHtml.includes("Run as many times as needed before submit"), true)
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

  // Static CSS is served with correct content-type and contains theme rules
  const cssResponse = await fetch(`${base}/static/problem-workspace.css`)
  assert.equal(cssResponse.status, 200)
  assert.equal(cssResponse.headers.get("content-type")?.includes("text/css"), true)
  const cssText = await cssResponse.text()
  assert.equal(cssText.includes("@media (max-width: 1024px)"), true)
  assert.equal(cssText.includes(".token-keyword"), true)
  assert.equal(cssText.includes("--bg-base"), true)

  // Static JS is served with correct content-type and contains client logic
  const jsResponse = await fetch(`${base}/static/problem-workspace-client.js`)
  assert.equal(jsResponse.status, 200)
  assert.equal(jsResponse.headers.get("content-type")?.includes("javascript"), true)
  const jsText = await jsResponse.text()
  assert.equal(jsText.includes("initializeProblemWorkspaceClient"), true)
  assert.equal(jsText.includes("from \"./problem-workspace-client-domain.js\""), true)
  assert.equal(jsText.includes("from \"./problem-workspace-client-controllers.js\""), true)
  assert.equal(jsText.includes("new SessionController"), true)
  assert.equal(jsText.includes("new SubmissionController"), true)
  assert.equal(jsText.includes("submissionController.submitSession(\"timer-cap\")"), true)

  const domainResponse = await fetch(`${base}/static/problem-workspace-client-domain.js`)
  assert.equal(domainResponse.status, 200)
  assert.equal(domainResponse.headers.get("content-type")?.includes("javascript"), true)
  const domainText = await domainResponse.text()
  assert.equal(domainText.includes("class QuestionCatalog"), true)
  assert.equal(domainText.includes("class VisibleTestCaseTracker"), true)
  assert.equal(domainText.includes("class AnonymousProgressStore"), true)

  const controllerResponse = await fetch(`${base}/static/problem-workspace-client-controllers.js`)
  assert.equal(controllerResponse.status, 200)
  assert.equal(controllerResponse.headers.get("content-type")?.includes("javascript"), true)
  const controllerText = await controllerResponse.text()
  assert.equal(controllerText.includes("export { EditorController }"), true)

  const sharedControllerResponse = await fetch(`${base}/static/problem-workspace-client-controller-shared.js`)
  assert.equal(sharedControllerResponse.status, 200)
  assert.equal(sharedControllerResponse.headers.get("content-type")?.includes("javascript"), true)
  const sharedControllerText = await sharedControllerResponse.text()
  assert.equal(sharedControllerText.includes("function setClassFlag"), true)
  assert.equal(sharedControllerText.includes("export { setText"), true)
  assert.equal(sharedControllerText.includes("setClassFlag"), true)

  const editorControllerResponse = await fetch(`${base}/static/problem-workspace-client-editor-controller.js`)
  assert.equal(editorControllerResponse.status, 200)
  assert.equal(editorControllerResponse.headers.get("content-type")?.includes("javascript"), true)
  const editorControllerText = await editorControllerResponse.text()
  assert.equal(editorControllerText.includes("class EditorController"), true)
  assert.equal(editorControllerText.includes("key !== \"Tab\""), true)

  const workspaceControllersResponse = await fetch(`${base}/static/problem-workspace-client-workspace-controllers.js`)
  assert.equal(workspaceControllersResponse.status, 200)
  assert.equal(workspaceControllersResponse.headers.get("content-type")?.includes("javascript"), true)
  const workspaceControllersText = await workspaceControllersResponse.text()
  assert.equal(workspaceControllersText.includes("class QuestionLibraryController"), true)
  assert.equal(workspaceControllersText.includes("class VisibleTestCaseController"), true)

  const sessionControllersResponse = await fetch(`${base}/static/problem-workspace-client-session-controllers.js`)
  assert.equal(sessionControllersResponse.status, 200)
  assert.equal(sessionControllersResponse.headers.get("content-type")?.includes("javascript"), true)
  const sessionControllersText = await sessionControllersResponse.text()
  assert.equal(sessionControllersText.includes("createWorkspaceApiAdapters"), true)
  assert.equal(sessionControllersText.includes("/api/runtime/run"), true)
  assert.equal(sessionControllersText.includes("/api/session/submit"), true)
  assert.equal(sessionControllersText.includes("/api/scheduler/decision"), true)
  assert.equal(sessionControllersText.includes("$ run #"), true)
  assert.equal(sessionControllersText.includes("30-minute cap reached"), true)

  const topicControllerResponse = await fetch(`${base}/static/problem-workspace-client-topic-controller.js`)
  assert.equal(topicControllerResponse.status, 200)
  assert.equal(topicControllerResponse.headers.get("content-type")?.includes("javascript"), true)
  const topicControllerText = await topicControllerResponse.text()
  assert.equal(topicControllerText.includes("class SuggestTopicController"), true)
})
