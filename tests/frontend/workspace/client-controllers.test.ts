import assert from "node:assert/strict"
import test from "node:test"
import {
  QuestionCatalog,
  VisibleTestCaseTracker,
  SuggestTopicFormValidator
} from "../../../src/frontend/client-ts/workspace-client/domain/models.js"
import {
  createWorkspaceApiAdapters,
  EditorController,
  WorkspaceTabController,
  VisibleTestCaseController,
  QuestionLibraryController,
  SessionController,
  SubmissionController,
  SuggestTopicController,
  ProblemFlagController
} from "../../../src/frontend/client-ts/workspace-client/controllers/index.js"

type EventHandler = (event?: {
  key?: string
  preventDefault?: () => void
  target?: unknown
}) => unknown | Promise<unknown>

type ApiAdapterResult = {
  ok: boolean
  status: number
  payload: unknown
}

type FakeElement = {
  textContent: string
  innerHTML: string
  value: string
  className: string
  hidden: boolean
  ariaSelected: string
  disabled: boolean
  scrollTop: number
  scrollLeft: number
  selectionStart: number
  selectionEnd: number
  focused: boolean
  attributes: Map<string, string>
  handlers: Map<string, EventHandler>
  addEventListener: (eventName: string, handler: EventHandler) => void
  setAttribute: (name: string, value: string) => void
  getAttribute: (name: string) => string | null
  setSelectionRange: (start: number, end: number) => void
  focus: () => void
}

function createFakeElement(textContent = "", value = ""): FakeElement {
  const handlers = new Map<string, EventHandler>()
  const attributes = new Map<string, string>()

  return {
    textContent,
    innerHTML: textContent,
    value,
    className: "",
    hidden: false,
    ariaSelected: "false",
    disabled: false,
    scrollTop: 0,
    scrollLeft: 0,
    selectionStart: value.length,
    selectionEnd: value.length,
    focused: false,
    attributes,
    handlers,
    addEventListener(eventName, handler) {
      const priorHandler = handlers.get(eventName)
      if (!priorHandler) {
        handlers.set(eventName, handler)
        return
      }

      handlers.set(eventName, async (event) => {
        await priorHandler(event)
        return await handler(event)
      })
    },
    setAttribute(name, value) {
      attributes.set(name, value)
      if (name === "aria-selected") {
        this.ariaSelected = value
      }
    },
    getAttribute(name) {
      if (name === "aria-selected") {
        return this.ariaSelected
      }
      return attributes.get(name) ?? null
    },
    setSelectionRange(start, end) {
      this.selectionStart = start
      this.selectionEnd = end
    },
    focus() {
      this.focused = true
    }
  }
}

function createMockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload
    }
  } as Response
}

function loadControllerClasses() {
  return {
    domain: {
      QuestionCatalog,
      VisibleTestCaseTracker,
      SuggestTopicFormValidator
    } as unknown as {
      QuestionCatalog: new (options: {
        rawCatalog?: string
        problemId?: string
      }) => unknown
      VisibleTestCaseTracker: new (rawVisibleTestCaseIds?: string) => unknown
      SuggestTopicFormValidator: new () => unknown
    },
    controllers: {
      createWorkspaceApiAdapters,
      EditorController,
      WorkspaceTabController,
      VisibleTestCaseController,
      QuestionLibraryController,
      SessionController,
      SubmissionController,
      SuggestTopicController,
      ProblemFlagController
    } as unknown as {
      createWorkspaceApiAdapters: (options: {
        fetchImpl?: (
          input: string | URL | Request,
          init?: RequestInit
        ) => Promise<Response>
      }) => {
        runRuntime: (problemId: string, userCode: string) => Promise<ApiAdapterResult>
        evaluateOutput: (problemId: string, candidateOutput: unknown) => Promise<ApiAdapterResult>
        submitSession: (payload: Record<string, unknown>) => Promise<ApiAdapterResult>
        syncAnonymousProgress: (payload: Record<string, unknown>) => Promise<ApiAdapterResult>
        requestSchedulerDecision: (payload: Record<string, unknown>) => Promise<ApiAdapterResult>
        flagProblem: (payload: Record<string, unknown>) => Promise<ApiAdapterResult>
      }
      EditorController: new (options: {
        codeEditor: FakeElement
        codeHighlight: FakeElement
        codeEditorShell: FakeElement
        onTypingStart: (sourceLabel: string) => void
      }) => {
        bind: () => void
      }
      WorkspaceTabController: new (options: {
        workspaceTabProblem: FakeElement
        workspaceTabLibrary: FakeElement
        workspaceProblemTabPanel: FakeElement
        workspaceLibraryTabPanel: FakeElement
      }) => {
        bind: () => void
      }
      VisibleTestCaseController: new (options: {
        documentRef: { getElementById: (id: string) => FakeElement | null }
        tracker: {
          getVisibleTestCaseIds: () => string[]
          getInitialActiveCaseId: () => string | null
          buildResetState: (statusLabel: string) => {
            statusByCaseId: Record<
              string,
              { statusLabel: string; isPass: boolean; isFail: boolean }
            >
          }
          summarizeResults: (results: unknown[]) => {
            statusByCaseId: Record<
              string,
              { statusLabel: string; isPass: boolean; isFail: boolean }
            >
            passedCount: number
            totalCount: number
          }
        }
        appendDebugLine: (text: string) => void
      }) => {
        bind: () => void
        applyResults: (results: unknown[]) => void
      }
      QuestionLibraryController: new (options: {
        catalogModel: {
          getCatalog: () => unknown[]
          filterQuestions: (query: string, selectedType: string) => unknown[]
          renderQuestionListHtml: (questions: unknown[]) => string
          renderQuestionListText: (questions: unknown[]) => string
        }
        questionSearchInput: FakeElement
        questionTypeFilter: FakeElement
        questionLibraryResults: FakeElement
        questionLibraryCount: FakeElement
        navigateToProblem?: (problemPath: string) => void
      }) => {
        bind: () => void
        render: () => void
      }
      SessionController: new (options: {
        problemId: string
        codeEditor: FakeElement
        runButton: FakeElement
        runStatus: FakeElement
        evaluationStatus: FakeElement
        sessionStatus: FakeElement
        scheduleStatus: FakeElement
        api: {
          runRuntime: (problemId: string, userCode: string) => Promise<ApiAdapterResult>
          evaluateOutput: (problemId: string, candidateOutput: unknown) => Promise<ApiAdapterResult>
        }
        appendDebugLine: (text: string) => void
        formatDebugValue: (value: unknown) => string
        resetVisibleTestCaseStatuses: (statusLabel: string) => void
        applyVisibleTestCaseResults: (results: unknown[]) => void
        nowProvider: () => number
      }) => {
        bind: () => void
        runCurrentCode: () => Promise<void>
        getLastEvaluation: () => unknown
        getSessionId: () => string
      }
      SubmissionController: new (options: {
        problemId: string
        submitButton: FakeElement
        sessionStatus: FakeElement
        scheduleStatus: FakeElement
        sessionTimerStatus: FakeElement
        timerCapMessage: FakeElement
        api: {
          submitSession: (payload: Record<string, unknown>) => Promise<ApiAdapterResult>
          syncAnonymousProgress: (payload: Record<string, unknown>) => Promise<ApiAdapterResult>
          requestSchedulerDecision: (payload: Record<string, unknown>) => Promise<ApiAdapterResult>
        }
        appendDebugLine: (text: string) => void
        readLocalProgress: () => Record<string, unknown>
        persistAnonymousProgress: (correctness: string) => Record<string, unknown>
        getPriorSuccessfulCompletions: (progress: Record<string, unknown>) => number
        getDaysSinceLastExposure: (progress: Record<string, unknown>) => number
        getSessionTimeSpentMinutes: () => number
        getHintTierUsed: () => number
        getSessionId: () => string
        getLastEvaluation: () => { correctness: string; explanation: string } | null
        stopSessionTimer: () => void
      }) => {
        bind: () => void
        submitSession: (submitSource: string) => Promise<void>
        hasSubmitted: () => boolean
        isSubmissionInProgress: () => boolean
      }
      SuggestTopicController: new (options: Record<string, unknown>) => {
        bind: () => void
      }
      ProblemFlagController: new (options: {
        problemId: string
        problemVersion: number
        flagProblemButton: FakeElement
        flagProblemReasonInput: FakeElement
        flagProblemNotesInput: FakeElement
        flagProblemStatus: FakeElement
        api: {
          flagProblem: (payload: Record<string, unknown>) => Promise<ApiAdapterResult>
        }
        getSessionId: () => string
        getLastEvaluation: () => { correctness: string; explanation: string } | null
        appendDebugLine: (text: string) => void
      }) => {
        bind: () => void
        submitFlag: () => Promise<void>
      }
    }
  }
}

test("workspace API adapters post JSON payloads and return parsed envelopes", async () => {
  const { controllers } = loadControllerClasses()
  const calls: Array<{ input: string; init?: RequestInit }> = []
  const adapters = controllers.createWorkspaceApiAdapters({
    async fetchImpl(input, init) {
      const inputText =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      calls.push({ input: inputText, init })
      return createMockResponse({ status: "ok", endpoint: inputText })
    }
  })

  const runResult = await adapters.runRuntime("problem_a", "def solve(x): return x")
  const submitResult = await adapters.submitSession({
    sessionId: "session-1",
    problemId: "problem_a"
  })
  const flagResult = await adapters.flagProblem({
    problemId: "problem_a",
    problemVersion: 1,
    reason: "incorrect_output",
    sessionId: "session-1"
  })

  assert.equal(runResult.ok, true)
  assert.equal(runResult.status, 200)
  assert.deepEqual(runResult.payload, { status: "ok", endpoint: "/api/runtime/run" })
  assert.equal(submitResult.ok, true)
  assert.equal(flagResult.ok, true)
  assert.equal(calls[0]?.input, "/api/runtime/run")
  assert.equal(calls[1]?.input, "/api/session/submit")
  assert.equal(calls[2]?.input, "/api/problems/flag")
  assert.equal(
    String(calls[0]?.init?.headers ? (calls[0]?.init?.headers as Record<string, string>)["content-type"] : ""),
    "application/json"
  )
  assert.deepEqual(
    JSON.parse(String(calls[0]?.init?.body ?? "{}")),
    { problemId: "problem_a", userCode: "def solve(x): return x" }
  )
  assert.deepEqual(
    JSON.parse(String(calls[2]?.init?.body ?? "{}")),
    {
      problemId: "problem_a",
      problemVersion: 1,
      reason: "incorrect_output",
      sessionId: "session-1"
    }
  )
})

test("session controller runs runtime and evaluator flow with deterministic UI updates", async () => {
  const { controllers } = loadControllerClasses()
  const runButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n  return x")
  const runStatus = createFakeElement()
  const evaluationStatus = createFakeElement()
  const sessionStatus = createFakeElement()
  const scheduleStatus = createFakeElement()
  const debugLines: string[] = []
  const resetStatuses: string[] = []
  let appliedResults: unknown[] = []

  const sessionController = new controllers.SessionController({
    problemId: "attention_scaled_dot_product_v1",
    codeEditor,
    runButton,
    runStatus,
    evaluationStatus,
    sessionStatus,
    scheduleStatus,
    api: {
      async runRuntime() {
        return {
          ok: true,
          status: 200,
          payload: {
            status: "success",
            message: "Run complete on toy tensors.",
            output: [[1, 2]],
            testCaseResults: [{ id: "case_1", passed: true }]
          }
        }
      },
      async evaluateOutput() {
        return {
          ok: true,
          status: 200,
          payload: {
            correctness: "partial",
            explanation: "Shape is correct; value drift remains."
          }
        }
      }
    },
    appendDebugLine(text: string) {
      debugLines.push(text)
    },
    formatDebugValue(value: unknown) {
      return JSON.stringify(value, null, 2)
    },
    resetVisibleTestCaseStatuses(statusLabel: string) {
      resetStatuses.push(statusLabel)
    },
    applyVisibleTestCaseResults(results: unknown[]) {
      appliedResults = results
    },
    nowProvider() {
      return 1_733_000_000_000
    }
  })

  await sessionController.runCurrentCode()

  assert.equal(sessionController.getSessionId(), "session-1733000000000")
  assert.equal(runStatus.textContent, "Run complete on toy tensors.")
  assert.equal(
    evaluationStatus.textContent,
    "Evaluation: partial - Shape is correct; value drift remains."
  )
  assert.equal(sessionStatus.textContent, "Session in progress.")
  assert.equal(scheduleStatus.textContent, "Scheduling status: waiting for submission.")
  assert.deepEqual(resetStatuses, ["Running..."])
  assert.deepEqual(appliedResults, [{ id: "case_1", passed: true }])
  assert.equal(debugLines.includes("$ run #1 (attention_scaled_dot_product_v1)"), true)
  assert.equal(debugLines.includes("> evaluator: partial - Shape is correct; value drift remains."), true)
  assert.equal(runButton.disabled, false)
  assert.deepEqual(sessionController.getLastEvaluation(), {
    correctness: "partial",
    explanation: "Shape is correct; value drift remains."
  })
})

test("submission controller submits session and keeps done state when sync fails", async () => {
  const { controllers } = loadControllerClasses()
  const submitButton = createFakeElement()
  const sessionStatus = createFakeElement()
  const scheduleStatus = createFakeElement()
  const sessionTimerStatus = createFakeElement()
  const timerCapMessage = createFakeElement()
  const debugLines: string[] = []
  const priorProgress = { version: 1, attemptHistory: [] }
  const persistedProgress = { version: 1, attemptHistory: [{ correctness: "partial" }] }
  let schedulerPayload: Record<string, unknown> = {}
  let stopTimerCalls = 0

  const submissionController = new controllers.SubmissionController({
    problemId: "attention_scaled_dot_product_v1",
    submitButton,
    sessionStatus,
    scheduleStatus,
    sessionTimerStatus,
    timerCapMessage,
    api: {
      async submitSession(payload: Record<string, unknown>) {
        assert.equal(payload.sessionId, "session-1733000000000")
        assert.equal(payload.problemId, "attention_scaled_dot_product_v1")
        assert.equal(payload.correctness, "partial")
        return {
          ok: true,
          status: 200,
          payload: {
            nextState: { status: "done" },
            supportiveFeedback: "Session complete."
          }
        }
      },
      async syncAnonymousProgress() {
        throw new Error("sync unavailable")
      },
      async requestSchedulerDecision(payload: Record<string, unknown>) {
        schedulerPayload = payload
        return {
          ok: true,
          status: 200,
          payload: {
            nextIntervalDays: 4,
            resurfacingPriority: 0.38
          }
        }
      }
    },
    appendDebugLine(text: string) {
      debugLines.push(text)
    },
    readLocalProgress() {
      return priorProgress
    },
    persistAnonymousProgress(correctness: string) {
      assert.equal(correctness, "partial")
      return persistedProgress
    },
    getPriorSuccessfulCompletions() {
      return 1
    },
    getDaysSinceLastExposure() {
      return 2
    },
    getSessionTimeSpentMinutes() {
      return 7
    },
    getHintTierUsed() {
      return 2
    },
    getSessionId() {
      return "session-1733000000000"
    },
    getLastEvaluation() {
      return {
        correctness: "partial",
        explanation: "Shape is correct; value drift remains."
      }
    },
    stopSessionTimer() {
      stopTimerCalls += 1
    }
  })

  await submissionController.submitSession("manual")

  assert.equal(submissionController.hasSubmitted(), true)
  assert.equal(submissionController.isSubmissionInProgress(), false)
  assert.equal(stopTimerCalls, 1)
  assert.equal(sessionStatus.textContent, "Session status: done. Session complete.")
  assert.equal(sessionTimerStatus.textContent, "Session timer: completed.")
  assert.equal(
    scheduleStatus.textContent,
    "Scheduling status: next resurfacing in 4 day(s), priority 0.38."
  )
  assert.equal(schedulerPayload.correctness, "partial")
  assert.equal(schedulerPayload.timeSpentMinutes, 7)
  assert.equal(schedulerPayload.hintTierUsed, 2)
  assert.equal(schedulerPayload.priorSuccessfulCompletions, 1)
  assert.equal(schedulerPayload.daysSinceLastExposure, 2)
  assert.equal(debugLines.includes("$ submit (attention_scaled_dot_product_v1)"), true)
  assert.equal(debugLines.includes("> submit accepted: done - Session complete."), true)
  assert.equal(submitButton.disabled, false)
})

test("problem flag controller submits structured flags and updates status text", async () => {
  const { controllers } = loadControllerClasses()
  const flagProblemButton = createFakeElement()
  const flagProblemReasonInput = createFakeElement("", "incorrect_output")
  const flagProblemNotesInput = createFakeElement("", "Expected output mismatches hidden test.")
  const flagProblemStatus = createFakeElement("Spot an issue? Flag it and this card will be reviewed.")
  const debugLines: string[] = []
  let capturedPayload: Record<string, unknown> = {}

  const controller = new controllers.ProblemFlagController({
    problemId: "attention_scaled_dot_product_v1",
    problemVersion: 1,
    flagProblemButton,
    flagProblemReasonInput,
    flagProblemNotesInput,
    flagProblemStatus,
    api: {
      async flagProblem(payload: Record<string, unknown>) {
        capturedPayload = payload
        return {
          ok: true,
          status: 200,
          payload: {
            status: "accepted",
            deduplicated: false,
            verificationStatus: "needs_review",
            triageAction: "status_updated_to_needs_review",
            reviewQueueSize: 1,
            message: "Flag recorded and card moved to needs_review."
          }
        }
      }
    },
    getSessionId() {
      return "session-1733000000000"
    },
    getLastEvaluation() {
      return {
        correctness: "partial",
        explanation: "Shape is correct; value drift remains."
      }
    },
    appendDebugLine(text: string) {
      debugLines.push(text)
    }
  })

  controller.bind()
  await flagProblemButton.handlers.get("click")?.()

  assert.equal(capturedPayload.problemId, "attention_scaled_dot_product_v1")
  assert.equal(capturedPayload.problemVersion, 1)
  assert.equal(capturedPayload.reason, "incorrect_output")
  assert.equal(capturedPayload.sessionId, "session-1733000000000")
  assert.equal(capturedPayload.evaluationCorrectness, "partial")
  assert.equal(
    capturedPayload.evaluationExplanation,
    "Shape is correct; value drift remains."
  )
  assert.equal(
    flagProblemStatus.textContent,
    "Flag submitted. Verification status: needs_review."
  )
  assert.equal(debugLines.includes("$ flag (attention_scaled_dot_product_v1)"), true)
  assert.equal(
    debugLines.includes("> flag accepted: status_updated_to_needs_review (needs_review)"),
    true
  )
  assert.equal(flagProblemButton.disabled, false)
})

test("editor controller handles tab indentation, highlight rendering, and typing callback", async () => {
  const { controllers } = loadControllerClasses()
  const codeEditor = createFakeElement("", "def solve(x):\nreturn x")
  const codeHighlight = createFakeElement()
  const codeEditorShell = createFakeElement()
  let typingSource = ""
  const editorController = new controllers.EditorController({
    codeEditor,
    codeHighlight,
    codeEditorShell,
    onTypingStart(sourceLabel: string) {
      typingSource = sourceLabel
    }
  })

  editorController.bind()

  assert.equal(
    codeEditorShell.getAttribute("data-editor-enhanced"),
    "true"
  )
  assert.equal(codeHighlight.innerHTML.includes("token-keyword"), true)

  const secondLineStart = codeEditor.value.indexOf("\n") + 1
  codeEditor.selectionStart = secondLineStart
  codeEditor.selectionEnd = secondLineStart
  let prevented = false

  await codeEditor.handlers.get("keydown")?.({
    key: "Tab",
    preventDefault() {
      prevented = true
    }
  })
  assert.equal(prevented, true)
  assert.equal(codeEditor.value, "def solve(x):\n  return x")

  await codeEditor.handlers.get("keydown")?.({
    key: "a"
  })
  assert.equal(typingSource, "first-character")
})

test("workspace tab controller switches visible panels and accessibility state", async () => {
  const { controllers } = loadControllerClasses()
  const workspaceTabProblem = createFakeElement()
  const workspaceTabLibrary = createFakeElement()
  const workspaceProblemTabPanel = createFakeElement()
  const workspaceLibraryTabPanel = createFakeElement()
  workspaceTabProblem.className = "workspace-tab is-active"
  workspaceTabLibrary.className = "workspace-tab"
  workspaceProblemTabPanel.hidden = false
  workspaceLibraryTabPanel.hidden = true

  const tabsController = new controllers.WorkspaceTabController({
    workspaceTabProblem,
    workspaceTabLibrary,
    workspaceProblemTabPanel,
    workspaceLibraryTabPanel
  })
  tabsController.bind()
  await workspaceTabLibrary.handlers.get("click")?.()

  assert.equal(workspaceProblemTabPanel.hidden, true)
  assert.equal(workspaceLibraryTabPanel.hidden, false)
  assert.equal(workspaceTabLibrary.className.includes("is-active"), true)
  assert.equal(workspaceTabLibrary.ariaSelected, "true")
})

test("visible test case controller maps statuses and emits debug summaries", async () => {
  const { domain, controllers } = loadControllerClasses()
  const tracker = new domain.VisibleTestCaseTracker(
    JSON.stringify(["case_1", "case_2"])
  ) as {
    getVisibleTestCaseIds: () => string[]
    getInitialActiveCaseId: () => string | null
    buildResetState: (statusLabel: string) => {
      statusByCaseId: Record<
        string,
        { statusLabel: string; isPass: boolean; isFail: boolean }
      >
    }
    summarizeResults: (results: unknown[]) => {
      statusByCaseId: Record<
        string,
        { statusLabel: string; isPass: boolean; isFail: boolean }
      >
      passedCount: number
      totalCount: number
    }
  }

  const elements = new Map<string, FakeElement>([
    ["test-case-tab-case_1", createFakeElement()],
    ["test-case-tab-case_2", createFakeElement()],
    ["test-case-status-case_1", createFakeElement("Not run")],
    ["test-case-status-case_2", createFakeElement("Not run")],
    ["test-case-panel-case_1", createFakeElement()],
    ["test-case-panel-case_2", createFakeElement()]
  ])
  const debugLines: string[] = []
  const controller = new controllers.VisibleTestCaseController({
    documentRef: {
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    tracker,
    appendDebugLine(text: string) {
      debugLines.push(text)
    }
  })

  controller.bind()
  controller.applyResults([
    { id: "case_1", passed: true },
    { id: "case_2", passed: false }
  ])

  assert.equal(elements.get("test-case-status-case_1")?.textContent, "Pass")
  assert.equal(elements.get("test-case-status-case_2")?.textContent, "Fail")
  assert.equal(debugLines.includes("> visible test cases: 1/2 passed."), true)
})

test("question library controller renders filtered catalog results", async () => {
  const { domain, controllers } = loadControllerClasses()
  const catalogModel = new domain.QuestionCatalog({
    rawCatalog: JSON.stringify([
      {
        id: "attention_scaled_dot_product_core_v1",
        title: "Implement Scaled Dot-Product Attention Core",
        problemType: "Attention",
        summary: "Compute attention on toy tensors.",
        estimatedMinutes: 30
      },
      {
        id: "mlp_affine_relu_step_v1",
        title: "Implement a Single MLP Affine + ReLU Step",
        problemType: "MLP",
        summary: "Affine + relu on toy tensors.",
        estimatedMinutes: 20
      }
    ])
  }) as {
    getCatalog: () => unknown[]
    filterQuestions: (query: string, selectedType: string) => unknown[]
    renderQuestionListHtml: (questions: unknown[]) => string
    renderQuestionListText: (questions: unknown[]) => string
  }
  const questionSearchInput = createFakeElement()
  const questionTypeFilter = createFakeElement("", "all")
  const questionLibraryResults = createFakeElement()
  const questionLibraryCount = createFakeElement("Showing 2 of 2 questions.")
  let selectedProblemPath = ""

  const controller = new controllers.QuestionLibraryController({
    catalogModel,
    questionSearchInput,
    questionTypeFilter,
    questionLibraryResults,
    questionLibraryCount,
    navigateToProblem(problemPath: string) {
      selectedProblemPath = problemPath
    }
  })

  controller.bind()
  controller.render()
  assert.equal(questionLibraryCount.textContent, "Showing 2 of 2 questions.")

  questionSearchInput.value = "attention"
  await questionSearchInput.handlers.get("input")?.()
  assert.equal(questionLibraryCount.textContent, "Showing 1 of 2 questions.")
  assert.equal(
    questionLibraryResults.innerHTML.includes("Scaled Dot-Product Attention Core"),
    true
  )

  let prevented = false
  await questionLibraryResults.handlers.get("click")?.({
    preventDefault() {
      prevented = true
    },
    target: {
      closest(selector: string) {
        if (selector !== ".question-library-item-link") {
          return null
        }

        return {
          getAttribute(name: string) {
            if (name !== "href") {
              return null
            }

            return "/?problemId=attention_scaled_dot_product_core_v1"
          }
        }
      }
    }
  })

  assert.equal(prevented, true)
  assert.equal(
    selectedProblemPath,
    "/?problemId=attention_scaled_dot_product_core_v1"
  )
})

test("suggest topic controller validates required fields and captures submission", async () => {
  const { domain, controllers } = loadControllerClasses()
  const validator = new domain.SuggestTopicFormValidator()
  const suggestTopicButton = createFakeElement()
  const suggestTopicStatus = createFakeElement()
  const suggestTopicModal = createFakeElement()
  suggestTopicModal.hidden = true
  const suggestTopicCloseButton = createFakeElement()
  const suggestTopicCancelButton = createFakeElement()
  const suggestTopicForm = createFakeElement()
  const suggestTopicModalFeedback = createFakeElement()
  const suggestTopicTitleInput = createFakeElement()
  const suggestTopicProblemTypeInput = createFakeElement()
  const suggestTopicDifficultyInput = createFakeElement()
  const suggestTopicLearningObjectiveInput = createFakeElement()
  const suggestTopicContextInput = createFakeElement()
  const suggestTopicInputSpecInput = createFakeElement()
  const suggestTopicOutputSpecInput = createFakeElement()
  const suggestTopicConstraintsInput = createFakeElement()
  const suggestTopicStarterSignatureInput = createFakeElement()
  const suggestTopicVisibleTestsInput = createFakeElement()
  const suggestTopicHintsInput = createFakeElement()
  const suggestTopicPaperLinkInput = createFakeElement()
  const suggestTopicNotesInput = createFakeElement()
  const questionTypeFilter = createFakeElement("", "Attention")
  const debugLines: string[] = []

  const controller = new controllers.SuggestTopicController({
    validator,
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
    appendDebugLine(text: string) {
      debugLines.push(text)
    }
  })

  controller.bind()
  await suggestTopicButton.handlers.get("click")?.()
  assert.equal(suggestTopicModal.hidden, false)
  assert.equal(suggestTopicProblemTypeInput.value, "Attention")

  let prevented = false
  await suggestTopicForm.handlers.get("submit")?.({
    preventDefault() {
      prevented = true
    }
  })
  assert.equal(prevented, true)
  assert.equal(
    suggestTopicStatus.textContent,
    "Topic suggestion needs more detail before it can be queued."
  )

  suggestTopicTitleInput.value = "Rotary Position Embeddings"
  suggestTopicDifficultyInput.value = "Medium"
  suggestTopicLearningObjectiveInput.value = "Understand rotations."
  suggestTopicContextInput.value = "RoPE for relative positions."
  suggestTopicInputSpecInput.value = "q, k tensors."
  suggestTopicOutputSpecInput.value = "rotated outputs."
  suggestTopicConstraintsInput.value = "finite outputs."
  suggestTopicStarterSignatureInput.value = "def apply_rope(q, k, positions):"
  suggestTopicVisibleTestsInput.value = "three deterministic cases"

  await suggestTopicForm.handlers.get("submit")?.({
    preventDefault() {
      return undefined
    }
  })

  assert.equal(suggestTopicModal.hidden, true)
  assert.equal(
    suggestTopicStatus.textContent,
    "Topic suggestion captured for Attention: Rotary Position Embeddings."
  )
  assert.equal(
    debugLines.includes(
      "> topic suggestion submitted: Attention | Medium | Rotary Position Embeddings"
    ),
    true
  )
})
