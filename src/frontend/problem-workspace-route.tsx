import { type ReactElement } from "react"
import katex from "katex"

export type QuestionLibraryItem = {
  id: string
  title: string
  problemType: string
  summary: string
  estimatedMinutes: number
}

export type WorkspaceProblem = {
  id: string
  title: string
  starterCode: string
  category?: string
  goal?: string
  conceptDescription?: string
  inputSpecification?: string
  expectedOutputSpecification?: string
  formulaNotes?: string[]
  architectureUses?: string[]
  evaluationChecklist?: string[]
  visibleTestCases?: Array<{
    id?: string
    name: string
    inputSummary: string
    expectedOutputSummary: string
    reasoning?: string
  }>
  paperLinks?: Array<{
    title: string
    url: string
    note?: string
  }>
  questionCatalog?: QuestionLibraryItem[]
  hints?: {
    tier1: string
    tier2: string
    tier3: string
  }
}

export type EditorFirstLandingRoute = {
  path: "/"
  requiresAuth: false
  screen: "problem-workspace"
  primaryActions: ["run", "submit"]
  accountCallToAction: string
  accountCallToActionPath: "/auth/create-account"
  accountCallToActionOptional: true
  problem: WorkspaceProblem
}

export function createEditorFirstLandingRoute(
  problem: WorkspaceProblem
): EditorFirstLandingRoute {
  return {
    path: "/",
    requiresAuth: false,
    screen: "problem-workspace",
    primaryActions: ["run", "submit"],
    accountCallToAction: "Create an account to save progress",
    accountCallToActionPath: "/auth/create-account",
    accountCallToActionOptional: true,
    problem
  }
}

function renderFormulaMathml(expression: string): string {
  return katex.renderToString(expression, {
    displayMode: true,
    output: "mathml",
    throwOnError: false,
    strict: "ignore"
  })
}

function toStableCaseId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function getProblemWorkspaceThemeCss(): string {
  return `
:root {
  --bg-deep: #071423;
  --bg-panel: #101f31;
  --bg-panel-muted: #15283f;
  --line-soft: rgba(160, 187, 210, 0.2);
  --text-main: #e7f2ff;
  --text-muted: #a7bfd6;
  --accent-run: #22b573;
  --accent-submit: #f5b443;
  --accent-link: #78d8ff;
  --shadow-soft: 0 14px 42px rgba(2, 6, 11, 0.28);
  --font-display: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  --font-code: "IBM Plex Mono", "SFMono-Regular", Menlo, monospace;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--text-main);
  font-family: var(--font-display);
  background:
    radial-gradient(circle at 8% -4%, rgba(120, 216, 255, 0.18), transparent 38%),
    radial-gradient(circle at 96% 4%, rgba(245, 180, 67, 0.11), transparent 28%),
    linear-gradient(160deg, #050f1a, var(--bg-deep));
}

.workspace-shell {
  width: min(1180px, 100% - 2rem);
  margin: 1.2rem auto 2.4rem;
  display: grid;
  gap: 1rem;
  animation: shell-rise 180ms ease-out;
}

.workspace-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  padding: 0.75rem 1rem;
  background: rgba(7, 20, 35, 0.7);
  backdrop-filter: blur(6px);
}

.workspace-brand {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.account-cta {
  color: var(--accent-link);
  text-decoration: none;
  font-size: 0.92rem;
}

.workspace-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(240px, 0.92fr) minmax(0, 1.08fr);
  align-items: start;
}

.workspace-card {
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: linear-gradient(160deg, var(--bg-panel), var(--bg-panel-muted));
  box-shadow: var(--shadow-soft);
}

.problem-panel {
  padding: 1rem;
  display: grid;
  gap: 1rem;
  align-content: start;
}

.problem-eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.problem-title {
  margin: 0.15rem 0 0;
  font-size: clamp(1.15rem, 2.2vw, 1.5rem);
  line-height: 1.25;
}

.problem-goal {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.55;
}

.problem-session-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  border: 1px solid rgba(120, 216, 255, 0.22);
  border-radius: 10px;
  padding: 0.52rem 0.62rem;
  background: rgba(11, 32, 52, 0.58);
}

.session-timer-status {
  margin: 0;
  color: #d4e8fa;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
}

.start-problem-button {
  border: 1px solid rgba(120, 216, 255, 0.35);
  border-radius: 8px;
  padding: 0.36rem 0.62rem;
  font-family: inherit;
  font-size: 0.76rem;
  color: #dff4ff;
  background: rgba(16, 62, 98, 0.48);
  cursor: pointer;
}

.timer-cap-message {
  margin: 0;
  color: #a9c9e6;
  font-size: 0.78rem;
}

.workspace-tab-strip {
  display: flex;
  align-items: center;
  gap: 0.42rem;
}

.workspace-tab {
  border: 1px solid rgba(120, 216, 255, 0.24);
  border-radius: 999px;
  padding: 0.32rem 0.68rem;
  font-family: inherit;
  font-size: 0.75rem;
  color: #bdd8ef;
  background: rgba(9, 30, 50, 0.45);
  cursor: pointer;
}

.workspace-tab.is-active {
  border-color: rgba(120, 216, 255, 0.46);
  color: #e8f5ff;
  background: rgba(20, 68, 106, 0.52);
}

.workspace-tab-panel {
  display: grid;
  gap: 0.72rem;
}

.workspace-tab-panel[hidden] {
  display: none;
}

.question-library {
  border: 1px solid rgba(120, 216, 255, 0.24);
  border-radius: 12px;
  padding: 0.85rem;
  background: rgba(13, 35, 58, 0.55);
  display: grid;
  gap: 0.6rem;
}

.question-library-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
}

.question-library-header h2 {
  margin: 0;
  font-size: 0.93rem;
}

.question-library-count {
  margin: 0;
  color: #a8c7e4;
  font-size: 0.76rem;
}

.question-library-controls {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr) auto;
}

.question-library-controls input,
.question-library-controls select {
  width: 100%;
  border: 1px solid rgba(119, 147, 174, 0.36);
  border-radius: 8px;
  background: rgba(8, 23, 39, 0.72);
  color: #d8eaff;
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.45rem 0.55rem;
}

.suggest-topic-button {
  border: 1px solid rgba(120, 216, 255, 0.35);
  border-radius: 8px;
  padding: 0.45rem 0.68rem;
  font-family: inherit;
  font-size: 0.78rem;
  color: #dff4ff;
  background: rgba(16, 62, 98, 0.48);
  cursor: pointer;
}

.suggest-topic-status {
  margin: 0;
  color: #b7d4ec;
  font-size: 0.76rem;
}

.suggest-topic-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(3, 10, 17, 0.7);
  backdrop-filter: blur(4px);
}

.suggest-topic-modal[hidden] {
  display: none;
}

.suggest-topic-dialog {
  width: min(880px, 100%);
  max-height: min(88vh, 920px);
  overflow: auto;
  border: 1px solid rgba(120, 216, 255, 0.32);
  border-radius: 14px;
  padding: 0.9rem;
  background: linear-gradient(170deg, #0c1f33, #0f2943);
  box-shadow: 0 18px 44px rgba(2, 8, 14, 0.45);
  display: grid;
  gap: 0.7rem;
}

.suggest-topic-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.suggest-topic-modal-header h3 {
  margin: 0;
  font-size: 0.98rem;
}

.suggest-topic-close-button {
  border: 1px solid rgba(120, 216, 255, 0.28);
  border-radius: 8px;
  padding: 0.35rem 0.55rem;
  font-family: inherit;
  font-size: 0.78rem;
  color: #dff4ff;
  background: rgba(12, 45, 74, 0.62);
  cursor: pointer;
}

.suggest-topic-modal-copy {
  margin: 0;
  color: #bfd8ef;
  font-size: 0.8rem;
  line-height: 1.45;
}

.suggest-topic-form {
  display: grid;
  gap: 0.62rem;
}

.suggest-topic-field {
  display: grid;
  gap: 0.28rem;
}

.suggest-topic-field-label {
  color: #d9ecfb;
  font-size: 0.78rem;
  font-weight: 550;
}

.suggest-topic-form input,
.suggest-topic-form select,
.suggest-topic-form textarea {
  width: 100%;
  border: 1px solid rgba(120, 216, 255, 0.26);
  border-radius: 8px;
  padding: 0.45rem 0.5rem;
  font-family: inherit;
  font-size: 0.8rem;
  color: #e4f3ff;
  background: rgba(6, 20, 34, 0.74);
}

.suggest-topic-form textarea {
  resize: vertical;
  min-height: 68px;
}

.suggest-topic-modal-feedback {
  margin: 0;
  color: #a9c9e6;
  font-size: 0.77rem;
}

.suggest-topic-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.suggest-topic-cancel-button,
.suggest-topic-submit-button {
  border-radius: 9px;
  padding: 0.42rem 0.68rem;
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.suggest-topic-cancel-button {
  border: 1px solid rgba(120, 216, 255, 0.28);
  color: #d8efff;
  background: rgba(12, 45, 74, 0.62);
}

.suggest-topic-submit-button {
  border: 1px solid rgba(34, 181, 115, 0.6);
  color: #eafcf3;
  background: rgba(18, 104, 66, 0.72);
}

.question-library-results {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.4rem;
}

.question-library-item {
  color: #d6e8f8;
  line-height: 1.4;
}

.question-library-item-title {
  color: #eef8ff;
  font-size: 0.82rem;
}

.question-library-item-meta {
  color: #9cc0df;
  font-size: 0.76rem;
}

.hint-panel {
  border: 1px solid rgba(120, 216, 255, 0.24);
  border-radius: 12px;
  padding: 0.85rem;
  background: rgba(13, 35, 58, 0.55);
}

.hint-panel h2 {
  margin: 0 0 0.55rem;
  font-size: 0.93rem;
}

.hint-panel p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.hint-controls {
  margin-top: 0.7rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hint-controls button {
  border: 1px solid rgba(120, 216, 255, 0.3);
  border-radius: 9px;
  padding: 0.4rem 0.62rem;
  font-family: inherit;
  font-size: 0.78rem;
  color: #d8efff;
  background: rgba(16, 48, 77, 0.45);
  cursor: pointer;
}

.hint-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.hint-status {
  margin-top: 0.7rem;
  margin-bottom: 0;
  font-size: 0.82rem;
  color: #c5dcf0;
}

.hint-tier-list {
  margin: 0.55rem 0 0;
  padding-left: 1.15rem;
  display: grid;
  gap: 0.4rem;
}

.hint-tier-item {
  color: #cde3f7;
  font-size: 0.84rem;
}

.problem-context {
  display: grid;
  gap: 0.6rem;
}

.context-item {
  border: 1px solid rgba(120, 216, 255, 0.2);
  border-radius: 10px;
  background: rgba(10, 30, 49, 0.48);
  overflow: hidden;
}

.context-item summary {
  cursor: pointer;
  list-style: none;
  padding: 0.7rem 0.8rem;
  font-size: 0.84rem;
  color: #d8ebfb;
  font-weight: 550;
}

.context-item summary::-webkit-details-marker {
  display: none;
}

.context-body {
  padding: 0 0.8rem 0.78rem;
  color: #bcd3e9;
  font-size: 0.82rem;
  line-height: 1.5;
}

.context-body p {
  margin: 0;
}

.context-list {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.32rem;
}

.formula-list {
  display: grid;
  gap: 0.45rem;
}

.formula-expression {
  margin: 0;
  border: 1px solid rgba(120, 216, 255, 0.2);
  border-radius: 9px;
  padding: 0.48rem 0.58rem;
  background: rgba(8, 24, 40, 0.6);
  color: #e6f4ff;
  line-height: 1.4;
  overflow-x: auto;
}

.formula-expression math {
  display: block;
  width: max-content;
  min-width: 100%;
  font-size: 1rem;
}

.paper-link {
  color: #8fe2ff;
  text-decoration: none;
}

.paper-link:hover,
.paper-link:focus-visible {
  text-decoration: underline;
}

.editor-panel {
  padding: 0.82rem;
  display: grid;
  gap: 0.56rem;
  align-content: start;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.editor-header h2 {
  margin: 0;
  font-size: 1.05rem;
}

.problem-chip {
  border-radius: 999px;
  border: 1px solid rgba(245, 180, 67, 0.32);
  padding: 0.22rem 0.7rem;
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #ffe3ac;
  background: rgba(61, 43, 9, 0.35);
}

.code-editor-shell {
  position: relative;
  display: grid;
  border-radius: 12px;
  border: 1px solid rgba(119, 147, 174, 0.34);
  background: #0b1624;
  overflow: hidden;
}

.code-editor-highlight,
.code-editor {
  margin: 0;
  padding: 0.74rem;
  font-family: var(--font-code);
  font-size: 0.86rem;
  line-height: 1.6;
  white-space: pre;
  tab-size: 2;
  width: 100%;
  min-height: 165px;
  grid-area: 1 / 1;
}

.code-editor-highlight {
  pointer-events: none;
  overflow: hidden;
  color: #d8e8f7;
}

.code-editor-highlight code {
  display: block;
}

.code-editor-highlight .token-keyword {
  color: #78d8ff;
}

.code-editor-highlight .token-string {
  color: #f5d08f;
}

.code-editor-highlight .token-comment {
  color: #7fa0bf;
}

.code-editor-highlight .token-number {
  color: #9de3a8;
}

.code-editor-highlight .token-builtin {
  color: #c4a8ff;
}

textarea.code-editor {
  border: 0;
  background: transparent;
  color: transparent;
  caret-color: #d8e8f7;
  overflow: auto;
  resize: vertical;
  outline: none;
}

textarea.code-editor::selection {
  background: rgba(120, 216, 255, 0.2);
  color: transparent;
}

.workspace-actions {
  display: flex;
  align-items: center;
  gap: 0.48rem;
}

.workspace-actions button {
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0.45rem 0.8rem;
  font-family: inherit;
  font-weight: 600;
  color: #f4fbff;
  cursor: pointer;
}

.run-button {
  background: linear-gradient(160deg, #138d57, var(--accent-run));
}

.submit-button {
  background: linear-gradient(160deg, #ce8d1f, var(--accent-submit));
  color: #2b1d02;
}

.supportive-feedback {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.status-panel {
  display: grid;
  gap: 0.45rem;
  margin-top: 0;
  padding: 0.72rem 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(120, 216, 255, 0.25);
  background: rgba(9, 29, 47, 0.58);
}

.status-line {
  margin: 0;
  color: #cde1f3;
  font-size: 0.84rem;
}

.debug-shell {
  border: 1px solid rgba(119, 147, 174, 0.35);
  border-radius: 10px;
  background: rgba(6, 17, 29, 0.88);
  overflow: hidden;
}

.debug-shell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  border-bottom: 1px solid rgba(119, 147, 174, 0.2);
  padding: 0.48rem 0.62rem;
}

.debug-shell-header p {
  margin: 0;
}

.debug-shell-title {
  color: #d7ebff;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.debug-shell-hint {
  color: #98bddf;
  font-size: 0.76rem;
}

.debug-shell-output {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 0.66rem;
  font-family: var(--font-code);
  font-size: 0.77rem;
  line-height: 1.45;
  color: #cfe6fb;
  white-space: pre-wrap;
}

.visible-test-cases-panel {
  border: 1px solid rgba(119, 147, 174, 0.35);
  border-radius: 10px;
  background: rgba(6, 17, 29, 0.88);
  padding: 0.62rem;
  display: grid;
  gap: 0.56rem;
}

.visible-test-cases-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.62rem;
}

.visible-test-cases-title {
  margin: 0;
  color: #d7ebff;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.visible-test-cases-subtitle {
  margin: 0;
  color: #98bddf;
  font-size: 0.76rem;
}

.test-case-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.test-case-tab {
  border: 1px solid rgba(120, 216, 255, 0.26);
  border-radius: 9px;
  padding: 0.4rem 0.56rem;
  background: rgba(9, 30, 49, 0.55);
  color: #d6e8f8;
  font-family: inherit;
  cursor: pointer;
  display: grid;
  gap: 0.14rem;
  text-align: left;
}

.test-case-tab-name {
  font-size: 0.77rem;
  font-weight: 550;
}

.test-case-tab-status {
  font-size: 0.7rem;
  color: #98bddf;
}

.test-case-tab.is-active {
  border-color: rgba(120, 216, 255, 0.5);
  background: rgba(16, 62, 98, 0.5);
}

.test-case-tab.is-pass {
  border-color: rgba(34, 181, 115, 0.6);
  background: rgba(18, 86, 56, 0.56);
}

.test-case-tab.is-pass .test-case-tab-status {
  color: #b6f0d2;
}

.test-case-tab.is-fail .test-case-tab-status {
  color: #f5b4ac;
}

.test-case {
  border: 1px solid rgba(120, 216, 255, 0.2);
  border-radius: 9px;
  padding: 0.58rem 0.65rem;
  background: rgba(9, 30, 49, 0.42);
}

.test-case[hidden] {
  display: none;
}

.test-case p {
  margin: 0;
  color: #c8def2;
  font-size: 0.8rem;
  line-height: 1.45;
}

.test-case p + p {
  margin-top: 0.28rem;
}

@media (max-width: 920px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .workspace-shell {
    width: min(1040px, 100% - 1rem);
    margin-top: 0.8rem;
  }

  .question-library-controls {
    grid-template-columns: 1fr;
  }

  .question-library-header {
    display: grid;
    gap: 0.25rem;
  }

  .suggest-topic-dialog {
    padding: 0.72rem;
  }
}

@keyframes shell-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`
}

export function getProblemWorkspaceClientScript(): string {
  return `(function () {
  var workspaceRoot = document.querySelector("[data-workspace-root]");
  if (!workspaceRoot) {
    return;
  }

  var runButton = document.getElementById("run-button");
  var submitButton = document.getElementById("submit-button");
  var codeEditor = document.getElementById("starter-code-editor");
  var codeHighlight = document.getElementById("starter-code-highlight");
  var runStatus = document.getElementById("run-status");
  var evaluationStatus = document.getElementById("evaluation-status");
  var sessionStatus = document.getElementById("session-status");
  var scheduleStatus = document.getElementById("schedule-status");
  var sessionTimerStatus = document.getElementById("session-timer-status");
  var timerCapMessage = document.getElementById("timer-cap-message");
  var startProblemButton = document.getElementById("start-problem-button");
  var debugShellOutput = document.getElementById("debug-shell-output");
  var hintTier1Button = document.getElementById("hint-tier-1-button");
  var hintTier2Button = document.getElementById("hint-tier-2-button");
  var hintTier3Button = document.getElementById("hint-tier-3-button");
  var hintTier1Text = document.getElementById("hint-tier-1-text");
  var hintTier2Text = document.getElementById("hint-tier-2-text");
  var hintTier3Text = document.getElementById("hint-tier-3-text");
  var hintStatus = document.getElementById("hint-status");
  var questionSearchInput = document.getElementById("question-search-input");
  var questionTypeFilter = document.getElementById("question-type-filter");
  var questionLibraryResults = document.getElementById("question-library-results");
  var questionLibraryCount = document.getElementById("question-library-count");
  var suggestTopicButton = document.getElementById("suggest-topic-button");
  var suggestTopicStatus = document.getElementById("suggest-topic-status");
  var suggestTopicModal = document.getElementById("suggest-topic-modal");
  var suggestTopicCloseButton = document.getElementById("suggest-topic-close-button");
  var suggestTopicCancelButton = document.getElementById("suggest-topic-cancel-button");
  var suggestTopicForm = document.getElementById("suggest-topic-form");
  var suggestTopicModalFeedback = document.getElementById("suggest-topic-modal-feedback");
  var suggestTopicTitleInput = document.getElementById("suggest-topic-title");
  var suggestTopicProblemTypeInput = document.getElementById("suggest-topic-problem-type");
  var suggestTopicDifficultyInput = document.getElementById("suggest-topic-difficulty");
  var suggestTopicLearningObjectiveInput = document.getElementById("suggest-topic-learning-objective");
  var suggestTopicContextInput = document.getElementById("suggest-topic-context");
  var suggestTopicInputSpecInput = document.getElementById("suggest-topic-input-spec");
  var suggestTopicOutputSpecInput = document.getElementById("suggest-topic-output-spec");
  var suggestTopicConstraintsInput = document.getElementById("suggest-topic-constraints");
  var suggestTopicStarterSignatureInput = document.getElementById("suggest-topic-starter-signature");
  var suggestTopicVisibleTestsInput = document.getElementById("suggest-topic-visible-tests");
  var suggestTopicHintsInput = document.getElementById("suggest-topic-hints");
  var suggestTopicPaperLinkInput = document.getElementById("suggest-topic-paper-link");
  var suggestTopicNotesInput = document.getElementById("suggest-topic-notes");
  var workspaceTabProblem = document.getElementById("workspace-tab-problem");
  var workspaceTabLibrary = document.getElementById("workspace-tab-library");
  var workspaceProblemTabPanel = document.getElementById("workspace-problem-tab-panel");
  var workspaceLibraryTabPanel = document.getElementById("workspace-library-tab-panel");
  var rawVisibleTestCaseIds = workspaceRoot.getAttribute("data-visible-test-case-ids");
  var problemId = workspaceRoot.getAttribute("data-problem-id");
  var localProgressStorageKey = "deepmlsr.anonymousProgress.v1";

  if (!runButton || !submitButton || !codeEditor || !runStatus || !evaluationStatus || !sessionStatus || !problemId) {
    return;
  }

  var sessionCreatedAtMs = Date.now();
  var sessionId = "session-" + sessionCreatedAtMs;
  var sessionStartedAtMs = null;
  var sessionTimerIntervalId = null;
  var sessionHasStarted = false;
  var sessionSubmitted = false;
  var submissionInProgress = false;
  var sessionLimitMinutes = 30;
  var sessionLimitMs = sessionLimitMinutes * 60000;
  var lastEvaluation = null;
  var runAttemptCount = 0;

  function handleEditorTabIndent(event) {
    if (!event || event.key !== "Tab") {
      return;
    }

    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    var currentValue = codeEditor.value || "";
    var selectionStart =
      typeof codeEditor.selectionStart === "number"
        ? codeEditor.selectionStart
        : currentValue.length;
    var selectionEnd =
      typeof codeEditor.selectionEnd === "number"
        ? codeEditor.selectionEnd
        : selectionStart;
    var indent = "  ";

    codeEditor.value =
      currentValue.slice(0, selectionStart) +
      indent +
      currentValue.slice(selectionEnd);

    var nextCursor = selectionStart + indent.length;
    if (typeof codeEditor.setSelectionRange === "function") {
      codeEditor.setSelectionRange(nextCursor, nextCursor);
    } else {
      codeEditor.selectionStart = nextCursor;
      codeEditor.selectionEnd = nextCursor;
    }

    renderCodeHighlight();
  }

  function isTypingKey(event) {
    if (!event || typeof event.key !== "string") {
      return false;
    }

    if (event.key.length !== 1) {
      return false;
    }

    return !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  function handleSessionStartFromTyping(event) {
    if (isTypingKey(event)) {
      startSessionTimer("first-character");
    }
  }

  function setText(node, text) {
    node.textContent = text;
  }

  function setTabActiveState(tabElement, isActive) {
    if (!tabElement || typeof tabElement.className !== "string") {
      return;
    }

    var normalizedClassName = tabElement.className
      .replace(/\bis-active\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    tabElement.className = isActive
      ? (normalizedClassName + " is-active").trim()
      : normalizedClassName;
  }

  function setClassFlag(node, classToken, enabled) {
    if (!node || typeof node.className !== "string") {
      return;
    }

    var tokenRegex = new RegExp("(^|\\\\s)" + classToken + "(?=\\\\s|$)", "g");
    var normalizedClassName = node.className
      .replace(tokenRegex, " ")
      .replace(/\\s+/g, " ")
      .trim();
    node.className = enabled
      ? (normalizedClassName + " " + classToken).trim()
      : normalizedClassName;
  }

  function setTabSelected(tabElement, isSelected) {
    if (!tabElement) {
      return;
    }

    if (typeof tabElement.setAttribute === "function") {
      tabElement.setAttribute("aria-selected", isSelected ? "true" : "false");
      return;
    }

    tabElement.ariaSelected = isSelected ? "true" : "false";
  }

  function activateWorkspaceTab(tabKey) {
    if (
      !workspaceTabProblem ||
      !workspaceTabLibrary ||
      !workspaceProblemTabPanel ||
      !workspaceLibraryTabPanel
    ) {
      return;
    }

    var showProblemTab = tabKey !== "library";
    workspaceProblemTabPanel.hidden = !showProblemTab;
    workspaceLibraryTabPanel.hidden = showProblemTab;

    setTabActiveState(workspaceTabProblem, showProblemTab);
    setTabActiveState(workspaceTabLibrary, !showProblemTab);
    setTabSelected(workspaceTabProblem, showProblemTab);
    setTabSelected(workspaceTabLibrary, !showProblemTab);
  }

  function readInputValue(inputNode) {
    if (!inputNode || typeof inputNode.value !== "string") {
      return "";
    }

    return inputNode.value.trim();
  }

  function setSuggestTopicModalOpen(isOpen) {
    if (!suggestTopicModal) {
      return;
    }

    suggestTopicModal.hidden = !isOpen;
    setClassFlag(suggestTopicModal, "is-open", isOpen);
  }

  function parseVisibleTestCaseIds() {
    if (!rawVisibleTestCaseIds) {
      return [];
    }

    try {
      var parsedIds = JSON.parse(rawVisibleTestCaseIds);
      if (!Array.isArray(parsedIds)) {
        return [];
      }

      return parsedIds.filter(function (entry) {
        return typeof entry === "string" && entry.length > 0;
      });
    } catch (error) {
      return [];
    }
  }

  var visibleTestCaseIds = parseVisibleTestCaseIds();
  var activeVisibleTestCaseId = visibleTestCaseIds.length > 0 ? visibleTestCaseIds[0] : null;

  function getVisibleTestCaseTab(caseId) {
    return document.getElementById("test-case-tab-" + caseId);
  }

  function getVisibleTestCaseStatus(caseId) {
    return document.getElementById("test-case-status-" + caseId);
  }

  function getVisibleTestCasePanel(caseId) {
    return document.getElementById("test-case-panel-" + caseId);
  }

  function activateVisibleTestCase(caseId) {
    if (!caseId) {
      return;
    }

    activeVisibleTestCaseId = caseId;
    for (var index = 0; index < visibleTestCaseIds.length; index += 1) {
      var currentCaseId = visibleTestCaseIds[index];
      var tab = getVisibleTestCaseTab(currentCaseId);
      var panel = getVisibleTestCasePanel(currentCaseId);
      var isSelected = currentCaseId === caseId;

      if (panel) {
        panel.hidden = !isSelected;
      }
      setTabActiveState(tab, isSelected);
      setTabSelected(tab, isSelected);
    }
  }

  function resetVisibleTestCaseStatuses(statusLabel) {
    for (var index = 0; index < visibleTestCaseIds.length; index += 1) {
      var caseId = visibleTestCaseIds[index];
      var tab = getVisibleTestCaseTab(caseId);
      var status = getVisibleTestCaseStatus(caseId);

      setClassFlag(tab, "is-pass", false);
      setClassFlag(tab, "is-fail", false);
      if (status) {
        setText(status, statusLabel);
      }
    }
  }

  function applyVisibleTestCaseResults(results) {
    var resultByCaseId = {};
    if (Array.isArray(results)) {
      for (var resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
        var resultEntry = results[resultIndex];
        if (
          resultEntry &&
          typeof resultEntry === "object" &&
          typeof resultEntry.id === "string"
        ) {
          resultByCaseId[resultEntry.id] = resultEntry;
        }
      }
    }

    var passedCount = 0;
    for (var index = 0; index < visibleTestCaseIds.length; index += 1) {
      var caseId = visibleTestCaseIds[index];
      var tab = getVisibleTestCaseTab(caseId);
      var status = getVisibleTestCaseStatus(caseId);
      var caseResult = resultByCaseId[caseId];

      if (!caseResult) {
        setClassFlag(tab, "is-pass", false);
        setClassFlag(tab, "is-fail", false);
        if (status) {
          setText(status, "Not run");
        }
        continue;
      }

      var passed = caseResult.passed === true;
      setClassFlag(tab, "is-pass", passed);
      setClassFlag(tab, "is-fail", !passed);
      if (status) {
        setText(status, passed ? "Pass" : "Fail");
      }
      if (passed) {
        passedCount += 1;
      }
    }

    if (visibleTestCaseIds.length > 0) {
      appendDebugLine(
        "> visible test cases: " + passedCount + "/" + visibleTestCaseIds.length + " passed."
      );
    }
  }

  function initializeVisibleTestCaseTabs() {
    if (visibleTestCaseIds.length === 0) {
      return;
    }

    for (var index = 0; index < visibleTestCaseIds.length; index += 1) {
      var caseId = visibleTestCaseIds[index];
      var tab = getVisibleTestCaseTab(caseId);
      if (!tab || typeof tab.addEventListener !== "function") {
        continue;
      }

      (function (id) {
        tab.addEventListener("click", function () {
          activateVisibleTestCase(id);
        });
      })(caseId);
    }

    resetVisibleTestCaseStatuses("Not run");
    activateVisibleTestCase(activeVisibleTestCaseId);
  }

  function normalizeQueryText(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildSyntaxHighlightedHtml(sourceText) {
    var escapedSource = escapeHtml(sourceText);
    var tokenPattern = /(#[^\\n]*|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\\b(?:def|return|if|elif|else|for|while|in|None|True|False|pass|class|import|from|as|and|or|not|with|try|except|finally|lambda|yield|break|continue)\\b|\\b(?:len|range|sum|min|max|print|enumerate|zip|float|int|list|dict|set|tuple)\\b|\\b\\d+(?:\\.\\d+)?\\b)/g;

    return escapedSource.replace(tokenPattern, function (token) {
      if (token[0] === "#") {
        return "<span class=\\"token-comment\\">" + token + "</span>";
      }
      if (token[0] === "'" || token[0] === '"') {
        return "<span class=\\"token-string\\">" + token + "</span>";
      }
      if (/^\\d/.test(token)) {
        return "<span class=\\"token-number\\">" + token + "</span>";
      }
      if (/^(len|range|sum|min|max|print|enumerate|zip|float|int|list|dict|set|tuple)$/.test(token)) {
        return "<span class=\\"token-builtin\\">" + token + "</span>";
      }

      return "<span class=\\"token-keyword\\">" + token + "</span>";
    });
  }

  function renderCodeHighlight() {
    if (!codeHighlight || !("innerHTML" in codeHighlight)) {
      return;
    }

    var editorValue = typeof codeEditor.value === "string" ? codeEditor.value : "";
    var highlightedHtml = buildSyntaxHighlightedHtml(editorValue);
    if (editorValue.endsWith("\\n")) {
      highlightedHtml += "\\n";
    }
    codeHighlight.innerHTML = "<code>" + highlightedHtml + "</code>";
    codeHighlight.scrollTop = codeEditor.scrollTop || 0;
    codeHighlight.scrollLeft = codeEditor.scrollLeft || 0;
  }

  function syncHighlightScroll() {
    if (!codeHighlight) {
      return;
    }

    codeHighlight.scrollTop = codeEditor.scrollTop || 0;
    codeHighlight.scrollLeft = codeEditor.scrollLeft || 0;
  }

  function parseQuestionCatalog() {
    var rawCatalog = workspaceRoot.getAttribute("data-question-catalog");
    if (!rawCatalog) {
      return [
        {
          id: problemId,
          title: "Current workspace problem",
          problemType: "Current Session",
          summary: "Use this as today\\'s focused practice item.",
          estimatedMinutes: 30
        }
      ];
    }

    try {
      var parsedCatalog = JSON.parse(rawCatalog);
      if (!Array.isArray(parsedCatalog)) {
        return [];
      }

      return parsedCatalog
        .map(function (entry) {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          var id = typeof entry.id === "string" ? entry.id : "";
          var title = typeof entry.title === "string" ? entry.title : "";
          var problemType =
            typeof entry.problemType === "string" ? entry.problemType : "Uncategorized";
          var summary =
            typeof entry.summary === "string"
              ? entry.summary
              : "Atomic toy-tensor coding problem.";
          var estimatedMinutes =
            typeof entry.estimatedMinutes === "number" && Number.isFinite(entry.estimatedMinutes)
              ? entry.estimatedMinutes
              : 30;

          if (!id || !title) {
            return null;
          }

          return {
            id: id,
            title: title,
            problemType: problemType,
            summary: summary,
            estimatedMinutes: Math.max(1, Math.round(estimatedMinutes))
          };
        })
        .filter(function (entry) {
          return entry !== null;
        });
    } catch (error) {
      return [];
    }
  }

  var questionCatalog = parseQuestionCatalog();

  function computeFuzzyScore(query, text) {
    if (!query) {
      return 0;
    }

    var normalizedText = normalizeQueryText(text);
    if (!normalizedText) {
      return Number.POSITIVE_INFINITY;
    }

    var queryIndex = 0;
    var firstMatch = -1;
    var lastMatch = -1;

    for (var index = 0; index < normalizedText.length; index += 1) {
      if (queryIndex >= query.length) {
        break;
      }

      if (normalizedText[index] === query[queryIndex]) {
        if (firstMatch === -1) {
          firstMatch = index;
        }
        lastMatch = index;
        queryIndex += 1;
      }
    }

    if (queryIndex !== query.length) {
      return Number.POSITIVE_INFINITY;
    }

    var spanPenalty = lastMatch - firstMatch + 1 - query.length;
    return firstMatch + spanPenalty;
  }

  function buildQuestionSearchScore(question, normalizedQuery) {
    if (!normalizedQuery) {
      return 0;
    }

    var bestScore = Number.POSITIVE_INFINITY;
    var candidates = [
      question.title,
      question.id,
      question.problemType,
      question.summary
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      var score = computeFuzzyScore(normalizedQuery, candidates[index]);
      if (score < bestScore) {
        bestScore = score;
      }
    }

    return bestScore;
  }

  function renderQuestionLibrary() {
    if (!questionLibraryResults || !questionLibraryCount) {
      return;
    }

    var normalizedQuery = normalizeQueryText(
      questionSearchInput && typeof questionSearchInput.value === "string"
        ? questionSearchInput.value
        : ""
    );
    var selectedType =
      questionTypeFilter && typeof questionTypeFilter.value === "string"
        ? questionTypeFilter.value
        : "all";

    var filteredQuestions = questionCatalog
      .filter(function (question) {
        if (selectedType === "all") {
          return true;
        }

        return question.problemType === selectedType;
      })
      .map(function (question) {
        return {
          question: question,
          score: buildQuestionSearchScore(question, normalizedQuery)
        };
      })
      .filter(function (candidate) {
        return candidate.score !== Number.POSITIVE_INFINITY;
      })
      .sort(function (left, right) {
        if (left.score !== right.score) {
          return left.score - right.score;
        }

        return left.question.title.localeCompare(right.question.title);
      })
      .map(function (candidate) {
        return candidate.question;
      });

    setText(
      questionLibraryCount,
      "Showing " + filteredQuestions.length + " of " + questionCatalog.length + " questions."
    );

    if (filteredQuestions.length === 0) {
      if ("innerHTML" in questionLibraryResults) {
        questionLibraryResults.innerHTML =
          "<li class=\\"question-library-item\\">No matching questions yet. Try a different keyword or type.</li>";
      } else {
        setText(
          questionLibraryResults,
          "No matching questions yet. Try a different keyword or type."
        );
      }
      return;
    }

    var listHtml = filteredQuestions
      .map(function (question) {
        return (
          "<li class=\\"question-library-item\\">" +
          "<span class=\\"question-library-item-title\\">" +
          escapeHtml(question.title) +
          "</span> " +
          "<span class=\\"question-library-item-meta\\">[" +
          escapeHtml(question.problemType) +
          "] " +
          escapeHtml(question.id) +
          " - " +
          question.estimatedMinutes +
          "m</span>" +
          "<br />" +
          escapeHtml(question.summary) +
          "</li>"
        );
      })
      .join("");

    if ("innerHTML" in questionLibraryResults) {
      questionLibraryResults.innerHTML = listHtml;
      return;
    }

    setText(
      questionLibraryResults,
      filteredQuestions
        .map(function (question) {
          return (
            question.title +
            " [" +
            question.problemType +
            "] " +
            question.id +
            " - " +
            question.estimatedMinutes +
            "m"
          );
        })
        .join("\\n")
    );
  }

  function appendDebugLine(text) {
    if (!debugShellOutput) {
      return;
    }

    var existingOutput = debugShellOutput.textContent || "";
    debugShellOutput.textContent =
      existingOutput.length > 0
        ? existingOutput + "\\n" + text
        : text;
  }

  function formatDebugValue(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  function isValidCorrectness(value) {
    return value === "pass" || value === "partial" || value === "fail";
  }

  function formatTimerClock(totalMs) {
    var safeTotalMs = totalMs > 0 ? totalMs : 0;
    var totalSeconds = Math.floor(safeTotalMs / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var paddedSeconds = seconds < 10 ? "0" + seconds : String(seconds);
    var paddedMinutes = minutes < 10 ? "0" + minutes : String(minutes);
    return paddedMinutes + ":" + paddedSeconds;
  }

  function updateTimerDisplay(remainingMs) {
    if (!sessionTimerStatus) {
      return;
    }

    if (!sessionHasStarted) {
      setText(sessionTimerStatus, "Session timer: not started (30:00 limit).");
      return;
    }

    setText(
      sessionTimerStatus,
      "Session timer: " + formatTimerClock(remainingMs) + " remaining."
    );
  }

  function stopSessionTimer() {
    if (
      sessionTimerIntervalId !== null &&
      typeof clearInterval === "function"
    ) {
      clearInterval(sessionTimerIntervalId);
    }
    sessionTimerIntervalId = null;
  }

  function maybeAutoSubmitAtCap() {
    if (sessionSubmitted || submissionInProgress) {
      return;
    }

    if (timerCapMessage) {
      setText(
        timerCapMessage,
        "30 minutes reached. Submitting automatically so this session ends cleanly."
      );
    }
    appendDebugLine("! session cap reached (30:00). Triggering auto-submit.");
    submitSession("timer-cap");
  }

  function tickSessionTimer() {
    if (!sessionHasStarted || sessionStartedAtMs === null || sessionSubmitted) {
      return;
    }

    var elapsedMs = Date.now() - sessionStartedAtMs;
    var remainingMs = sessionLimitMs - elapsedMs;

    if (remainingMs > 0) {
      updateTimerDisplay(remainingMs);
      return;
    }

    updateTimerDisplay(0);
    stopSessionTimer();
    maybeAutoSubmitAtCap();
  }

  function startSessionTimer(sourceLabel) {
    if (sessionHasStarted) {
      return;
    }

    sessionHasStarted = true;
    sessionStartedAtMs = Date.now();
    updateTimerDisplay(sessionLimitMs);
    if (timerCapMessage) {
      setText(
        timerCapMessage,
        "Timer started. You can run as many experiments as you want before submit."
      );
    }
    appendDebugLine("> timer started via " + sourceLabel + ".");

    if (typeof setInterval === "function") {
      sessionTimerIntervalId = setInterval(tickSessionTimer, 1000);
    }
  }

  function getSessionTimeSpentMinutes() {
    if (!sessionHasStarted || sessionStartedAtMs === null) {
      return 1;
    }

    var elapsedMs = Date.now() - sessionStartedAtMs;
    if (elapsedMs <= 0) {
      return 1;
    }

    return Math.max(1, Math.ceil(elapsedMs / 60000));
  }

  function getPriorSuccessfulCompletions(progress) {
    return progress.attemptHistory.reduce(function (count, attempt) {
      if (
        attempt &&
        typeof attempt === "object" &&
        attempt.problemId === problemId &&
        attempt.correctness === "pass"
      ) {
        return count + 1;
      }

      return count;
    }, 0);
  }

  function getDaysSinceLastExposure(progress) {
    var latestExposureAtMs = null;
    for (var index = 0; index < progress.attemptHistory.length; index += 1) {
      var attempt = progress.attemptHistory[index];
      if (
        !attempt ||
        typeof attempt !== "object" ||
        attempt.problemId !== problemId ||
        typeof attempt.submittedAt !== "string"
      ) {
        continue;
      }

      var submittedAtMs = Date.parse(attempt.submittedAt);
      if (Number.isNaN(submittedAtMs)) {
        continue;
      }

      if (latestExposureAtMs === null || submittedAtMs > latestExposureAtMs) {
        latestExposureAtMs = submittedAtMs;
      }
    }

    if (latestExposureAtMs === null) {
      return 0;
    }

    var elapsedSinceExposureMs = Date.now() - latestExposureAtMs;
    if (elapsedSinceExposureMs <= 0) {
      return 0;
    }

    return Math.floor(elapsedSinceExposureMs / 86400000);
  }

  function getHintText(attributeName, fallback) {
    var value = workspaceRoot.getAttribute(attributeName);
    if (typeof value === "string" && value.length > 0) {
      return value;
    }

    return fallback;
  }

  var hintTierTextByTier = {
    1: getHintText("data-hint-tier-1", "Check tensor shapes for q, k, and v first."),
    2: getHintText("data-hint-tier-2", "Compute q @ k^T before masking and scaling."),
    3: getHintText("data-hint-tier-3", "Apply softmax(scores / sqrt(d_k)) before multiplying by v.")
  };
  var revealedHintTier = 0;

  function applyHintReveal(tier) {
    if (tier !== revealedHintTier + 1) {
      if (hintStatus) {
        setText(
          hintStatus,
          "Hints unlock in order. Start with the next available tier."
        );
      }
      return;
    }

    if (tier === 1 && hintTier1Text) {
      setText(hintTier1Text, "Tier 1 (Conceptual): " + hintTierTextByTier[1]);
    }

    if (tier === 2 && hintTier2Text) {
      setText(hintTier2Text, "Tier 2 (Structural): " + hintTierTextByTier[2]);
    }

    if (tier === 3 && hintTier3Text) {
      setText(hintTier3Text, "Tier 3 (Near-code): " + hintTierTextByTier[3]);
    }

    revealedHintTier = tier;

    if (hintTier1Button) {
      hintTier1Button.disabled = true;
    }
    if (hintTier2Button) {
      hintTier2Button.disabled = tier < 1;
    }
    if (hintTier3Button) {
      hintTier3Button.disabled = tier < 2;
    }

    if (hintStatus) {
      if (tier === 3) {
        setText(
          hintStatus,
          "All hint tiers revealed. Submit whenever you are ready."
        );
      } else {
        setText(
          hintStatus,
          "Hint tier " + tier + " revealed. You can still submit at any time."
        );
      }
    }
  }

  function createEmptyLocalProgress() {
    return {
      version: 1,
      completedProblemIds: [],
      attemptHistory: []
    };
  }

  function canUseLocalStorage() {
    return typeof localStorage !== "undefined" && localStorage !== null;
  }

  function readLocalProgress() {
    if (!canUseLocalStorage()) {
      return createEmptyLocalProgress();
    }

    try {
      var rawValue = localStorage.getItem(localProgressStorageKey);
      if (!rawValue) {
        return createEmptyLocalProgress();
      }

      var parsed = JSON.parse(rawValue);
      if (!parsed || typeof parsed !== "object") {
        return createEmptyLocalProgress();
      }

      if (!Array.isArray(parsed.completedProblemIds) || !Array.isArray(parsed.attemptHistory)) {
        return createEmptyLocalProgress();
      }

      return {
        version: 1,
        completedProblemIds: parsed.completedProblemIds.filter(function (entry) {
          return typeof entry === "string";
        }),
        attemptHistory: parsed.attemptHistory
      };
    } catch (error) {
      return createEmptyLocalProgress();
    }
  }

  function writeLocalProgress(progress) {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      localStorage.setItem(localProgressStorageKey, JSON.stringify(progress));
    } catch (error) {
      // noop: keep solve flow non-blocking when storage is unavailable
    }
  }

  function persistAnonymousProgress(correctness) {
    var progress = readLocalProgress();
    progress.attemptHistory.push({
      problemId: problemId,
      correctness: correctness,
      submittedAt: new Date().toISOString()
    });

    if ((correctness === "pass" || correctness === "partial") && progress.completedProblemIds.indexOf(problemId) === -1) {
      progress.completedProblemIds.push(problemId);
    }

    writeLocalProgress(progress);
    return progress;
  }

  async function syncAnonymousProgress(progress) {
    try {
      await fetch("/api/progress/anonymous", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(progress)
      });
    } catch (error) {
      // noop: sync is best-effort and must not block session completion
    }
  }

  async function updateSchedulerDecision(correctness, priorProgress) {
    if (scheduleStatus) {
      setText(
        scheduleStatus,
        "Scheduling status: computing next resurfacing window..."
      );
    }

    try {
      var schedulerResponse = await fetch("/api/scheduler/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          correctness: correctness,
          timeSpentMinutes: getSessionTimeSpentMinutes(),
          hintTierUsed: revealedHintTier,
          priorSuccessfulCompletions: getPriorSuccessfulCompletions(priorProgress),
          daysSinceLastExposure: getDaysSinceLastExposure(priorProgress)
        })
      });
      var schedulerPayload = await schedulerResponse.json();

      if (!schedulerResponse.ok) {
        if (scheduleStatus) {
          setText(
            scheduleStatus,
            "Scheduling status: unavailable right now. A next problem will still be ready."
          );
        }
        return;
      }

      if (scheduleStatus) {
        setText(
          scheduleStatus,
          "Scheduling status: next resurfacing in " +
            schedulerPayload.nextIntervalDays +
            " day(s), priority " +
            schedulerPayload.resurfacingPriority +
            "."
        );
      }
    } catch (error) {
      if (scheduleStatus) {
        setText(
          scheduleStatus,
          "Scheduling status: temporarily unavailable. Your session is still complete."
        );
      }
    }
  }

  var localProgress = readLocalProgress();
  updateTimerDisplay(sessionLimitMs);
  if (localProgress.completedProblemIds.indexOf(problemId) !== -1) {
    setText(
      sessionStatus,
      "Session status: active. Previous anonymous completion found for this problem."
    );
  }

  codeEditor.addEventListener("keydown", handleEditorTabIndent);
  codeEditor.addEventListener("keydown", handleSessionStartFromTyping);
  codeEditor.addEventListener("input", renderCodeHighlight);
  codeEditor.addEventListener("scroll", syncHighlightScroll);
  renderCodeHighlight();
  if (startProblemButton) {
    startProblemButton.addEventListener("click", function () {
      startSessionTimer("start-button");
    });
  }

  if (
    hintTier1Button &&
    hintTier2Button &&
    hintTier3Button &&
    hintTier1Text &&
    hintTier2Text &&
    hintTier3Text &&
    hintStatus
  ) {
    hintTier1Button.addEventListener("click", function () {
      applyHintReveal(1);
    });
    hintTier2Button.addEventListener("click", function () {
      applyHintReveal(2);
    });
    hintTier3Button.addEventListener("click", function () {
      applyHintReveal(3);
    });
  }

  if (
    workspaceTabProblem &&
    workspaceTabLibrary &&
    workspaceProblemTabPanel &&
    workspaceLibraryTabPanel
  ) {
    workspaceTabProblem.addEventListener("click", function () {
      activateWorkspaceTab("problem");
    });
    workspaceTabLibrary.addEventListener("click", function () {
      activateWorkspaceTab("library");
    });
    activateWorkspaceTab("problem");
  }

  if (questionSearchInput) {
    questionSearchInput.addEventListener("input", renderQuestionLibrary);
  }
  if (questionTypeFilter) {
    questionTypeFilter.addEventListener("change", renderQuestionLibrary);
  }
  if (suggestTopicButton && suggestTopicStatus) {
    suggestTopicButton.addEventListener("click", function () {
      var selectedType =
        questionTypeFilter && typeof questionTypeFilter.value === "string"
          ? questionTypeFilter.value
          : "all";
      var selectedTypeLabel = selectedType === "all" ? "all problem types" : selectedType;

      if (suggestTopicProblemTypeInput && selectedType !== "all") {
        suggestTopicProblemTypeInput.value = selectedType;
      }

      if (suggestTopicModal) {
        setSuggestTopicModalOpen(true);
        if (suggestTopicModalFeedback) {
          setText(
            suggestTopicModalFeedback,
            "Complete the required fields so we can turn this into a strong, runnable coding problem."
          );
        }
        setText(
          suggestTopicStatus,
          "Topic suggestion modal opened for " + selectedTypeLabel + "."
        );
        appendDebugLine("> topic suggestion modal opened (" + selectedTypeLabel + ").");
        return;
      }

      setText(
        suggestTopicStatus,
        "Thanks. Topic suggestion mode is queued for " + selectedTypeLabel + "."
      );
      appendDebugLine("> topic suggestion requested from question library (" + selectedTypeLabel + ").");
    });
  }
  if (suggestTopicCloseButton) {
    suggestTopicCloseButton.addEventListener("click", function () {
      setSuggestTopicModalOpen(false);
      if (suggestTopicStatus) {
        setText(
          suggestTopicStatus,
          "Topic suggestion modal closed. Reopen it any time from Suggest a Topic."
        );
      }
    });
  }
  if (suggestTopicCancelButton) {
    suggestTopicCancelButton.addEventListener("click", function () {
      setSuggestTopicModalOpen(false);
      if (suggestTopicStatus) {
        setText(
          suggestTopicStatus,
          "Topic suggestion canceled. Reopen the modal when ready."
        );
      }
    });
  }
  if (suggestTopicForm && suggestTopicStatus) {
    suggestTopicForm.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      var requiredFields = [
        { label: "Topic title", value: readInputValue(suggestTopicTitleInput) },
        { label: "Problem type", value: readInputValue(suggestTopicProblemTypeInput) },
        { label: "Difficulty", value: readInputValue(suggestTopicDifficultyInput) },
        { label: "Learning objective", value: readInputValue(suggestTopicLearningObjectiveInput) },
        { label: "Concept background", value: readInputValue(suggestTopicContextInput) },
        { label: "Input specification", value: readInputValue(suggestTopicInputSpecInput) },
        { label: "Expected output", value: readInputValue(suggestTopicOutputSpecInput) },
        { label: "Constraints and edge cases", value: readInputValue(suggestTopicConstraintsInput) },
        { label: "Starter signature", value: readInputValue(suggestTopicStarterSignatureInput) },
        { label: "Visible test case plan", value: readInputValue(suggestTopicVisibleTestsInput) }
      ];

      var missingLabels = [];
      for (var index = 0; index < requiredFields.length; index += 1) {
        if (!requiredFields[index].value) {
          missingLabels.push(requiredFields[index].label);
        }
      }

      if (missingLabels.length > 0) {
        if (suggestTopicModalFeedback) {
          setText(
            suggestTopicModalFeedback,
            "Please complete: " + missingLabels.join(", ") + "."
          );
        }
        setText(
          suggestTopicStatus,
          "Topic suggestion needs more detail before it can be queued."
        );
        appendDebugLine("> topic suggestion form incomplete.");
        return;
      }

      var problemTypeValue = readInputValue(suggestTopicProblemTypeInput);
      var titleValue = readInputValue(suggestTopicTitleInput);
      var difficultyValue = readInputValue(suggestTopicDifficultyInput);
      var paperLinkValue = readInputValue(suggestTopicPaperLinkInput);
      var hintsValue = readInputValue(suggestTopicHintsInput);
      var notesValue = readInputValue(suggestTopicNotesInput);
      var completionSummary =
        "Topic suggestion captured for " + problemTypeValue + ": " + titleValue + ".";

      setText(suggestTopicStatus, completionSummary);
      if (suggestTopicModalFeedback) {
        setText(
          suggestTopicModalFeedback,
          "Captured. We can convert this into a deterministic, testable problem spec."
        );
      }
      appendDebugLine(
        "> topic suggestion submitted: " +
          problemTypeValue +
          " | " +
          difficultyValue +
          " | " +
          titleValue
      );
      if (paperLinkValue) {
        appendDebugLine("> suggested paper: " + paperLinkValue);
      }
      if (hintsValue) {
        appendDebugLine("> hint scaffold provided.");
      }
      if (notesValue) {
        appendDebugLine("> additional notes captured.");
      }
      setSuggestTopicModalOpen(false);
    });
  }
  renderQuestionLibrary();
  initializeVisibleTestCaseTabs();

  runButton.addEventListener("click", async function () {
    runButton.disabled = true;
    runAttemptCount += 1;
    setText(runStatus, "Running code against toy tensors...");
    setText(evaluationStatus, "Awaiting evaluator result...");
    setText(sessionStatus, "Session in progress.");
    resetVisibleTestCaseStatuses("Running...");
    appendDebugLine("$ run #" + runAttemptCount + " (" + problemId + ")");
    appendDebugLine("> executing code against deterministic toy tensors...");
    if (scheduleStatus) {
      setText(scheduleStatus, "Scheduling status: waiting for submission.");
    }

    try {
      var runtimeResponse = await fetch("/api/runtime/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problemId: problemId,
          userCode: codeEditor.value
        })
      });
      var runtimePayload = await runtimeResponse.json();

      if (!runtimeResponse.ok) {
        setText(runStatus, "Run unavailable right now. Please try again.");
        setText(evaluationStatus, "Evaluation skipped.");
        resetVisibleTestCaseStatuses("Run unavailable");
        appendDebugLine("! runtime unavailable: " + runtimeResponse.status);
        return;
      }

      if (runtimePayload.status !== "success") {
        setText(runStatus, runtimePayload.message || "Run needs one more iteration.");
        setText(evaluationStatus, "Evaluation skipped until run succeeds.");
        resetVisibleTestCaseStatuses("Run failed");
        if (Array.isArray(runtimePayload.preloadedPackages)) {
          appendDebugLine(
            "> preloaded packages: " +
              runtimePayload.preloadedPackages.join(", ")
          );
        }
        if (
          typeof runtimePayload.runtimeStdout === "string" &&
          runtimePayload.runtimeStdout.trim().length > 0
        ) {
          appendDebugLine("> stdout:");
          appendDebugLine(runtimePayload.runtimeStdout.trimEnd());
        }
        appendDebugLine(
          "! runtime failure: " +
            (runtimePayload.errorCode || "RUNTIME_FAILURE") +
            " - " +
            (runtimePayload.message || "Run failed.")
        );
        if (Array.isArray(runtimePayload.actionableSteps)) {
          appendDebugLine("> next steps: " + runtimePayload.actionableSteps.join(" | "));
        }
        return;
      }

      setText(runStatus, runtimePayload.message || "Run complete.");
      appendDebugLine("> runtime success: " + (runtimePayload.message || "Run complete."));
      if (Array.isArray(runtimePayload.preloadedPackages)) {
        appendDebugLine(
          "> preloaded packages: " +
            runtimePayload.preloadedPackages.join(", ")
        );
      }
      if (
        typeof runtimePayload.runtimeStdout === "string" &&
        runtimePayload.runtimeStdout.trim().length > 0
      ) {
        appendDebugLine("> stdout:");
        appendDebugLine(runtimePayload.runtimeStdout.trimEnd());
      }
      appendDebugLine("> output:");
      appendDebugLine(formatDebugValue(runtimePayload.output));
      applyVisibleTestCaseResults(runtimePayload.testCaseResults);

      var evaluatorResponse = await fetch("/api/evaluator/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problemId: problemId,
          candidateOutput: runtimePayload.output
        })
      });
      var evaluatorPayload = await evaluatorResponse.json();

      if (!evaluatorResponse.ok) {
        setText(evaluationStatus, "Evaluator unavailable right now.");
        appendDebugLine("! evaluator unavailable: " + evaluatorResponse.status);
        return;
      }

      lastEvaluation = evaluatorPayload;
      setText(
        evaluationStatus,
        "Evaluation: " + evaluatorPayload.correctness + " - " + evaluatorPayload.explanation
      );
      appendDebugLine(
        "> evaluator: " +
          evaluatorPayload.correctness +
          " - " +
          evaluatorPayload.explanation
      );
    } catch (error) {
      setText(runStatus, "Run encountered a temporary issue. You can still submit this session.");
      setText(evaluationStatus, "Evaluation unavailable for this run.");
      resetVisibleTestCaseStatuses("Run interrupted");
      appendDebugLine("! runtime exception: temporary issue while running.");
    } finally {
      runButton.disabled = false;
    }
  });

  async function submitSession(submitSource) {
    if (sessionSubmitted || submissionInProgress) {
      return;
    }

    submissionInProgress = true;
    submitButton.disabled = true;

    var correctness = lastEvaluation && isValidCorrectness(lastEvaluation.correctness)
      ? lastEvaluation.correctness
      : "fail";
    var explanation =
      lastEvaluation && typeof lastEvaluation.explanation === "string"
        ? lastEvaluation.explanation
        : "Submitted without a completed successful run.";
    var priorProgress = readLocalProgress();

    setText(sessionStatus, "Submitting session...");
    appendDebugLine("$ submit (" + problemId + ")");
    if (scheduleStatus) {
      setText(
        scheduleStatus,
        "Scheduling status: preparing scheduler decision..."
      );
    }

    try {
      var submitResponse = await fetch("/api/session/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          problemId: problemId,
          correctness: correctness,
          explanation: explanation
        })
      });
      var submitPayload = await submitResponse.json();

      if (!submitResponse.ok) {
        setText(sessionStatus, "Submission temporarily unavailable. Please retry.");
        if (submitSource === "timer-cap" && timerCapMessage) {
          setText(
            timerCapMessage,
            "30 minutes reached. Auto-submit could not complete; please retry submit."
          );
        }
        return;
      }

      sessionSubmitted = true;
      stopSessionTimer();
      setText(
        sessionStatus,
        "Session status: " + submitPayload.nextState.status + ". " + submitPayload.supportiveFeedback
      );
      if (sessionTimerStatus) {
        setText(sessionTimerStatus, "Session timer: completed.");
      }
      if (submitSource === "timer-cap" && timerCapMessage) {
        setText(
          timerCapMessage,
          "30-minute cap reached. Your session was submitted automatically."
        );
      }
      appendDebugLine(
        "> submit accepted: " + submitPayload.nextState.status + " - " + submitPayload.supportiveFeedback
      );
      var updatedProgress = persistAnonymousProgress(correctness);
      await syncAnonymousProgress(updatedProgress);
      await updateSchedulerDecision(correctness, priorProgress);
    } catch (error) {
      setText(sessionStatus, "Submission encountered a temporary issue. Please retry.");
      if (submitSource === "timer-cap" && timerCapMessage) {
        setText(
          timerCapMessage,
          "30 minutes reached. Auto-submit encountered an issue; please retry submit."
        );
      }
    } finally {
      submissionInProgress = false;
      submitButton.disabled = false;
    }
  }

  submitButton.addEventListener("click", async function () {
    await submitSession("manual");
  });
})();`
}

export function ProblemWorkspaceScreen(props: {
  route: EditorFirstLandingRoute
}): ReactElement {
  const { route } = props
  const problemCategory = route.problem.category ?? "Attention"
  const problemConceptDescription =
    route.problem.conceptDescription ??
    "Scaled dot-product attention transforms token features by comparing query-key similarity, normalizing with softmax, and aggregating value vectors into context-aware outputs. This workspace uses a single-sequence 2D toy formulation so the core math is isolated from batch/head bookkeeping."
  const inputSpecification =
    route.problem.inputSpecification ??
    "q, k, v are toy float arrays with shape [seq_len, d_k]. Optional mask is an additive bias matrix with shape [seq_len, seq_len] and suppresses disallowed attention targets before softmax."
  const expectedOutputSpecification =
    route.problem.expectedOutputSpecification ??
    "Output shape must be [seq_len, d_k]. Numerical behavior should remain finite and stable with masked positions suppressed before softmax."
  const formulaNotes = route.problem.formulaNotes ?? [
    "\\mathrm{scores} = \\frac{QK^{\\top}}{\\sqrt{d_k}}",
    "\\mathrm{masked\\_scores} = \\mathrm{scores} + \\mathrm{mask\\_bias}",
    "\\mathrm{attention\\_weights} = \\mathrm{softmax}(\\mathrm{masked\\_scores})",
    "\\mathrm{context} = \\mathrm{attention\\_weights}V"
  ]
  const architectureUses = route.problem.architectureUses ?? [
    "Transformer encoder/decoder attention blocks",
    "Cross-attention for conditioning on external context",
    "Vision transformers and multimodal fusion layers"
  ]
  const evaluationChecklist = route.problem.evaluationChecklist ?? [
    "Shape agreement with expected output dimensions",
    "Mask handling correctness and suppression behavior",
    "Finite numerical outputs without NaN/Inf drift"
  ]
  const visibleTestCases = route.problem.visibleTestCases ?? [
    {
      id: "case_1_balanced_tokens",
      name: "Case 1 - Balanced Tokens",
      inputSummary:
        "q, k, v each shape [2, 2] with small values and no mask.",
      expectedOutputSummary:
        "Output shape [2, 2] with finite values preserving weighted context mixing."
    },
    {
      id: "case_2_causal_masking",
      name: "Case 2 - Causal Masking",
      inputSummary:
        "q, k, v shape [3, 2] with an upper-triangular mask blocking future tokens.",
      expectedOutputSummary:
        "Later positions can attend to prior tokens only; masked logits do not affect probabilities."
    },
    {
      id: "case_3_stability_magnitudes",
      name: "Case 3 - Stability Magnitudes",
      inputSummary:
        "q, k, v shape [3, 2] with varied magnitudes to stress numeric stability.",
      expectedOutputSummary:
        "Output shape [3, 2], finite values, and no NaN/Inf."
    }
  ]
  const paperLinks = route.problem.paperLinks ?? [
    {
      title: "Attention Is All You Need (Vaswani et al., 2017)",
      url: "https://arxiv.org/abs/1706.03762",
      note: "Original Transformer paper introducing scaled dot-product attention."
    }
  ]
  const problemHints = route.problem.hints ?? {
    tier1: "Start by checking expected tensor shapes for q, k, and v.",
    tier2: "Compute q @ k^T, apply mask if present, then scale by sqrt(d_k).",
    tier3:
      "Run softmax over the last axis of scaled scores and multiply by v to produce context vectors."
  }
  const problemGoal =
    route.problem.goal ??
    "Implement the core attention step with deterministic toy tensors and submit within this focused session."
  const questionCatalog = route.problem.questionCatalog ?? [
    {
      id: route.problem.id,
      title: route.problem.title,
      problemType: problemCategory,
      summary:
        route.problem.conceptDescription ??
        "Atomic toy-tensor coding problem for focused practice.",
      estimatedMinutes: 30
    }
  ]
  const questionTypeOptions = Array.from(
    new Set(
      questionCatalog.map((question) => {
        return question.problemType
      })
    )
  ).sort((left, right) => {
    return left.localeCompare(right)
  })
  const seenVisibleTestCaseIds = new Set<string>()
  const normalizedVisibleTestCases = visibleTestCases.map((testCase, index) => {
    const fallbackId = `case_${index + 1}`
    const candidateId = toStableCaseId(testCase.id ?? testCase.name)
    const baseId = candidateId.length > 0 ? candidateId : fallbackId
    const uniqueId = seenVisibleTestCaseIds.has(baseId)
      ? `${baseId}_${index + 1}`
      : baseId
    seenVisibleTestCaseIds.add(uniqueId)

    return {
      ...testCase,
      id: uniqueId
    }
  })

  return (
    <main
      aria-label="problem-workspace"
      className="workspace-shell"
      data-workspace-root="true"
      data-problem-id={route.problem.id}
      data-hint-tier-1={problemHints.tier1}
      data-hint-tier-2={problemHints.tier2}
      data-hint-tier-3={problemHints.tier3}
      data-question-catalog={JSON.stringify(questionCatalog)}
      data-visible-test-case-ids={JSON.stringify(
        normalizedVisibleTestCases.map((testCase) => {
          return testCase.id
        })
      )}
    >
      <header className="workspace-topbar">
        <p className="workspace-brand">DeepML-SR Daily Session</p>
        <a className="account-cta" href={route.accountCallToActionPath}>
          {route.accountCallToAction}
        </a>
      </header>
      <section className="workspace-grid">
        <article className="workspace-card problem-panel">
          <div>
            <p className="problem-eyebrow">Problem</p>
            <h1 className="problem-title">{route.problem.title}</h1>
          </div>
          <p className="problem-goal">{problemGoal}</p>
          <div className="problem-session-bar">
            <p className="session-timer-status" id="session-timer-status">
              Session timer: not started (30:00 limit).
            </p>
            <button className="start-problem-button" type="button" id="start-problem-button">
              Start Problem
            </button>
          </div>
          <p className="timer-cap-message" id="timer-cap-message">
            Timer starts when you click Start Problem or type your first character.
          </p>
          <nav className="workspace-tab-strip" aria-label="workspace-tabs">
            <button
              className="workspace-tab is-active"
              type="button"
              id="workspace-tab-problem"
              aria-selected="true"
              aria-controls="workspace-problem-tab-panel"
            >
              Problem
            </button>
            <button
              className="workspace-tab"
              type="button"
              id="workspace-tab-library"
              aria-selected="false"
              aria-controls="workspace-library-tab-panel"
            >
              Question Bank
            </button>
          </nav>
          <section className="workspace-tab-panel" id="workspace-problem-tab-panel">
            <section className="hint-panel">
              <h2>Hints</h2>
              <p>
                Start with shape reasoning first. Reveal deeper hints only if needed.
              </p>
              <nav className="hint-controls" aria-label="hint-controls">
                <button type="button" id="hint-tier-1-button">
                  Reveal Tier 1
                </button>
                <button type="button" id="hint-tier-2-button" disabled>
                  Reveal Tier 2
                </button>
                <button type="button" id="hint-tier-3-button" disabled>
                  Reveal Tier 3
                </button>
              </nav>
              <p className="hint-status" id="hint-status">
                Hint status: reveal tiers in order. Submission stays available.
              </p>
              <ol className="hint-tier-list" aria-label="revealed-hints">
                <li className="hint-tier-item" id="hint-tier-1-text">
                  Tier 1 hidden.
                </li>
                <li className="hint-tier-item" id="hint-tier-2-text">
                  Tier 2 hidden.
                </li>
                <li className="hint-tier-item" id="hint-tier-3-text">
                  Tier 3 hidden.
                </li>
              </ol>
            </section>
            <section className="problem-context" aria-label="problem-context">
              <details className="context-item" open>
                <summary>Concept Background</summary>
                <div className="context-body">
                  <p>{problemConceptDescription}</p>
                </div>
              </details>
              <details className="context-item">
                <summary>Formulas</summary>
                <div className="context-body">
                  <div className="formula-list" aria-label="latex-formulas">
                    {formulaNotes.map((formula) => {
                      return (
                        <div
                          className="formula-expression"
                          key={formula}
                          dangerouslySetInnerHTML={{
                            __html: renderFormulaMathml(formula)
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </details>
              <details className="context-item">
                <summary>Where It Appears In Architectures</summary>
                <div className="context-body">
                  <ul className="context-list">
                    {architectureUses.map((usage) => {
                      return <li key={usage}>{usage}</li>
                    })}
                  </ul>
                </div>
              </details>
              <details className="context-item">
                <summary>Input Shape And Constraints</summary>
                <div className="context-body">
                  <p>{inputSpecification}</p>
                </div>
              </details>
              <details className="context-item">
                <summary>Expected Outputs And Evaluation</summary>
                <div className="context-body">
                  <p>{expectedOutputSpecification}</p>
                  <ul className="context-list">
                    {evaluationChecklist.map((criterion) => {
                      return <li key={criterion}>{criterion}</li>
                    })}
                  </ul>
                </div>
              </details>
              <details className="context-item">
                <summary>Primary Papers</summary>
                <div className="context-body">
                  <ul className="context-list">
                    {paperLinks.map((paper) => {
                      return (
                        <li key={paper.url}>
                          <a
                            className="paper-link"
                            href={paper.url}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {paper.title}
                          </a>
                          {paper.note ? ` - ${paper.note}` : ""}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </details>
            </section>
          </section>
          <section
            className="workspace-tab-panel"
            id="workspace-library-tab-panel"
            hidden
          >
            <section className="question-library" aria-label="question-library">
              <header className="question-library-header">
                <h2>Question Library</h2>
                <p className="question-library-count" id="question-library-count">
                  Showing {questionCatalog.length} of {questionCatalog.length} questions.
                </p>
              </header>
              <div className="question-library-controls">
                <input
                  type="search"
                  id="question-search-input"
                  aria-label="question-search-input"
                  placeholder="Search questions (fuzzy title/id/concept)"
                />
                <select
                  id="question-type-filter"
                  aria-label="question-type-filter"
                  defaultValue="all"
                >
                  <option value="all">All Types</option>
                  {questionTypeOptions.map((problemType) => {
                    return (
                      <option key={problemType} value={problemType}>
                        {problemType}
                      </option>
                    )
                  })}
                </select>
                <button type="button" id="suggest-topic-button" className="suggest-topic-button">
                  Suggest a Topic
                </button>
              </div>
              <p className="suggest-topic-status" id="suggest-topic-status">
                Suggest a topic and we can prioritize it in the next problem-pack refresh.
              </p>
              <section
                className="suggest-topic-modal"
                id="suggest-topic-modal"
                aria-label="suggest-topic-modal"
                hidden
              >
                <div
                  className="suggest-topic-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="suggest-topic-heading"
                >
                  <header className="suggest-topic-modal-header">
                    <h3 id="suggest-topic-heading">Suggest a New Coding Problem</h3>
                    <button
                      type="button"
                      id="suggest-topic-close-button"
                      className="suggest-topic-close-button"
                    >
                      Close
                    </button>
                  </header>
                  <p className="suggest-topic-modal-copy">
                    Provide enough detail to define a deterministic toy-tensor problem, expected outputs, and scoring criteria.
                  </p>
                  <form className="suggest-topic-form" id="suggest-topic-form">
                    <label className="suggest-topic-field" htmlFor="suggest-topic-title">
                      <span className="suggest-topic-field-label">Topic Title (Required)</span>
                      <input id="suggest-topic-title" type="text" required />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-problem-type">
                      <span className="suggest-topic-field-label">Problem Type (Required)</span>
                      <input
                        id="suggest-topic-problem-type"
                        type="text"
                        placeholder="Attention, Normalization, Optimization, etc."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-difficulty">
                      <span className="suggest-topic-field-label">Difficulty (Required)</span>
                      <select id="suggest-topic-difficulty" defaultValue="" required>
                        <option value="" disabled>
                          Select difficulty
                        </option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-learning-objective">
                      <span className="suggest-topic-field-label">Learning Objective (Required)</span>
                      <textarea
                        id="suggest-topic-learning-objective"
                        rows={2}
                        placeholder="What should learners understand after solving this?"
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-context">
                      <span className="suggest-topic-field-label">Concept Background (Required)</span>
                      <textarea
                        id="suggest-topic-context"
                        rows={3}
                        placeholder="Explain the concept and why it matters in model architectures."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-input-spec">
                      <span className="suggest-topic-field-label">Input Shape + Specification (Required)</span>
                      <textarea
                        id="suggest-topic-input-spec"
                        rows={3}
                        placeholder="Toy tensor shapes, dtype assumptions, and argument contract."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-output-spec">
                      <span className="suggest-topic-field-label">Expected Output + Evaluation Targets (Required)</span>
                      <textarea
                        id="suggest-topic-output-spec"
                        rows={3}
                        placeholder="Expected output shape, invariants, and correctness criteria."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-constraints">
                      <span className="suggest-topic-field-label">Constraints + Edge Cases (Required)</span>
                      <textarea
                        id="suggest-topic-constraints"
                        rows={3}
                        placeholder="Numerical stability constraints, masking rules, boundary conditions."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-starter-signature">
                      <span className="suggest-topic-field-label">Starter Function Signature (Required)</span>
                      <input
                        id="suggest-topic-starter-signature"
                        type="text"
                        placeholder="def my_function(x, y, mask=None):"
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-visible-tests">
                      <span className="suggest-topic-field-label">Visible Test Case Plan (Required)</span>
                      <textarea
                        id="suggest-topic-visible-tests"
                        rows={3}
                        placeholder="At least 2-3 deterministic visible test cases with expected behavior."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-hints">
                      <span className="suggest-topic-field-label">Hint Tier Plan (Optional)</span>
                      <textarea
                        id="suggest-topic-hints"
                        rows={2}
                        placeholder="Conceptual, structural, and near-code hint ideas."
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-paper-link">
                      <span className="suggest-topic-field-label">Paper Or Reference Link (Optional)</span>
                      <input
                        id="suggest-topic-paper-link"
                        type="url"
                        placeholder="https://arxiv.org/abs/..."
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-notes">
                      <span className="suggest-topic-field-label">Additional Notes (Optional)</span>
                      <textarea
                        id="suggest-topic-notes"
                        rows={2}
                        placeholder="Anything else needed for implementation and scoring."
                      />
                    </label>
                    <p className="suggest-topic-modal-feedback" id="suggest-topic-modal-feedback">
                      Fill in the required fields to submit a strong topic proposal.
                    </p>
                    <div className="suggest-topic-modal-actions">
                      <button
                        type="button"
                        id="suggest-topic-cancel-button"
                        className="suggest-topic-cancel-button"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="suggest-topic-submit-button">
                        Submit Topic
                      </button>
                    </div>
                  </form>
                </div>
              </section>
              <ul className="question-library-results" id="question-library-results">
                {questionCatalog.map((question) => {
                  return (
                    <li key={question.id} className="question-library-item">
                      <span className="question-library-item-title">{question.title}</span>{" "}
                      <span className="question-library-item-meta">
                        [{question.problemType}] {question.id} - {question.estimatedMinutes}m
                      </span>
                      <br />
                      {question.summary}
                    </li>
                  )
                })}
              </ul>
            </section>
          </section>
        </article>
        <article className="workspace-card editor-panel">
          <header className="editor-header">
            <h2>Starter Code</h2>
            <span className="problem-chip">{problemCategory}</span>
          </header>
          <div className="code-editor-shell">
            <pre className="code-editor-highlight" id="starter-code-highlight" aria-hidden="true">
              <code>{route.problem.starterCode}</code>
            </pre>
            <textarea
              id="starter-code-editor"
              className="code-editor"
              defaultValue={route.problem.starterCode}
              aria-label="starter-code-editor"
              spellCheck={false}
            />
          </div>
          <nav aria-label="primary-actions" className="workspace-actions">
            <button className="run-button" type="button" id="run-button">
              Run
            </button>
            <button className="submit-button" type="button" id="submit-button">
              Submit
            </button>
          </nav>
          <section className="debug-shell" aria-label="debug-shell">
            <header className="debug-shell-header">
              <p className="debug-shell-title">Debug Console</p>
              <p className="debug-shell-hint">
                Run as many times as needed before submit.
              </p>
            </header>
            <pre className="debug-shell-output" id="debug-shell-output">
              $ ready: run your code to inspect runtime and evaluator output.
            </pre>
          </section>
          <section
            className="visible-test-cases-panel"
            id="visible-test-cases-panel"
            aria-label="visible-test-cases"
          >
            <header className="visible-test-cases-header">
              <p className="visible-test-cases-title">Visible Test Cases</p>
              <p className="visible-test-cases-subtitle">
                Tabs turn green as each deterministic case passes.
              </p>
            </header>
            <nav className="test-case-tabs" aria-label="test-case-tabs">
              {normalizedVisibleTestCases.map((testCase, index) => {
                return (
                  <button
                    key={testCase.id}
                    className={`test-case-tab${index === 0 ? " is-active" : ""}`}
                    type="button"
                    id={`test-case-tab-${testCase.id}`}
                    aria-controls={`test-case-panel-${testCase.id}`}
                    aria-selected={index === 0 ? "true" : "false"}
                  >
                    <span className="test-case-tab-name">{testCase.name}</span>
                    <span className="test-case-tab-status" id={`test-case-status-${testCase.id}`}>
                      Not run
                    </span>
                  </button>
                )
              })}
            </nav>
            {normalizedVisibleTestCases.map((testCase, index) => {
              return (
                <article
                  className="test-case"
                  id={`test-case-panel-${testCase.id}`}
                  key={`panel-${testCase.id}`}
                  hidden={index !== 0}
                >
                  <p>
                    <strong>{testCase.name}</strong>
                  </p>
                  <p>
                    <strong>Input:</strong> {testCase.inputSummary}
                  </p>
                  <p>
                    <strong>Expected:</strong> {testCase.expectedOutputSummary}
                  </p>
                  {testCase.reasoning ? (
                    <p>
                      <strong>Reasoning:</strong> {testCase.reasoning}
                    </p>
                  ) : null}
                </article>
              )
            })}
          </section>
          <section className="status-panel" aria-label="workspace-status">
            <p className="status-line" id="run-status">
              Run status: waiting for execution.
            </p>
            <p className="status-line" id="evaluation-status">
              Evaluation status: run code to generate feedback.
            </p>
            <p className="status-line" id="session-status">
              Session status: active.
            </p>
            <p className="status-line" id="schedule-status">
              Scheduling status: pending submission.
            </p>
          </section>
          <p className="supportive-feedback">
            Feedback stays supportive: submission is always allowed.
          </p>
        </article>
      </section>
    </main>
  )
}
