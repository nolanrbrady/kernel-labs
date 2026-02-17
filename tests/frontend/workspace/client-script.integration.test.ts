import assert from "node:assert/strict"
import test from "node:test"
import { createContext } from "node:vm"
import { initializeProblemWorkspaceClient } from "../../../src/frontend/client-ts/workspace-client/index.js"

type EventHandler = (event?: {
  key?: string
  shiftKey?: boolean
  preventDefault?: () => void
  target?: unknown
}) => unknown | Promise<unknown>

type FakeElement = {
  textContent: string
  innerHTML: string
  value: string
  disabled: boolean
  hidden: boolean
  className: string
  ariaSelected: string
  scrollTop: number
  scrollLeft: number
  selectionStart: number
  selectionEnd: number
  setAttribute: (name: string, value: string) => void
  getAttribute: (name: string) => string | null
  setSelectionRange: (start: number, end: number) => void
  addEventListener: (eventName: string, handler: EventHandler) => void
  handlers: Map<string, EventHandler>
}

type FetchCall = {
  input: string
  init: RequestInit | undefined
}

const originalDocument = (globalThis as { document?: unknown }).document
const originalFetch = (globalThis as { fetch?: unknown }).fetch
const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage
const originalLocation = (globalThis as { location?: unknown }).location
const originalDate = Date
const originalSetInterval = (globalThis as { setInterval?: unknown }).setInterval
const originalClearInterval = (globalThis as { clearInterval?: unknown }).clearInterval
const originalWindow = (globalThis as { window?: unknown }).window

function createFakeElement(
  textContent = "",
  value = ""
): FakeElement {
  const handlers = new Map<string, EventHandler>()

  return {
    textContent,
    innerHTML: textContent,
    value,
    disabled: false,
    hidden: false,
    className: "",
    ariaSelected: "false",
    scrollTop: 0,
    scrollLeft: 0,
    selectionStart: value.length,
    selectionEnd: value.length,
    setAttribute(name: string, value: string) {
      if (name === "aria-selected") {
        this.ariaSelected = value
      }
    },
    getAttribute(name: string) {
      if (name === "aria-selected") {
        return this.ariaSelected
      }

      return null
    },
    setSelectionRange(start: number, end: number) {
      this.selectionStart = start
      this.selectionEnd = end
    },
    handlers,
    addEventListener(eventName: string, handler: EventHandler) {
      const priorHandler = handlers.get(eventName)
      if (!priorHandler) {
        handlers.set(eventName, handler)
        return
      }

      handlers.set(eventName, async (event) => {
        await priorHandler(event)
        return await handler(event)
      })
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

function runWorkspaceClientScripts(context: ReturnType<typeof createContext>) {
  ;(globalThis as { document?: unknown }).document = context.document
  ;(globalThis as { fetch?: unknown }).fetch = context.fetch
  ;(globalThis as { localStorage?: unknown }).localStorage = context.localStorage
  ;(globalThis as { location?: unknown }).location = context.location
  ;(globalThis as { window?: unknown }).window = context.window

  if (typeof context.Date === "function") {
    ;(globalThis as { Date: DateConstructor }).Date = context.Date as DateConstructor
  }
  ;(globalThis as { setInterval?: unknown }).setInterval =
    typeof context.setInterval === "function"
      ? context.setInterval
      : (() => 0)
  ;(globalThis as { clearInterval?: unknown }).clearInterval =
    typeof context.clearInterval === "function"
      ? context.clearInterval
      : (() => undefined)

  initializeProblemWorkspaceClient()
}

test.afterEach(() => {
  ;(globalThis as { document?: unknown }).document = originalDocument
  ;(globalThis as { fetch?: unknown }).fetch = originalFetch
  ;(globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage
  ;(globalThis as { location?: unknown }).location = originalLocation
  ;(globalThis as { Date: DateConstructor }).Date = originalDate
  ;(globalThis as { setInterval?: unknown }).setInterval = originalSetInterval
  ;(globalThis as { clearInterval?: unknown }).clearInterval = originalClearInterval
  ;(globalThis as { window?: unknown }).window = originalWindow
})

test("workspace client script wires run then submit and stores anonymous progress", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement(
    "",
    "def scaled_dot_product_attention(q, k, v, mask=None):\n    return q"
  )
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const nextPresentationStatus = createFakeElement(
    "Days until next presentation: pending submission."
  )
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const workspaceStatusPanel = createFakeElement()
  workspaceStatusPanel.className = "status-panel"
  const debugShellOutput = createFakeElement(
    "$ ready: run your code to inspect runtime and evaluator output."
  )
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["next-presentation-status", nextPresentationStatus],
    ["schedule-status", scheduleStatus],
    ["workspace-status-panel", workspaceStatusPanel],
    ["debug-shell-output", debugShellOutput]
  ])
  let storedProgressValue = JSON.stringify({
    version: 1,
    completedProblemIds: ["attention_scaled_dot_product_v1"],
    attemptHistory: [
      {
        problemId: "attention_scaled_dot_product_v1",
        correctness: "pass",
        submittedAt: "2026-02-15T18:00:00.000Z"
      }
    ]
  })
  const fetchCalls: FetchCall[] = []
  const fetchMock = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    fetchCalls.push({ input: inputText, init })

    if (inputText === "/api/runtime/run") {
      return createMockResponse({
        status: "success",
        message: "Run complete on toy tensors.",
        output: [
          [0.6, -0.7],
          [-0.2, 0.4]
        ]
      })
    }

    if (inputText === "/api/evaluator/evaluate") {
      return createMockResponse({
        correctness: "partial",
        explanation: "Shape is correct; value drift remains."
      })
    }

    if (inputText === "/api/session/submit") {
      return createMockResponse({
        nextState: {
          status: "done"
        },
        supportiveFeedback:
          "Session complete. You can return tomorrow for a fresh problem."
      })
    }

    if (inputText === "/api/progress/anonymous") {
      return createMockResponse({
        status: "ok"
      })
    }

    if (inputText === "/api/scheduler/decision") {
      return createMockResponse({
        nextIntervalDays: 4,
        resurfacingPriority: 0.38
      })
    }

    throw new Error(`Unexpected fetch input: ${inputText}`)
  }
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: fetchMock,
    localStorage: {
      getItem(key: string): string | null {
        if (key === "deepmlsr.anonymousProgress.v1") {
          return storedProgressValue
        }

        return null
      },
      setItem(key: string, value: string) {
        if (key === "deepmlsr.anonymousProgress.v1") {
          storedProgressValue = value
        }
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  const runClickHandler = runButton.handlers.get("click")
  const submitClickHandler = submitButton.handlers.get("click")

  assert.equal(typeof runClickHandler, "function")
  assert.equal(typeof submitClickHandler, "function")
  assert.equal(
    sessionStatus.textContent,
    "Session status: active. Previous anonymous completion found for this problem."
  )

  await runClickHandler?.()

  assert.equal(fetchCalls.length, 2)
  assert.equal(fetchCalls[0]?.input, "/api/runtime/run")
  assert.equal(fetchCalls[1]?.input, "/api/evaluator/evaluate")
  assert.equal(runStatus.textContent, "Run complete on toy tensors.")
  assert.equal(
    evaluationStatus.textContent,
    "Evaluation: partial - Shape is correct; value drift remains."
  )
  assert.equal(sessionStatus.textContent, "Session in progress.")
  assert.equal(
    scheduleStatus.textContent,
    "Scheduling details: waiting for submission."
  )
  assert.equal(debugShellOutput.textContent.includes("$ run #1"), true)
  assert.equal(debugShellOutput.textContent.includes("> runtime success"), true)
  assert.equal(debugShellOutput.textContent.includes("> evaluator: partial"), true)

  await submitClickHandler?.()

  assert.equal(fetchCalls.length, 5)
  assert.equal(fetchCalls[2]?.input, "/api/session/submit")
  assert.equal(fetchCalls[3]?.input, "/api/progress/anonymous")
  assert.equal(fetchCalls[4]?.input, "/api/scheduler/decision")

  const submitBody = JSON.parse(
    String(fetchCalls[2]?.init?.body ?? "{}")
  ) as {
    sessionId: string
    correctness: string
    problemId: string
  }

  assert.equal(submitBody.sessionId, "session-1733000000000")
  assert.equal(submitBody.correctness, "partial")
  assert.equal(submitBody.problemId, "attention_scaled_dot_product_v1")

  const savedLocalProgress = JSON.parse(storedProgressValue) as {
    version: number
    completedProblemIds: string[]
    attemptHistory: Array<{
      problemId: string
      correctness: string
      submittedAt: string
    }>
  }

  assert.equal(
    savedLocalProgress.completedProblemIds.includes(
      "attention_scaled_dot_product_v1"
    ),
    true
  )
  assert.equal(savedLocalProgress.version, 1)
  assert.equal(savedLocalProgress.attemptHistory.length, 2)
  assert.equal(savedLocalProgress.attemptHistory[1]?.problemId, "attention_scaled_dot_product_v1")
  assert.equal(savedLocalProgress.attemptHistory[1]?.correctness, "partial")
  assert.equal(typeof savedLocalProgress.attemptHistory[1]?.submittedAt, "string")

  const syncBody = JSON.parse(
    String(fetchCalls[3]?.init?.body ?? "{}")
  ) as {
    version: number
    completedProblemIds: string[]
    attemptHistory: Array<{
      problemId: string
      correctness: string
      submittedAt: string
    }>
  }

  assert.equal(syncBody.version, 1)
  assert.equal(syncBody.attemptHistory.length, 2)
  assert.equal(syncBody.completedProblemIds.includes("attention_scaled_dot_product_v1"), true)

  const schedulerBody = JSON.parse(
    String(fetchCalls[4]?.init?.body ?? "{}")
  ) as {
    correctness: string
    hintTierUsed: number
    priorSuccessfulCompletions: number
    timeSpentMinutes: number
    daysSinceLastExposure: number
  }

  assert.equal(schedulerBody.correctness, "partial")
  assert.equal(schedulerBody.hintTierUsed, 0)
  assert.equal(schedulerBody.priorSuccessfulCompletions, 1)
  assert.equal(schedulerBody.timeSpentMinutes, 1)
  assert.equal(schedulerBody.daysSinceLastExposure >= 0, true)
  assert.equal(
    sessionStatus.textContent,
    "Session status: done. Session complete. You can return tomorrow for a fresh problem."
  )
  assert.equal(
    nextPresentationStatus.textContent,
    "Days until next presentation: 4 day(s) (2024-12-04)."
  )
  assert.equal(
    scheduleStatus.textContent,
    "Scheduling details: resurfacing priority 0.38."
  )
  assert.equal(
    /(^|\s)is-celebrating(\s|$)/.test(workspaceStatusPanel.className),
    true
  )
  assert.equal(debugShellOutput.textContent.includes("$ submit"), true)
  assert.equal(debugShellOutput.textContent.includes("> submit accepted: done"), true)
  assert.equal(submitButton.disabled, false)
})

test("workspace client script uses static submission success state when reduced motion is preferred", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const nextPresentationStatus = createFakeElement(
    "Days until next presentation: pending submission."
  )
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const workspaceStatusPanel = createFakeElement()
  workspaceStatusPanel.className = "status-panel"
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["next-presentation-status", nextPresentationStatus],
    ["schedule-status", scheduleStatus],
    ["workspace-status-panel", workspaceStatusPanel]
  ])
  const fetchMock = async (
    input: string | URL | Request
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (inputText === "/api/session/submit") {
      return createMockResponse({
        nextState: {
          status: "done"
        },
        supportiveFeedback: "Session complete."
      })
    }

    if (inputText === "/api/progress/anonymous") {
      return createMockResponse({
        status: "ok"
      })
    }

    if (inputText === "/api/scheduler/decision") {
      return createMockResponse({
        nextIntervalDays: 2,
        resurfacingPriority: 0.11
      })
    }

    throw new Error(`Unexpected fetch input: ${inputText}`)
  }
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    window: {
      matchMedia() {
        return {
          matches: true
        }
      }
    },
    fetch: fetchMock,
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)
  await submitButton.handlers.get("click")?.()

  assert.equal(
    /(^|\s)is-celebrating(\s|$)/.test(workspaceStatusPanel.className),
    false
  )
  assert.equal(
    /(^|\s)is-celebrating-static(\s|$)/.test(workspaceStatusPanel.className),
    true
  )
  assert.equal(
    nextPresentationStatus.textContent,
    "Days until next presentation: 2 day(s) (2024-12-02)."
  )
})

test("workspace client script resets terminal output on each run", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const debugShellOutput = createFakeElement(
    "$ ready: run your code to inspect runtime and evaluator output."
  )
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["debug-shell-output", debugShellOutput]
  ])
  const fetchCalls: FetchCall[] = []
  const fetchMock = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    fetchCalls.push({ input: inputText, init })

    if (inputText === "/api/runtime/run") {
      return createMockResponse({
        status: "success",
        message: "Run complete on toy tensors.",
        output: [[1, 2]]
      })
    }

    if (inputText === "/api/evaluator/evaluate") {
      return createMockResponse({
        correctness: "pass",
        explanation: "All checks passed."
      })
    }

    throw new Error(`Unexpected fetch input: ${inputText}`)
  }
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: fetchMock,
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  await runButton.handlers.get("click")?.()
  await runButton.handlers.get("click")?.()

  assert.equal(fetchCalls.length, 4)
  assert.equal(fetchCalls[0]?.input, "/api/runtime/run")
  assert.equal(fetchCalls[1]?.input, "/api/evaluator/evaluate")
  assert.equal(fetchCalls[2]?.input, "/api/runtime/run")
  assert.equal(fetchCalls[3]?.input, "/api/evaluator/evaluate")
  assert.equal(debugShellOutput.textContent.includes("$ run #1"), false)
  assert.equal(debugShellOutput.textContent.includes("$ run #2"), true)
  assert.equal(
    debugShellOutput.textContent.includes("> evaluator: pass - All checks passed."),
    true
  )
})

test("workspace client script shows runtime stdout when run fails", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const debugShellOutput = createFakeElement(
    "$ ready: run your code to inspect runtime and evaluator output."
  )
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["debug-shell-output", debugShellOutput]
  ])
  const fetchMock = async (
    input: string | URL | Request
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (inputText === "/api/runtime/run") {
      return createMockResponse({
        status: "failure",
        errorCode: "EXECUTION_ERROR",
        message: "Code raised an exception while running: broken",
        runtimeStdout: "debug-line from print\\n",
        actionableSteps: ["Check traceback"]
      })
    }

    throw new Error(`Unexpected fetch input: ${inputText}`)
  }
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: fetchMock,
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  await runButton.handlers.get("click")?.()

  assert.equal(
    debugShellOutput.textContent.includes("> stdout:"),
    true
  )
  assert.equal(
    debugShellOutput.textContent.includes("debug-line from print"),
    true
  )
  assert.equal(
    debugShellOutput.textContent.includes("runtime failure"),
    true
  )
})

test("workspace client script auto-submits at 30-minute cap after timer start", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const startProblemButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const sessionTimerStatus = createFakeElement(
    "Session timer: not started (30:00 limit)."
  )
  const timerCapMessage = createFakeElement(
    "Timer starts when you click Start Problem or type your first character."
  )
  const debugShellOutput = createFakeElement(
    "$ ready: run your code to inspect runtime and evaluator output."
  )
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["start-problem-button", startProblemButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["session-timer-status", sessionTimerStatus],
    ["timer-cap-message", timerCapMessage],
    ["debug-shell-output", debugShellOutput]
  ])
  const fetchCalls: FetchCall[] = []
  const fetchMock = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    fetchCalls.push({ input: inputText, init })

    if (inputText === "/api/session/submit") {
      return createMockResponse({
        nextState: {
          status: "done"
        },
        supportiveFeedback: "Session complete."
      })
    }

    if (inputText === "/api/progress/anonymous") {
      return createMockResponse({
        status: "ok"
      })
    }

    if (inputText === "/api/scheduler/decision") {
      return createMockResponse({
        nextIntervalDays: 6,
        resurfacingPriority: 0.49
      })
    }

    throw new Error(`Unexpected fetch input: ${inputText}`)
  }
  let nowMs = 1_733_000_000_000
  let timerTick: unknown = null
  let clearedTimerId: number | null = null
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: fetchMock,
    setInterval(handler: () => void) {
      timerTick = handler
      return 99
    },
    clearInterval(timerId: number) {
      clearedTimerId = timerId
    },
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return nowMs
      }
    }
  })

  runWorkspaceClientScripts(context)

  await startProblemButton.handlers.get("click")?.()

  assert.equal(
    sessionTimerStatus.textContent,
    "Session timer: 30:00 remaining."
  )
  assert.equal(
    timerCapMessage.textContent,
    "Timer started. You can run as many experiments as you want before submit."
  )

  nowMs += 30 * 60 * 1000 + 1000
  assert.equal(typeof timerTick, "function")
  ;(timerTick as () => void)()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

  assert.equal(fetchCalls.length, 3)
  assert.equal(fetchCalls[0]?.input, "/api/session/submit")
  assert.equal(fetchCalls[1]?.input, "/api/progress/anonymous")
  assert.equal(fetchCalls[2]?.input, "/api/scheduler/decision")

  const submitBody = JSON.parse(
    String(fetchCalls[0]?.init?.body ?? "{}")
  ) as {
    correctness: string
  }

  assert.equal(submitBody.correctness, "fail")
  assert.equal(sessionStatus.textContent, "Session status: done. Session complete.")
  assert.equal(sessionTimerStatus.textContent, "Session timer: completed.")
  assert.equal(
    timerCapMessage.textContent,
    "30-minute cap reached. Your session was submitted automatically."
  )
  assert.equal(clearedTimerId, 99)
  assert.equal(
    debugShellOutput.textContent.includes("session cap reached (30:00)"),
    true
  )
})

test("workspace client script starts timer on first typed character in editor", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const startProblemButton = createFakeElement()
  const codeEditor = createFakeElement("", "")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const sessionTimerStatus = createFakeElement(
    "Session timer: not started (30:00 limit)."
  )
  const timerCapMessage = createFakeElement(
    "Timer starts when you click Start Problem or type your first character."
  )
  const debugShellOutput = createFakeElement(
    "$ ready: run your code to inspect runtime and evaluator output."
  )
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["start-problem-button", startProblemButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["session-timer-status", sessionTimerStatus],
    ["timer-cap-message", timerCapMessage],
    ["debug-shell-output", debugShellOutput]
  ])
  let timerTick: unknown = null
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: async () => {
      return createMockResponse({ status: "ok" })
    },
    setInterval(handler: () => void) {
      timerTick = handler
      return 101
    },
    clearInterval() {
      return undefined
    },
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  await codeEditor.handlers.get("keydown")?.({
    key: "a"
  })

  assert.equal(sessionTimerStatus.textContent, "Session timer: 30:00 remaining.")
  assert.equal(
    timerCapMessage.textContent,
    "Timer started. You can run as many experiments as you want before submit."
  )
  assert.equal(typeof timerTick, "function")
  assert.equal(debugShellOutput.textContent.includes("timer started via first-character"), true)
})

test("workspace client script keeps done-state messaging when anonymous sync fails", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus]
  ])
  const fetchCalls: FetchCall[] = []
  const fetchMock = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    fetchCalls.push({ input: inputText, init })

    if (inputText === "/api/runtime/run") {
      return createMockResponse({
        status: "success",
        message: "Run complete on toy tensors.",
        output: [[1]]
      })
    }

    if (inputText === "/api/evaluator/evaluate") {
      return createMockResponse({
        correctness: "pass",
        explanation: "All checks passed."
      })
    }

    if (inputText === "/api/session/submit") {
      return createMockResponse({
        nextState: {
          status: "done"
        },
        supportiveFeedback: "Session complete."
      })
    }

    if (inputText === "/api/progress/anonymous") {
      return createMockResponse({
        status: "ok"
      })
    }

    if (inputText === "/api/scheduler/decision") {
      throw new Error("scheduler unavailable")
    }

    throw new Error(`Unexpected fetch input: ${inputText}`)
  }
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: fetchMock,
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  await runButton.handlers.get("click")?.()
  await submitButton.handlers.get("click")?.()

  assert.equal(fetchCalls[3]?.input, "/api/progress/anonymous")
  assert.equal(fetchCalls[4]?.input, "/api/scheduler/decision")
  assert.equal(sessionStatus.textContent, "Session status: done. Session complete.")
  assert.equal(
    scheduleStatus.textContent,
    "Scheduling details: temporarily unavailable. Your session is still complete."
  )
  assert.equal(submitButton.disabled, false)
})

test("workspace client script inserts indentation when tab is pressed in editor", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("","def solve(x):\nreturn x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus]
  ])
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: async () => {
      return createMockResponse({ status: "ok" })
    },
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  const secondLineStart = codeEditor.value.indexOf("\n") + 1
  codeEditor.selectionStart = secondLineStart
  codeEditor.selectionEnd = secondLineStart
  let preventDefaultCalled = false

  await codeEditor.handlers.get("keydown")?.({
    key: "Tab",
    preventDefault() {
      preventDefaultCalled = true
    }
  })

  assert.equal(preventDefaultCalled, true)
  assert.equal(codeEditor.value, "def solve(x):\n  return x")
  assert.equal(codeEditor.selectionStart, secondLineStart + 2)
  assert.equal(codeEditor.selectionEnd, secondLineStart + 2)
})

test("workspace client script renders and refreshes syntax highlighting with editor edits", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement(
    "",
    "def solve(x):\n    pass"
  )
  const codeHighlight = createFakeElement("")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["starter-code-highlight", codeHighlight],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus]
  ])
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: async () => {
      return createMockResponse({ status: "ok" })
    },
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  assert.equal(codeHighlight.innerHTML.includes("token-keyword"), true)
  assert.equal(codeHighlight.innerHTML.includes("def"), true)
  assert.equal(codeHighlight.innerHTML.includes("pass"), true)

  codeEditor.value = "def solve(x):\n    return len(x) # note"
  await codeEditor.handlers.get("input")?.()

  assert.equal(codeHighlight.innerHTML.includes("token-keyword"), true)
  assert.equal(codeHighlight.innerHTML.includes("token-builtin"), true)
  assert.equal(codeHighlight.innerHTML.includes("token-comment"), true)
  assert.equal(codeHighlight.innerHTML.includes("return"), true)
  assert.equal(codeHighlight.innerHTML.includes("len"), true)
  assert.equal(codeHighlight.innerHTML.includes("# note"), true)

  codeEditor.scrollTop = 18
  codeEditor.scrollLeft = 7
  await codeEditor.handlers.get("scroll")?.()
  assert.equal(codeHighlight.scrollTop, 18)
  assert.equal(codeHighlight.scrollLeft, 7)
})

test("workspace client script toggles problem and question-bank tabs", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const workspaceTabProblem = createFakeElement()
  const workspaceTabLibrary = createFakeElement()
  const workspaceProblemTabPanel = createFakeElement()
  const workspaceLibraryTabPanel = createFakeElement()
  workspaceTabProblem.className = "workspace-tab is-active"
  workspaceTabLibrary.className = "workspace-tab"
  workspaceProblemTabPanel.hidden = false
  workspaceLibraryTabPanel.hidden = true

  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["workspace-tab-problem", workspaceTabProblem],
    ["workspace-tab-library", workspaceTabLibrary],
    ["workspace-problem-tab-panel", workspaceProblemTabPanel],
    ["workspace-library-tab-panel", workspaceLibraryTabPanel]
  ])
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: async () => {
      return createMockResponse({ status: "ok" })
    },
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  assert.equal(workspaceProblemTabPanel.hidden, false)
  assert.equal(workspaceLibraryTabPanel.hidden, true)
  assert.equal(workspaceTabProblem.className.includes("is-active"), true)
  assert.equal(workspaceTabLibrary.className.includes("is-active"), false)
  assert.equal(workspaceTabProblem.ariaSelected, "true")
  assert.equal(workspaceTabLibrary.ariaSelected, "false")

  await workspaceTabLibrary.handlers.get("click")?.()

  assert.equal(workspaceProblemTabPanel.hidden, true)
  assert.equal(workspaceLibraryTabPanel.hidden, false)
  assert.equal(workspaceTabProblem.className.includes("is-active"), false)
  assert.equal(workspaceTabLibrary.className.includes("is-active"), true)
  assert.equal(workspaceTabProblem.ariaSelected, "false")
  assert.equal(workspaceTabLibrary.ariaSelected, "true")

  await workspaceTabProblem.handlers.get("click")?.()

  assert.equal(workspaceProblemTabPanel.hidden, false)
  assert.equal(workspaceLibraryTabPanel.hidden, true)
  assert.equal(workspaceTabProblem.className.includes("is-active"), true)
  assert.equal(workspaceTabLibrary.className.includes("is-active"), false)
})

test("workspace client script reveals hints in order with supportive messaging", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const hintTier1Button = createFakeElement()
  const hintTier2Button = createFakeElement()
  const hintTier3Button = createFakeElement()
  const hintTier1Text = createFakeElement("Tier 1 hidden.")
  const hintTier2Text = createFakeElement("Tier 2 hidden.")
  const hintTier3Text = createFakeElement("Tier 3 hidden.")
  const hintStatus = createFakeElement(
    "Hint status: reveal tiers in order. Submission stays available."
  )
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  hintTier2Button.disabled = true
  hintTier3Button.disabled = true

  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }
      if (name === "data-hint-tier-1") {
        return "Start from tensor shapes."
      }
      if (name === "data-hint-tier-2") {
        return "Compute q @ k^T before mask and scale."
      }
      if (name === "data-hint-tier-3") {
        return "Apply softmax(scores / sqrt(d_k)) then multiply by v."
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["hint-tier-1-button", hintTier1Button],
    ["hint-tier-2-button", hintTier2Button],
    ["hint-tier-3-button", hintTier3Button],
    ["hint-tier-1-text", hintTier1Text],
    ["hint-tier-2-text", hintTier2Text],
    ["hint-tier-3-text", hintTier3Text],
    ["hint-status", hintStatus]
  ])
  const fetchCalls: FetchCall[] = []
  const fetchMock = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    fetchCalls.push({ input: inputText, init })

    return createMockResponse({
      status: "ok"
    })
  }
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: fetchMock,
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  await hintTier2Button.handlers.get("click")?.()
  assert.equal(
    hintStatus.textContent,
    "Hints unlock in order. Start with the next available tier."
  )
  assert.equal(hintTier2Text.textContent, "Tier 2 hidden.")

  await hintTier1Button.handlers.get("click")?.()
  assert.equal(
    hintTier1Text.textContent,
    "Tier 1 (Conceptual): Start from tensor shapes."
  )
  assert.equal(hintTier1Button.disabled, true)
  assert.equal(hintTier2Button.disabled, false)
  assert.equal(hintTier3Button.disabled, true)
  assert.equal(
    hintStatus.textContent,
    "Hint tier 1 revealed. You can still submit at any time."
  )

  await hintTier3Button.handlers.get("click")?.()
  assert.equal(hintTier3Text.textContent, "Tier 3 hidden.")
  assert.equal(
    hintStatus.textContent,
    "Hints unlock in order. Start with the next available tier."
  )

  await hintTier2Button.handlers.get("click")?.()
  assert.equal(
    hintTier2Text.textContent,
    "Tier 2 (Structural): Compute q @ k^T before mask and scale."
  )
  assert.equal(hintTier3Button.disabled, false)

  await hintTier3Button.handlers.get("click")?.()
  assert.equal(
    hintTier3Text.textContent,
    "Tier 3 (Near-code): Apply softmax(scores / sqrt(d_k)) then multiply by v."
  )
  assert.equal(
    hintStatus.textContent,
    "All hint tiers revealed. Submit whenever you are ready."
  )
  assert.equal(fetchCalls.length, 0)
})

test("workspace question library supports fuzzy search, type filtering, and suggest-topic modal submission", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const questionSearchInput = createFakeElement()
  const questionTypeFilter = createFakeElement("", "all")
  const questionLibraryResults = createFakeElement()
  const questionLibraryCount = createFakeElement("Showing 3 of 3 questions.")
  const suggestTopicButton = createFakeElement()
  const suggestTopicStatus = createFakeElement(
    "Suggest a topic and we can prioritize it in the next problem-pack refresh."
  )
  const suggestTopicModal = createFakeElement()
  suggestTopicModal.hidden = true
  const suggestTopicCloseButton = createFakeElement()
  const suggestTopicCancelButton = createFakeElement()
  const suggestTopicForm = createFakeElement()
  const suggestTopicModalFeedback = createFakeElement(
    "Fill in the required fields to submit a strong topic proposal."
  )
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
  const debugShellOutput = createFakeElement(
    "$ ready: run your code to inspect runtime and evaluator output."
  )
  const questionCatalogPayload = JSON.stringify([
    {
      id: "normalization_layernorm_forward_v1",
      title: "Implement LayerNorm Forward Pass",
      problemType: "Normalization",
      summary: "Normalize activations row-wise with epsilon stabilization.",
      estimatedMinutes: 25
    },
    {
      id: "attention_scaled_dot_product_core_v1",
      title: "Implement Scaled Dot-Product Attention Core",
      problemType: "Attention",
      summary: "Compute qk attention with optional masking on toy tensors.",
      estimatedMinutes: 30
    },
    {
      id: "mlp_affine_relu_step_v1",
      title: "Implement a Single MLP Affine + ReLU Step",
      problemType: "MLP",
      summary: "Compose affine transform and relu for toy tensors.",
      estimatedMinutes: 20
    }
  ])

  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }
      if (name === "data-question-catalog") {
        return questionCatalogPayload
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["question-search-input", questionSearchInput],
    ["question-type-filter", questionTypeFilter],
    ["question-library-results", questionLibraryResults],
    ["question-library-count", questionLibraryCount],
    ["suggest-topic-button", suggestTopicButton],
    ["suggest-topic-status", suggestTopicStatus],
    ["suggest-topic-modal", suggestTopicModal],
    ["suggest-topic-close-button", suggestTopicCloseButton],
    ["suggest-topic-cancel-button", suggestTopicCancelButton],
    ["suggest-topic-form", suggestTopicForm],
    ["suggest-topic-modal-feedback", suggestTopicModalFeedback],
    ["suggest-topic-title", suggestTopicTitleInput],
    ["suggest-topic-problem-type", suggestTopicProblemTypeInput],
    ["suggest-topic-difficulty", suggestTopicDifficultyInput],
    ["suggest-topic-learning-objective", suggestTopicLearningObjectiveInput],
    ["suggest-topic-context", suggestTopicContextInput],
    ["suggest-topic-input-spec", suggestTopicInputSpecInput],
    ["suggest-topic-output-spec", suggestTopicOutputSpecInput],
    ["suggest-topic-constraints", suggestTopicConstraintsInput],
    ["suggest-topic-starter-signature", suggestTopicStarterSignatureInput],
    ["suggest-topic-visible-tests", suggestTopicVisibleTestsInput],
    ["suggest-topic-hints", suggestTopicHintsInput],
    ["suggest-topic-paper-link", suggestTopicPaperLinkInput],
    ["suggest-topic-notes", suggestTopicNotesInput],
    ["debug-shell-output", debugShellOutput]
  ])
  const fetchCalls: FetchCall[] = []
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: async (
      input: string | URL | Request,
      init?: RequestInit
    ) => {
      const inputText =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      fetchCalls.push({ input: inputText, init })

      if (inputText === "/api/problems/suggest-topic") {
        return createMockResponse({
          status: "valid",
          summary: "ProblemSpecV2 validation passed.",
          errors: [],
          warnings: [],
          provisionalSpecId: "rotary_positional_embeddings_on_toy_tensors_v1"
        })
      }

      throw new Error(`Unexpected fetch input: ${inputText}`)
    },
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  assert.equal(questionLibraryCount.textContent, "Showing 3 of 3 questions.")
  assert.equal(
    questionLibraryResults.innerHTML.includes("Implement LayerNorm Forward Pass"),
    true
  )
  assert.equal(
    questionLibraryResults.innerHTML.includes("Implement Scaled Dot-Product Attention Core"),
    true
  )

  questionSearchInput.value = "lnfwd"
  await questionSearchInput.handlers.get("input")?.()

  assert.equal(questionLibraryCount.textContent, "Showing 1 of 3 questions.")
  assert.equal(
    questionLibraryResults.innerHTML.includes("Implement LayerNorm Forward Pass"),
    true
  )
  assert.equal(
    questionLibraryResults.innerHTML.includes("Scaled Dot-Product Attention"),
    false
  )

  questionSearchInput.value = ""
  await questionSearchInput.handlers.get("input")?.()
  questionTypeFilter.value = "Attention"
  await questionTypeFilter.handlers.get("change")?.()

  assert.equal(questionLibraryCount.textContent, "Showing 1 of 3 questions.")
  assert.equal(
    questionLibraryResults.innerHTML.includes("Scaled Dot-Product Attention Core"),
    true
  )
  assert.equal(
    questionLibraryResults.innerHTML.includes("LayerNorm Forward Pass"),
    false
  )

  await suggestTopicButton.handlers.get("click")?.()
  assert.equal(suggestTopicModal.hidden, false)
  assert.equal(suggestTopicProblemTypeInput.value, "Attention")
  assert.equal(
    suggestTopicStatus.textContent,
    "Topic suggestion modal opened for Attention."
  )
  assert.equal(
    suggestTopicModalFeedback.textContent,
    "Complete the required fields so we can turn this into a strong, runnable coding problem."
  )

  suggestTopicTitleInput.value = "Rotary Positional Embeddings On Toy Tensors"
  suggestTopicDifficultyInput.value = "Medium"
  suggestTopicLearningObjectiveInput.value =
    "Implement rotary embedding application and understand rotational invariance behavior."
  suggestTopicContextInput.value =
    "RoPE is used in transformer attention to encode relative token positions."
  suggestTopicInputSpecInput.value =
    "q and k have shape [seq_len, d_k], even d_k, toy float tensors."
  suggestTopicOutputSpecInput.value =
    "Return rotated q and k tensors preserving original shape and finite values."
  suggestTopicConstraintsInput.value =
    "Must handle seq_len 1, even dimensionality checks, and stable sin/cos operations."
  suggestTopicStarterSignatureInput.value =
    "def apply_rope(q, k, positions):"
  suggestTopicVisibleTestsInput.value =
    "Case 1 no rotation, Case 2 two-position rotation, Case 3 shape-preservation under batch."
  suggestTopicHintsInput.value =
    "Tier 1 shape pairing, Tier 2 even/odd channel split, Tier 3 sin/cos mix."
  suggestTopicPaperLinkInput.value = "https://arxiv.org/abs/2104.09864"
  suggestTopicNotesInput.value =
    "Keep problem atomic and toy-tensor only."

  let prevented = false
  await suggestTopicForm.handlers.get("submit")?.({
    preventDefault() {
      prevented = true
    }
  })

  assert.equal(prevented, true)
  assert.equal(suggestTopicModal.hidden, true)
  assert.equal(fetchCalls.length, 1)
  assert.equal(fetchCalls[0]?.input, "/api/problems/suggest-topic")
  assert.equal(
    JSON.parse(String(fetchCalls[0]?.init?.body ?? "{}")).title,
    "Rotary Positional Embeddings On Toy Tensors"
  )
  assert.equal(
    suggestTopicStatus.textContent,
    "Topic suggestion captured for Attention: Rotary Positional Embeddings On Toy Tensors."
  )
  assert.equal(
    debugShellOutput.textContent.includes("topic suggestion modal opened (Attention)"),
    true
  )
  assert.equal(
    debugShellOutput.textContent.includes("topic suggestion submitted: Attention | Medium | Rotary Positional Embeddings On Toy Tensors"),
    true
  )
})

test("workspace question library card click navigates to selected problem path", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const questionSearchInput = createFakeElement()
  const questionTypeFilter = createFakeElement("", "all")
  const questionLibraryResults = createFakeElement()
  const questionLibraryCount = createFakeElement("Showing 1 of 1 questions.")
  let assignedPath = ""

  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }
      if (name === "data-question-catalog") {
        return JSON.stringify([
          {
            id: "mlp_affine_relu_step_v1",
            title: "Implement a Single MLP Affine + ReLU Step",
            problemType: "MLP",
            summary: "Affine + relu on toy tensors.",
            estimatedMinutes: 20,
            problemPath: "/?problemId=mlp_affine_relu_step_v1"
          }
        ])
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["question-search-input", questionSearchInput],
    ["question-type-filter", questionTypeFilter],
    ["question-library-results", questionLibraryResults],
    ["question-library-count", questionLibraryCount]
  ])

  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: async () => {
      return createMockResponse({ status: "ok" })
    },
    location: {
      assign(path: string) {
        assignedPath = path
      }
    },
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

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

            return "/?problemId=mlp_affine_relu_step_v1"
          }
        }
      }
    }
  })

  assert.equal(prevented, true)
  assert.equal(assignedPath, "/?problemId=mlp_affine_relu_step_v1")
})

test("workspace client script marks visible test-case tabs as pass after successful run", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement(
    "",
    "def scaled_dot_product_attention(q, k, v, mask=None):\n    return q"
  )
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const debugShellOutput = createFakeElement(
    "$ ready: run your code to inspect runtime and evaluator output."
  )
  const testCaseTabCase1 = createFakeElement()
  const testCaseTabCase2 = createFakeElement()
  const testCaseStatusCase1 = createFakeElement("Not run")
  const testCaseStatusCase2 = createFakeElement("Not run")
  const testCasePanelCase1 = createFakeElement()
  const testCasePanelCase2 = createFakeElement()
  testCaseTabCase1.className = "test-case-tab is-active"
  testCaseTabCase2.className = "test-case-tab"
  testCasePanelCase1.hidden = false
  testCasePanelCase2.hidden = true
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }
      if (name === "data-visible-test-case-ids") {
        return JSON.stringify(["case_1_balanced_tokens", "case_2_causal_masking"])
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["debug-shell-output", debugShellOutput],
    ["test-case-tab-case_1_balanced_tokens", testCaseTabCase1],
    ["test-case-tab-case_2_causal_masking", testCaseTabCase2],
    ["test-case-status-case_1_balanced_tokens", testCaseStatusCase1],
    ["test-case-status-case_2_causal_masking", testCaseStatusCase2],
    ["test-case-panel-case_1_balanced_tokens", testCasePanelCase1],
    ["test-case-panel-case_2_causal_masking", testCasePanelCase2]
  ])
  const fetchMock = async (
    input: string | URL | Request
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (inputText === "/api/runtime/run") {
      return createMockResponse({
        status: "success",
        message: "Run complete on toy tensors.",
        output: [[1, 2]],
        testCaseResults: [
          {
            id: "case_1_balanced_tokens",
            passed: true
          },
          {
            id: "case_2_causal_masking",
            passed: false
          }
        ]
      })
    }

    if (inputText === "/api/evaluator/evaluate") {
      return createMockResponse({
        correctness: "partial",
        explanation: "One visible case still fails."
      })
    }

    throw new Error(`Unexpected fetch input: ${inputText}`)
  }
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: fetchMock,
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  await runButton.handlers.get("click")?.()

  assert.equal(testCaseTabCase1.className.includes("is-pass"), true)
  assert.equal(testCaseTabCase2.className.includes("is-pass"), false)
  assert.equal(testCaseStatusCase1.textContent, "Pass")
  assert.equal(testCaseStatusCase2.textContent, "Fail")
})

test("workspace client script submits problem flags with structured reason metadata", async () => {
  const runButton = createFakeElement()
  const submitButton = createFakeElement()
  const codeEditor = createFakeElement("", "def solve(x):\n    return x")
  const runStatus = createFakeElement("Run status: waiting for execution.")
  const evaluationStatus = createFakeElement(
    "Evaluation status: run code to generate feedback."
  )
  const sessionStatus = createFakeElement("Session status: active.")
  const scheduleStatus = createFakeElement("Scheduling details: pending submission.")
  const flagProblemButton = createFakeElement()
  const flagProblemReasonInput = createFakeElement("", "incorrect_output")
  const flagProblemNotesInput = createFakeElement(
    "",
    "Hidden deterministic case does not match expected value."
  )
  const flagProblemStatus = createFakeElement(
    "Spot an issue? Flag it and this card will be reviewed."
  )
  const debugShellOutput = createFakeElement(
    "$ ready: run your code to inspect runtime and evaluator output."
  )
  const workspaceRoot = {
    getAttribute(name: string): string | null {
      if (name === "data-problem-id") {
        return "attention_scaled_dot_product_v1"
      }
      if (name === "data-problem-version") {
        return "1"
      }

      return null
    }
  }
  const elements = new Map<string, FakeElement>([
    ["run-button", runButton],
    ["submit-button", submitButton],
    ["starter-code-editor", codeEditor],
    ["run-status", runStatus],
    ["evaluation-status", evaluationStatus],
    ["session-status", sessionStatus],
    ["schedule-status", scheduleStatus],
    ["flag-problem-button", flagProblemButton],
    ["flag-problem-reason", flagProblemReasonInput],
    ["flag-problem-notes", flagProblemNotesInput],
    ["flag-problem-status", flagProblemStatus],
    ["debug-shell-output", debugShellOutput]
  ])
  const fetchCalls: FetchCall[] = []
  const fetchMock = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const inputText =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    fetchCalls.push({ input: inputText, init })

    if (inputText === "/api/problems/flag") {
      return createMockResponse({
        status: "accepted",
        deduplicated: false,
        verificationStatus: "needs_review",
        triageAction: "status_updated_to_needs_review",
        reviewQueueSize: 1,
        message: "Flag recorded and card moved to needs_review."
      })
    }

    throw new Error(`Unexpected fetch input: ${inputText}`)
  }
  const context = createContext({
    document: {
      querySelector(selector: string) {
        if (selector === "[data-workspace-root]") {
          return workspaceRoot
        }

        return null
      },
      getElementById(id: string) {
        return elements.get(id) ?? null
      }
    },
    fetch: fetchMock,
    localStorage: {
      getItem() {
        return null
      },
      setItem() {
        return undefined
      }
    },
    Date: class extends Date {
      static override now(): number {
        return 1_733_000_000_000
      }
    }
  })

  runWorkspaceClientScripts(context)

  await flagProblemButton.handlers.get("click")?.()

  assert.equal(fetchCalls.length, 1)
  assert.equal(fetchCalls[0]?.input, "/api/problems/flag")

  const flagBody = JSON.parse(
    String(fetchCalls[0]?.init?.body ?? "{}")
  ) as {
    problemId: string
    problemVersion: number
    reason: string
    notes: string
    sessionId: string
  }
  assert.equal(flagBody.problemId, "attention_scaled_dot_product_v1")
  assert.equal(flagBody.problemVersion, 1)
  assert.equal(flagBody.reason, "incorrect_output")
  assert.equal(
    flagBody.notes,
    "Hidden deterministic case does not match expected value."
  )
  assert.equal(flagBody.sessionId, "session-1733000000000")
  assert.equal(
    flagProblemStatus.textContent,
    "Flag submitted. Verification status: needs_review."
  )
  assert.equal(
    debugShellOutput.textContent.includes("flag accepted"),
    true
  )
})
