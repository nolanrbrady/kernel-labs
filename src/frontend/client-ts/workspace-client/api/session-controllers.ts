/* Runtime/session API adapters and submission controllers. */

import { setText } from "../shared/dom-utils.js"
import type {
  ApiEnvelope,
  ButtonNodeLike,
  CodeEditorNodeLike,
  EvaluationPayload,
  FetchLike,
  ProgressSnapshotLike,
  RuntimeRunPayload,
  RuntimeRunSuccessPayload,
  SchedulerDecisionRequestPayload,
  SchedulerDecisionResponsePayload,
  SubmitSessionRequestPayload,
  SubmitSessionResponsePayload,
  FlagProblemRequestPayload,
  FlagProblemResponsePayload,
  SuggestTopicValidationRequestPayload,
  SuggestTopicValidationApiResponsePayload,
  TextNodeLike,
  WorkspaceCorrectness
} from "../shared/types.js"

type JsonMap = Record<string, unknown>

export type WorkspaceApiAdapters = {
  runRuntime: (
    problemId: string,
    userCode: string
  ) => Promise<ApiEnvelope<RuntimeRunPayload>>
  evaluateOutput: (
    problemId: string,
    candidateOutput: unknown
  ) => Promise<ApiEnvelope<EvaluationPayload>>
  submitSession: (
    payload: SubmitSessionRequestPayload
  ) => Promise<ApiEnvelope<SubmitSessionResponsePayload>>
  syncAnonymousProgress: (
    payload: ProgressSnapshotLike
  ) => Promise<ApiEnvelope<JsonMap>>
  requestSchedulerDecision: (
    payload: SchedulerDecisionRequestPayload
  ) => Promise<ApiEnvelope<SchedulerDecisionResponsePayload>>
  flagProblem: (
    payload: FlagProblemRequestPayload
  ) => Promise<ApiEnvelope<FlagProblemResponsePayload>>
  validateSuggestedTopic: (
    payload: SuggestTopicValidationRequestPayload
  ) => Promise<ApiEnvelope<SuggestTopicValidationApiResponsePayload>>
}

type CreateWorkspaceApiAdaptersOptions = {
  fetchImpl?: FetchLike | null
}

type SessionControllerOptions = {
  problemId: string
  codeEditor: CodeEditorNodeLike
  runButton: ButtonNodeLike | null
  runStatus: TextNodeLike | null
  evaluationStatus: TextNodeLike | null
  sessionStatus: TextNodeLike | null
  scheduleStatus: TextNodeLike | null
  api: Pick<WorkspaceApiAdapters, "runRuntime" | "evaluateOutput">
  appendDebugLine?: (text: string) => void
  formatDebugValue?: (value: unknown) => string
  resetVisibleTestCaseStatuses?: (statusLabel: string) => void
  applyVisibleTestCaseResults?: (results: unknown[] | undefined) => void
  nowProvider?: () => number
}

type SubmissionControllerOptions = {
  problemId: string
  submitButton: ButtonNodeLike | null
  sessionStatus: TextNodeLike | null
  scheduleStatus: TextNodeLike | null
  sessionTimerStatus: TextNodeLike | null
  timerCapMessage: TextNodeLike | null
  api: Pick<
    WorkspaceApiAdapters,
    "submitSession" | "syncAnonymousProgress" | "requestSchedulerDecision"
  >
  appendDebugLine?: (text: string) => void
  readLocalProgress: () => ProgressSnapshotLike
  persistAnonymousProgress: (
    correctness: WorkspaceCorrectness
  ) => ProgressSnapshotLike
  getPriorSuccessfulCompletions: (progress: ProgressSnapshotLike) => number
  getDaysSinceLastExposure: (progress: ProgressSnapshotLike) => number
  getSessionTimeSpentMinutes: () => number
  getHintTierUsed: () => number
  getSessionId: () => string
  getLastEvaluation: () => EvaluationPayload | null
  stopSessionTimer?: () => void
}

async function postJson<TPayload>(
  fetchImpl: FetchLike,
  endpoint: string,
  payload: unknown
): Promise<ApiEnvelope<TPayload>> {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  })

  const responsePayload = (await response.json()) as TPayload
  return {
    ok: response.ok,
    status: response.status,
    payload: responsePayload
  }
}

export function createWorkspaceApiAdapters(
  options: CreateWorkspaceApiAdaptersOptions = {}
): WorkspaceApiAdapters {
  const providedFetch = options.fetchImpl
  const fetchImpl =
    typeof providedFetch === "function"
      ? providedFetch
      : typeof globalThis.fetch === "function"
        ? globalThis.fetch.bind(globalThis)
        : null

  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API unavailable.")
  }

  return {
    runRuntime(problemId, userCode) {
      return postJson<RuntimeRunPayload>(fetchImpl, "/api/runtime/run", {
        problemId,
        userCode
      })
    },
    evaluateOutput(problemId, candidateOutput) {
      return postJson<EvaluationPayload>(fetchImpl, "/api/evaluator/evaluate", {
        problemId,
        candidateOutput
      })
    },
    submitSession(payload) {
      return postJson<SubmitSessionResponsePayload>(
        fetchImpl,
        "/api/session/submit",
        payload
      )
    },
    syncAnonymousProgress(payload) {
      return postJson<JsonMap>(fetchImpl, "/api/progress/anonymous", payload)
    },
    requestSchedulerDecision(payload) {
      return postJson<SchedulerDecisionResponsePayload>(
        fetchImpl,
        "/api/scheduler/decision",
        payload
      )
    },
    flagProblem(payload) {
      return postJson<FlagProblemResponsePayload>(
        fetchImpl,
        "/api/problems/flag",
        payload
      )
    },
    validateSuggestedTopic(payload) {
      return postJson<SuggestTopicValidationApiResponsePayload>(
        fetchImpl,
        "/api/problems/suggest-topic",
        payload
      )
    }
  }
}

function isRuntimeSuccessPayload(
  payload: RuntimeRunPayload
): payload is RuntimeRunSuccessPayload {
  return payload.status === "success"
}

export class SessionController {
  private readonly problemId: string
  private readonly codeEditor: CodeEditorNodeLike
  private readonly runButton: ButtonNodeLike | null
  private readonly runStatus: TextNodeLike | null
  private readonly evaluationStatus: TextNodeLike | null
  private readonly sessionStatus: TextNodeLike | null
  private readonly scheduleStatus: TextNodeLike | null
  private readonly api: Pick<WorkspaceApiAdapters, "runRuntime" | "evaluateOutput">
  private readonly appendDebugLine?: (text: string) => void
  private readonly formatDebugValue?: (value: unknown) => string
  private readonly resetVisibleTestCaseStatuses?: (statusLabel: string) => void
  private readonly applyVisibleTestCaseResults?: (
    results: unknown[] | undefined
  ) => void
  private readonly nowProvider: () => number
  private readonly sessionId: string

  private lastEvaluation: EvaluationPayload | null = null
  private runAttemptCount = 0

  constructor(options: SessionControllerOptions) {
    this.problemId = options.problemId
    this.codeEditor = options.codeEditor
    this.runButton = options.runButton
    this.runStatus = options.runStatus
    this.evaluationStatus = options.evaluationStatus
    this.sessionStatus = options.sessionStatus
    this.scheduleStatus = options.scheduleStatus
    this.api = options.api
    this.appendDebugLine = options.appendDebugLine
    this.formatDebugValue = options.formatDebugValue
    this.resetVisibleTestCaseStatuses = options.resetVisibleTestCaseStatuses
    this.applyVisibleTestCaseResults = options.applyVisibleTestCaseResults
    this.nowProvider = options.nowProvider ?? (() => Date.now())
    this.sessionId = `session-${this.nowProvider()}`
  }

  getSessionId(): string {
    return this.sessionId
  }

  getLastEvaluation(): EvaluationPayload | null {
    return this.lastEvaluation
  }

  private formatValueForDebug(value: unknown): string {
    if (typeof this.formatDebugValue === "function") {
      return this.formatDebugValue(value)
    }

    try {
      return JSON.stringify(value, null, 2)
    } catch (error) {
      return String(value)
    }
  }

  private readEditorCode(): string {
    if (typeof this.codeEditor.value === "string") {
      return this.codeEditor.value
    }

    return ""
  }

  private appendDebug(text: string): void {
    if (typeof this.appendDebugLine === "function") {
      this.appendDebugLine(text)
    }
  }

  private resetVisibleCases(statusLabel: string): void {
    if (typeof this.resetVisibleTestCaseStatuses === "function") {
      this.resetVisibleTestCaseStatuses(statusLabel)
    }
  }

  private applyVisibleCaseResults(results: unknown[] | undefined): void {
    if (typeof this.applyVisibleTestCaseResults === "function") {
      this.applyVisibleTestCaseResults(results)
    }
  }

  async runCurrentCode(): Promise<void> {
    if (this.runButton) {
      this.runButton.disabled = true
    }
    this.runAttemptCount += 1

    setText(this.runStatus, "Running code against toy tensors...")
    setText(this.evaluationStatus, "Awaiting evaluator result...")
    setText(this.sessionStatus, "Session in progress.")
    this.resetVisibleCases("Running...")
    this.appendDebug(`$ run #${this.runAttemptCount} (${this.problemId})`)
    this.appendDebug("> executing code against deterministic toy tensors...")
    setText(this.scheduleStatus, "Scheduling status: waiting for submission.")

    try {
      const runtimeResult = await this.api.runRuntime(
        this.problemId,
        this.readEditorCode()
      )
      const runtimePayload = runtimeResult.payload

      if (!runtimeResult.ok) {
        setText(this.runStatus, "Run unavailable right now. Please try again.")
        setText(this.evaluationStatus, "Evaluation skipped.")
        this.resetVisibleCases("Run unavailable")
        this.appendDebug(`! runtime unavailable: ${runtimeResult.status}`)
        return
      }

      if (!isRuntimeSuccessPayload(runtimePayload)) {
        setText(
          this.runStatus,
          runtimePayload.message || "Run needs one more iteration."
        )
        setText(
          this.evaluationStatus,
          "Evaluation skipped until run succeeds."
        )
        this.resetVisibleCases("Run failed")
        if (Array.isArray(runtimePayload.preloadedPackages)) {
          this.appendDebug(
            `> preloaded packages: ${runtimePayload.preloadedPackages.join(", ")}`
          )
        }
        if (
          typeof runtimePayload.runtimeStdout === "string" &&
          runtimePayload.runtimeStdout.trim().length > 0
        ) {
          this.appendDebug("> stdout:")
          this.appendDebug(runtimePayload.runtimeStdout.trimEnd())
        }
        this.appendDebug(
          `! runtime failure: ${
            runtimePayload.errorCode || "RUNTIME_FAILURE"
          } - ${runtimePayload.message || "Run failed."}`
        )
        if (Array.isArray(runtimePayload.actionableSteps)) {
          this.appendDebug(
            `> next steps: ${runtimePayload.actionableSteps.join(" | ")}`
          )
        }
        return
      }

      setText(this.runStatus, runtimePayload.message || "Run complete.")
      this.appendDebug(
        `> runtime success: ${runtimePayload.message || "Run complete."}`
      )
      if (Array.isArray(runtimePayload.preloadedPackages)) {
        this.appendDebug(
          `> preloaded packages: ${runtimePayload.preloadedPackages.join(", ")}`
        )
      }
      if (
        typeof runtimePayload.runtimeStdout === "string" &&
        runtimePayload.runtimeStdout.trim().length > 0
      ) {
        this.appendDebug("> stdout:")
        this.appendDebug(runtimePayload.runtimeStdout.trimEnd())
      }
      this.appendDebug("> output:")
      this.appendDebug(this.formatValueForDebug(runtimePayload.output))
      this.applyVisibleCaseResults(runtimePayload.testCaseResults)

      const evaluatorResult = await this.api.evaluateOutput(
        this.problemId,
        runtimePayload.output
      )
      const evaluatorPayload = evaluatorResult.payload

      if (!evaluatorResult.ok) {
        setText(this.evaluationStatus, "Evaluator unavailable right now.")
        this.appendDebug(`! evaluator unavailable: ${evaluatorResult.status}`)
        return
      }

      this.lastEvaluation = evaluatorPayload
      setText(
        this.evaluationStatus,
        `Evaluation: ${evaluatorPayload.correctness} - ${evaluatorPayload.explanation}`
      )
      this.appendDebug(
        `> evaluator: ${evaluatorPayload.correctness} - ${evaluatorPayload.explanation}`
      )
    } catch (error) {
      setText(
        this.runStatus,
        "Run encountered a temporary issue. You can still submit this session."
      )
      setText(this.evaluationStatus, "Evaluation unavailable for this run.")
      this.resetVisibleCases("Run interrupted")
      this.appendDebug("! runtime exception: temporary issue while running.")
    } finally {
      if (this.runButton) {
        this.runButton.disabled = false
      }
    }
  }

  bind(): void {
    if (!this.runButton) {
      return
    }

    this.runButton.addEventListener("click", () => {
      return this.runCurrentCode()
    })
  }
}

export class SubmissionController {
  private readonly problemId: string
  private readonly submitButton: ButtonNodeLike | null
  private readonly sessionStatus: TextNodeLike | null
  private readonly scheduleStatus: TextNodeLike | null
  private readonly sessionTimerStatus: TextNodeLike | null
  private readonly timerCapMessage: TextNodeLike | null
  private readonly api: Pick<
    WorkspaceApiAdapters,
    "submitSession" | "syncAnonymousProgress" | "requestSchedulerDecision"
  >
  private readonly appendDebugLine?: (text: string) => void
  private readonly readLocalProgress: () => ProgressSnapshotLike
  private readonly persistAnonymousProgress: (
    correctness: WorkspaceCorrectness
  ) => ProgressSnapshotLike
  private readonly getPriorSuccessfulCompletions: (
    progress: ProgressSnapshotLike
  ) => number
  private readonly getDaysSinceLastExposure: (
    progress: ProgressSnapshotLike
  ) => number
  private readonly getSessionTimeSpentMinutes: () => number
  private readonly getHintTierUsed: () => number
  private readonly getSessionId: () => string
  private readonly getLastEvaluation: () => EvaluationPayload | null
  private readonly stopSessionTimer?: () => void

  private sessionSubmitted = false
  private submissionInProgress = false

  constructor(options: SubmissionControllerOptions) {
    this.problemId = options.problemId
    this.submitButton = options.submitButton
    this.sessionStatus = options.sessionStatus
    this.scheduleStatus = options.scheduleStatus
    this.sessionTimerStatus = options.sessionTimerStatus
    this.timerCapMessage = options.timerCapMessage
    this.api = options.api
    this.appendDebugLine = options.appendDebugLine
    this.readLocalProgress = options.readLocalProgress
    this.persistAnonymousProgress = options.persistAnonymousProgress
    this.getPriorSuccessfulCompletions = options.getPriorSuccessfulCompletions
    this.getDaysSinceLastExposure = options.getDaysSinceLastExposure
    this.getSessionTimeSpentMinutes = options.getSessionTimeSpentMinutes
    this.getHintTierUsed = options.getHintTierUsed
    this.getSessionId = options.getSessionId
    this.getLastEvaluation = options.getLastEvaluation
    this.stopSessionTimer = options.stopSessionTimer
  }

  private isValidCorrectness(value: unknown): value is WorkspaceCorrectness {
    return value === "pass" || value === "partial" || value === "fail"
  }

  hasSubmitted(): boolean {
    return this.sessionSubmitted
  }

  isSubmissionInProgress(): boolean {
    return this.submissionInProgress
  }

  private appendDebug(text: string): void {
    if (typeof this.appendDebugLine === "function") {
      this.appendDebugLine(text)
    }
  }

  private async syncAnonymousProgress(
    progress: ProgressSnapshotLike
  ): Promise<void> {
    try {
      await this.api.syncAnonymousProgress(progress)
    } catch (error) {
      // noop: sync is best-effort and must not block session completion
    }
  }

  private async updateSchedulerDecision(
    correctness: WorkspaceCorrectness,
    priorProgress: ProgressSnapshotLike
  ): Promise<void> {
    setText(
      this.scheduleStatus,
      "Scheduling status: computing next resurfacing window..."
    )

    try {
      const schedulerResult = await this.api.requestSchedulerDecision({
        correctness,
        timeSpentMinutes: this.getSessionTimeSpentMinutes(),
        hintTierUsed: this.getHintTierUsed(),
        priorSuccessfulCompletions:
          this.getPriorSuccessfulCompletions(priorProgress),
        daysSinceLastExposure: this.getDaysSinceLastExposure(priorProgress)
      })
      const schedulerPayload = schedulerResult.payload

      if (!schedulerResult.ok) {
        setText(
          this.scheduleStatus,
          "Scheduling status: unavailable right now. A next problem will still be ready."
        )
        return
      }

      setText(
        this.scheduleStatus,
        `Scheduling status: next resurfacing in ${schedulerPayload.nextIntervalDays} day(s), priority ${schedulerPayload.resurfacingPriority}.`
      )
    } catch (error) {
      setText(
        this.scheduleStatus,
        "Scheduling status: temporarily unavailable. Your session is still complete."
      )
    }
  }

  async submitSession(submitSource: string): Promise<void> {
    if (this.sessionSubmitted || this.submissionInProgress) {
      return
    }

    this.submissionInProgress = true
    if (this.submitButton) {
      this.submitButton.disabled = true
    }

    const lastEvaluation = this.getLastEvaluation()
    const correctness: WorkspaceCorrectness =
      lastEvaluation && this.isValidCorrectness(lastEvaluation.correctness)
        ? lastEvaluation.correctness
        : "fail"
    const explanation =
      lastEvaluation && typeof lastEvaluation.explanation === "string"
        ? lastEvaluation.explanation
        : "Submitted without a completed successful run."
    const priorProgress = this.readLocalProgress()

    setText(this.sessionStatus, "Submitting session...")
    this.appendDebug(`$ submit (${this.problemId})`)
    setText(
      this.scheduleStatus,
      "Scheduling status: preparing scheduler decision..."
    )

    try {
      const submitResult = await this.api.submitSession({
        sessionId: this.getSessionId(),
        problemId: this.problemId,
        correctness,
        explanation
      })
      const submitPayload = submitResult.payload

      if (!submitResult.ok) {
        setText(
          this.sessionStatus,
          "Submission temporarily unavailable. Please retry."
        )
        if (submitSource === "timer-cap") {
          setText(
            this.timerCapMessage,
            "30 minutes reached. Auto-submit could not complete; please retry submit."
          )
        }
        return
      }

      this.sessionSubmitted = true
      if (typeof this.stopSessionTimer === "function") {
        this.stopSessionTimer()
      }
      setText(
        this.sessionStatus,
        `Session status: ${submitPayload.nextState.status}. ${submitPayload.supportiveFeedback}`
      )
      setText(this.sessionTimerStatus, "Session timer: completed.")
      if (submitSource === "timer-cap") {
        setText(
          this.timerCapMessage,
          "30-minute cap reached. Your session was submitted automatically."
        )
      }
      this.appendDebug(
        `> submit accepted: ${submitPayload.nextState.status} - ${submitPayload.supportiveFeedback}`
      )

      const updatedProgress = this.persistAnonymousProgress(correctness)
      await this.syncAnonymousProgress(updatedProgress)
      await this.updateSchedulerDecision(correctness, priorProgress)
    } catch (error) {
      setText(
        this.sessionStatus,
        "Submission encountered a temporary issue. Please retry."
      )
      if (submitSource === "timer-cap") {
        setText(
          this.timerCapMessage,
          "30 minutes reached. Auto-submit encountered an issue; please retry submit."
        )
      }
    } finally {
      this.submissionInProgress = false
      if (this.submitButton) {
        this.submitButton.disabled = false
      }
    }
  }

  bind(): void {
    if (!this.submitButton) {
      return
    }

    this.submitButton.addEventListener("click", () => {
      return this.submitSession("manual")
    })
  }
}
