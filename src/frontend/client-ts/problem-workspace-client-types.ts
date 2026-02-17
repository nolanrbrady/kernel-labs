/* Shared types for workspace client API contracts and lightweight DOM refs. */

export type WorkspaceCorrectness = "pass" | "partial" | "fail"

export type ProgressSnapshotLike = Record<string, unknown>

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type ApiEnvelope<TPayload> = {
  ok: boolean
  status: number
  payload: TPayload
}

export type RuntimeRunSuccessPayload = {
  status: "success"
  message?: string
  output: unknown
  preloadedPackages?: string[]
  runtimeStdout?: string
  testCaseResults?: unknown[]
}

export type RuntimeRunFailurePayload = {
  status?: string
  message?: string
  errorCode?: string
  actionableSteps?: string[]
  preloadedPackages?: string[]
  runtimeStdout?: string
}

export type RuntimeRunPayload =
  | RuntimeRunSuccessPayload
  | RuntimeRunFailurePayload

export type EvaluationPayload = {
  correctness: WorkspaceCorrectness
  explanation: string
}

export type SubmitSessionRequestPayload = {
  sessionId: string
  problemId: string
  correctness: WorkspaceCorrectness
  explanation: string
}

export type SubmitSessionResponsePayload = {
  nextState: {
    status: string
  }
  supportiveFeedback: string
}

export type SchedulerDecisionRequestPayload = {
  correctness: WorkspaceCorrectness
  timeSpentMinutes: number
  hintTierUsed: number
  priorSuccessfulCompletions: number
  daysSinceLastExposure: number
}

export type SchedulerDecisionResponsePayload = {
  nextIntervalDays: number
  resurfacingPriority: number
}

export type EventHandlerLike = (event?: unknown) => unknown

export type EventNodeLike = {
  addEventListener: (eventName: string, handler: EventHandlerLike) => void
}

export type TextNodeLike = {
  textContent: string
}

export type ClassNameNodeLike = {
  className: string
}

export type TabNodeLike = ClassNameNodeLike & {
  setAttribute?: (name: string, value: string) => void
  ariaSelected?: string
}

export type ButtonNodeLike = EventNodeLike & {
  disabled: boolean
}

export type CodeEditorNodeLike = EventNodeLike & {
  value: string
  selectionStart?: number
  selectionEnd?: number
  scrollTop?: number
  scrollLeft?: number
  setSelectionRange?: (start: number, end: number) => void
  focus?: () => void
}
