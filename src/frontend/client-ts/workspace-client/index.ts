/* Client-side interactivity for the problem workspace screen. */
import {
  QuestionCatalog,
  VisibleTestCaseTracker,
  SuggestTopicFormValidator,
  AnonymousProgressStore
} from "./domain/models.js"
import {
  createWorkspaceApiAdapters,
  EditorController,
  WorkspaceTabController,
  VisibleTestCaseController,
  QuestionLibraryController,
  SessionController,
  SubmissionController,
  SuggestTopicController
} from "./controllers/index.js"
import type {
  FetchLike,
  ProgressSnapshotLike,
  TextNodeLike,
  WorkspaceCorrectness
} from "./shared/types.js"

type WorkspaceRootNodeLike = {
  getAttribute: (name: string) => string | null
}

function getElementById<TNode>(id: string): TNode | null {
  return document.getElementById(id) as TNode | null
}

export function initializeProblemWorkspaceClient(): void {
  const workspaceRoot = document.querySelector(
    "[data-workspace-root]"
  ) as WorkspaceRootNodeLike | null
  if (!workspaceRoot) {
    return
  }
  const workspaceRootNode = workspaceRoot

  // ─── Element References ───

  const runButton = getElementById<HTMLButtonElement>("run-button")
  const submitButton = getElementById<HTMLButtonElement>("submit-button")
  const codeEditor = getElementById<HTMLTextAreaElement>("starter-code-editor")
  const codeHighlight = getElementById<HTMLElement>("starter-code-highlight")
  let codeEditorShell: HTMLElement | null =
    codeEditor && typeof codeEditor.closest === "function"
      ? (codeEditor.closest(".code-editor-shell") as HTMLElement | null)
      : null
  if (!codeEditorShell && typeof document.querySelector === "function") {
    codeEditorShell = document.querySelector(".code-editor-shell") as HTMLElement | null
  }
  const runStatus = getElementById<HTMLElement>("run-status")
  const evaluationStatus = getElementById<HTMLElement>("evaluation-status")
  const sessionStatus = getElementById<HTMLElement>("session-status")
  const scheduleStatus = getElementById<HTMLElement>("schedule-status")
  const sessionTimerStatus = getElementById<HTMLElement>("session-timer-status")
  const timerCapMessage = getElementById<HTMLElement>("timer-cap-message")
  const startProblemButton = getElementById<HTMLButtonElement>("start-problem-button")
  const debugShellOutput = getElementById<HTMLElement>("debug-shell-output")
  const hintTier1Button = getElementById<HTMLButtonElement>("hint-tier-1-button")
  const hintTier2Button = getElementById<HTMLButtonElement>("hint-tier-2-button")
  const hintTier3Button = getElementById<HTMLButtonElement>("hint-tier-3-button")
  const hintTier1Text = getElementById<HTMLElement>("hint-tier-1-text")
  const hintTier2Text = getElementById<HTMLElement>("hint-tier-2-text")
  const hintTier3Text = getElementById<HTMLElement>("hint-tier-3-text")
  const hintStatus = getElementById<HTMLElement>("hint-status")
  const questionSearchInput = getElementById<HTMLInputElement>("question-search-input")
  const questionTypeFilter = getElementById<HTMLSelectElement>("question-type-filter")
  const questionLibraryResults = getElementById<HTMLElement>("question-library-results")
  const questionLibraryCount = getElementById<HTMLElement>("question-library-count")
  const suggestTopicButton = getElementById<HTMLButtonElement>("suggest-topic-button")
  const suggestTopicStatus = getElementById<HTMLElement>("suggest-topic-status")
  const suggestTopicModal = getElementById<HTMLElement>("suggest-topic-modal")
  const suggestTopicCloseButton = getElementById<HTMLButtonElement>(
    "suggest-topic-close-button"
  )
  const suggestTopicCancelButton = getElementById<HTMLButtonElement>(
    "suggest-topic-cancel-button"
  )
  const suggestTopicForm = getElementById<HTMLFormElement>("suggest-topic-form")
  const suggestTopicModalFeedback = getElementById<HTMLElement>(
    "suggest-topic-modal-feedback"
  )
  const suggestTopicTitleInput = getElementById<HTMLInputElement>(
    "suggest-topic-title"
  )
  const suggestTopicProblemTypeInput = getElementById<HTMLInputElement>(
    "suggest-topic-problem-type"
  )
  const suggestTopicDifficultyInput = getElementById<HTMLInputElement>(
    "suggest-topic-difficulty"
  )
  const suggestTopicLearningObjectiveInput = getElementById<HTMLInputElement>(
    "suggest-topic-learning-objective"
  )
  const suggestTopicContextInput = getElementById<HTMLTextAreaElement>(
    "suggest-topic-context"
  )
  const suggestTopicInputSpecInput = getElementById<HTMLTextAreaElement>(
    "suggest-topic-input-spec"
  )
  const suggestTopicOutputSpecInput = getElementById<HTMLTextAreaElement>(
    "suggest-topic-output-spec"
  )
  const suggestTopicConstraintsInput = getElementById<HTMLTextAreaElement>(
    "suggest-topic-constraints"
  )
  const suggestTopicStarterSignatureInput = getElementById<HTMLInputElement>(
    "suggest-topic-starter-signature"
  )
  const suggestTopicVisibleTestsInput = getElementById<HTMLTextAreaElement>(
    "suggest-topic-visible-tests"
  )
  const suggestTopicHintsInput = getElementById<HTMLTextAreaElement>(
    "suggest-topic-hints"
  )
  const suggestTopicPaperLinkInput = getElementById<HTMLInputElement>(
    "suggest-topic-paper-link"
  )
  const suggestTopicNotesInput = getElementById<HTMLTextAreaElement>(
    "suggest-topic-notes"
  )
  const themeToggle = getElementById<HTMLButtonElement>("theme-toggle")
  const workspaceTabProblem = getElementById<HTMLButtonElement>(
    "workspace-tab-problem"
  )
  const workspaceTabLibrary = getElementById<HTMLButtonElement>(
    "workspace-tab-library"
  )
  const workspaceProblemTabPanel = getElementById<HTMLElement>(
    "workspace-problem-tab-panel"
  )
  const workspaceLibraryTabPanel = getElementById<HTMLElement>(
    "workspace-library-tab-panel"
  )
  const rawVisibleTestCaseIds = workspaceRootNode.getAttribute(
    "data-visible-test-case-ids"
  )
  const problemId = workspaceRootNode.getAttribute("data-problem-id")

  // ─── Storage Keys ───

  const localProgressStorageKey = "deepmlsr.anonymousProgress.v1"
  const themeStorageKey = "deepmlsr.theme.v1"

  if (
    !runButton ||
    !submitButton ||
    !codeEditor ||
    !runStatus ||
    !evaluationStatus ||
    !sessionStatus ||
    !problemId
  ) {
    return
  }

  const localProgressStore = new AnonymousProgressStore({
    storage: typeof localStorage !== "undefined" ? localStorage : null,
    storageKey: localProgressStorageKey,
    problemId,
    nowProvider: () => {
      return Date.now()
    }
  })
  const suggestTopicValidator = new SuggestTopicFormValidator()
  const questionCatalogModel = new QuestionCatalog({
    rawCatalog: workspaceRootNode.getAttribute("data-question-catalog"),
    problemId
  })
  const visibleTestCaseTracker = new VisibleTestCaseTracker(rawVisibleTestCaseIds)
  let visibleTestCaseController: VisibleTestCaseController | null = null
  let questionLibraryController: QuestionLibraryController | null = null

  // ─── Session State ───

  let sessionStartedAtMs: number | null = null
  let sessionTimerIntervalId: ReturnType<typeof setInterval> | null = null
  let sessionHasStarted = false
  const sessionLimitMinutes = 30
  const sessionLimitMs = sessionLimitMinutes * 60000

  // ─── DOM Utilities ───

  function setText(node: TextNodeLike | null | undefined, text: string): void {
    if (!node) {
      return
    }

    node.textContent = text
  }

  // ─── Debug Console ───

  function appendDebugLine(text: string): void {
    if (!debugShellOutput) {
      return
    }

    const existingOutput = debugShellOutput.textContent || ""
    debugShellOutput.textContent =
      existingOutput.length > 0 ? `${existingOutput}\n${text}` : text
  }

  function formatDebugValue(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2)
    } catch (_error) {
      return String(value)
    }
  }

  // ─── UI Controllers ───

  const editorController = new EditorController({
    codeEditor,
    codeHighlight,
    codeEditorShell,
    onTypingStart: (sourceLabel: string) => {
      startSessionTimer(sourceLabel)
    }
  })
  const workspaceTabController = new WorkspaceTabController({
    workspaceTabProblem,
    workspaceTabLibrary,
    workspaceProblemTabPanel,
    workspaceLibraryTabPanel
  })
  visibleTestCaseController = new VisibleTestCaseController({
    documentRef: document,
    tracker: visibleTestCaseTracker,
    appendDebugLine
  })
  questionLibraryController = new QuestionLibraryController({
    catalogModel: questionCatalogModel,
    questionSearchInput,
    questionTypeFilter,
    questionLibraryResults,
    questionLibraryCount
  })
  const suggestTopicController = new SuggestTopicController({
    validator: suggestTopicValidator,
    questionTypeFilter,
    suggestTopicButton,
    suggestTopicStatus,
    suggestTopicModal,
    suggestTopicCloseButton,
    suggestTopicCancelButton,
    suggestTopicForm,
    suggestTopicModalFeedback,
    suggestTopicTitleInput,
    suggestTopicProblemTypeInput,
    suggestTopicDifficultyInput,
    suggestTopicLearningObjectiveInput,
    suggestTopicContextInput,
    suggestTopicInputSpecInput,
    suggestTopicOutputSpecInput,
    suggestTopicConstraintsInput,
    suggestTopicStarterSignatureInput,
    suggestTopicVisibleTestsInput,
    suggestTopicHintsInput,
    suggestTopicPaperLinkInput,
    suggestTopicNotesInput,
    appendDebugLine
  })

  function resetVisibleTestCaseStatuses(statusLabel: string): void {
    if (!visibleTestCaseController) {
      return
    }

    visibleTestCaseController.reset(statusLabel)
  }

  function applyVisibleTestCaseResults(results: unknown[] | undefined): void {
    if (!visibleTestCaseController) {
      return
    }

    visibleTestCaseController.applyResults(results)
  }

  const apiAdapters = createWorkspaceApiAdapters({
    fetchImpl:
      typeof fetch === "function"
        ? (fetch.bind(globalThis) as FetchLike)
        : null
  })
  const sessionController = new SessionController({
    problemId,
    codeEditor,
    runButton,
    runStatus,
    evaluationStatus,
    sessionStatus,
    scheduleStatus,
    api: apiAdapters,
    appendDebugLine,
    formatDebugValue,
    resetVisibleTestCaseStatuses,
    applyVisibleTestCaseResults,
    nowProvider: () => {
      return Date.now()
    }
  })
  const submissionController = new SubmissionController({
    problemId,
    submitButton,
    sessionStatus,
    scheduleStatus,
    sessionTimerStatus,
    timerCapMessage,
    api: apiAdapters,
    appendDebugLine,
    readLocalProgress,
    persistAnonymousProgress,
    getPriorSuccessfulCompletions,
    getDaysSinceLastExposure,
    getSessionTimeSpentMinutes,
    getHintTierUsed: () => {
      return revealedHintTier
    },
    getSessionId: () => {
      return sessionController.getSessionId()
    },
    getLastEvaluation: () => {
      return sessionController.getLastEvaluation()
    },
    stopSessionTimer
  })

  // ─── Session Timer ───

  function formatTimerClock(totalMs: number): string {
    const safeTotalMs = totalMs > 0 ? totalMs : 0
    const totalSeconds = Math.floor(safeTotalMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const paddedSeconds = seconds < 10 ? `0${seconds}` : String(seconds)
    const paddedMinutes = minutes < 10 ? `0${minutes}` : String(minutes)
    return `${paddedMinutes}:${paddedSeconds}`
  }

  function updateTimerDisplay(remainingMs: number): void {
    if (!sessionTimerStatus) {
      return
    }

    if (!sessionHasStarted) {
      setText(sessionTimerStatus, "Session timer: not started (30:00 limit).")
      return
    }

    setText(
      sessionTimerStatus,
      `Session timer: ${formatTimerClock(remainingMs)} remaining.`
    )
  }

  function stopSessionTimer(): void {
    if (sessionTimerIntervalId !== null && typeof clearInterval === "function") {
      clearInterval(sessionTimerIntervalId)
    }
    sessionTimerIntervalId = null
  }

  function maybeAutoSubmitAtCap(): void {
    if (
      !submissionController ||
      submissionController.hasSubmitted() ||
      submissionController.isSubmissionInProgress()
    ) {
      return
    }

    if (timerCapMessage) {
      setText(
        timerCapMessage,
        "30 minutes reached. Submitting automatically so this session ends cleanly."
      )
    }
    appendDebugLine("! session cap reached (30:00). Triggering auto-submit.")
    submissionController.submitSession("timer-cap")
  }

  function tickSessionTimer(): void {
    if (
      !sessionHasStarted ||
      sessionStartedAtMs === null ||
      (submissionController && submissionController.hasSubmitted())
    ) {
      return
    }

    const elapsedMs = Date.now() - sessionStartedAtMs
    const remainingMs = sessionLimitMs - elapsedMs

    if (remainingMs > 0) {
      updateTimerDisplay(remainingMs)
      return
    }

    updateTimerDisplay(0)
    stopSessionTimer()
    maybeAutoSubmitAtCap()
  }

  function startSessionTimer(sourceLabel: string): void {
    if (sessionHasStarted) {
      return
    }

    sessionHasStarted = true
    sessionStartedAtMs = Date.now()
    updateTimerDisplay(sessionLimitMs)
    if (timerCapMessage) {
      setText(
        timerCapMessage,
        "Timer started. You can run as many experiments as you want before submit."
      )
    }
    appendDebugLine(`> timer started via ${sourceLabel}.`)

    if (typeof setInterval === "function") {
      sessionTimerIntervalId = setInterval(tickSessionTimer, 1000)
    }
  }

  function getSessionTimeSpentMinutes(): number {
    if (!sessionHasStarted || sessionStartedAtMs === null) {
      return 1
    }

    const elapsedMs = Date.now() - sessionStartedAtMs
    if (elapsedMs <= 0) {
      return 1
    }

    return Math.max(1, Math.ceil(elapsedMs / 60000))
  }

  // ─── Progress & Scheduling ───

  function getPriorSuccessfulCompletions(progress: ProgressSnapshotLike): number {
    return localProgressStore.getPriorSuccessfulCompletions(progress)
  }

  function getDaysSinceLastExposure(progress: ProgressSnapshotLike): number {
    return localProgressStore.getDaysSinceLastExposure(progress)
  }

  // ─── Hints ───

  function getHintText(attributeName: string, fallback: string): string {
    const value = workspaceRootNode.getAttribute(attributeName)
    if (typeof value === "string" && value.length > 0) {
      return value
    }

    return fallback
  }

  const hintTierTextByTier: Record<number, string> = {
    1: getHintText("data-hint-tier-1", "Check tensor shapes for q, k, and v first."),
    2: getHintText("data-hint-tier-2", "Compute q @ k^T before masking and scaling."),
    3: getHintText(
      "data-hint-tier-3",
      "Apply softmax(scores / sqrt(d_k)) before multiplying by v."
    )
  }
  let revealedHintTier = 0

  function applyHintReveal(tier: 1 | 2 | 3): void {
    if (tier !== revealedHintTier + 1) {
      if (hintStatus) {
        setText(
          hintStatus,
          "Hints unlock in order. Start with the next available tier."
        )
      }
      return
    }

    if (tier === 1 && hintTier1Text) {
      setText(hintTier1Text, `Tier 1 (Conceptual): ${hintTierTextByTier[1]}`)
    }

    if (tier === 2 && hintTier2Text) {
      setText(hintTier2Text, `Tier 2 (Structural): ${hintTierTextByTier[2]}`)
    }

    if (tier === 3 && hintTier3Text) {
      setText(hintTier3Text, `Tier 3 (Near-code): ${hintTierTextByTier[3]}`)
    }

    revealedHintTier = tier

    if (hintTier1Button) {
      hintTier1Button.disabled = true
    }
    if (hintTier2Button) {
      hintTier2Button.disabled = tier < 1
    }
    if (hintTier3Button) {
      hintTier3Button.disabled = tier < 2
    }

    if (hintStatus) {
      if (tier === 3) {
        setText(hintStatus, "All hint tiers revealed. Submit whenever you are ready.")
      } else {
        setText(
          hintStatus,
          `Hint tier ${tier} revealed. You can still submit at any time.`
        )
      }
    }
  }

  // ─── Local Progress Persistence ───

  function canUseLocalStorage(): boolean {
    return localProgressStore.canUseStorage()
  }

  function readLocalProgress(): ProgressSnapshotLike {
    return localProgressStore.read()
  }

  function persistAnonymousProgress(
    correctness: WorkspaceCorrectness
  ): ProgressSnapshotLike {
    return localProgressStore.persistAttempt(correctness)
  }

  // ─── Theme Toggle ───

  function getActiveTheme(): string {
    return document.documentElement.getAttribute("data-theme") || "dark"
  }

  function applyTheme(theme: string): void {
    document.documentElement.setAttribute("data-theme", theme)
    if (canUseLocalStorage()) {
      try {
        localStorage.setItem(themeStorageKey, theme)
      } catch (_error) {
        // noop
      }
    }
  }

  function toggleTheme(): void {
    const currentTheme = getActiveTheme()
    const nextTheme = currentTheme === "dark" ? "light" : "dark"
    applyTheme(nextTheme)
  }

  // ─── Initialization ───

  const localProgress = readLocalProgress()
  updateTimerDisplay(sessionLimitMs)
  if (localProgress.completedProblemIds.indexOf(problemId) !== -1) {
    setText(
      sessionStatus,
      "Session status: active. Previous anonymous completion found for this problem."
    )
  }
  editorController.bind()

  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme)
  }

  if (startProblemButton) {
    startProblemButton.addEventListener("click", () => {
      startSessionTimer("start-button")
    })
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
    hintTier1Button.addEventListener("click", () => {
      applyHintReveal(1)
    })
    hintTier2Button.addEventListener("click", () => {
      applyHintReveal(2)
    })
    hintTier3Button.addEventListener("click", () => {
      applyHintReveal(3)
    })
  }

  workspaceTabController.bind()
  questionLibraryController.bind()
  questionLibraryController.render()
  suggestTopicController.bind()
  visibleTestCaseController.bind()
  sessionController.bind()
  submissionController.bind()
}

if (typeof document !== "undefined") {
  initializeProblemWorkspaceClient()
}
