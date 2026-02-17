/* Shared types for workspace client API contracts and lightweight DOM refs. */

export type WorkspaceCorrectness = "pass" | "partial" | "fail"
export type ProblemFlagReason =
  | "incorrect_output"
  | "ambiguous_prompt"
  | "insufficient_context"
  | "bad_hint"
  | "other"

export type ProgressAttemptLike = {
  problemId?: string
  correctness?: string
  submittedAt?: string
  [key: string]: unknown
}

export type ProgressSnapshotLike = {
  version: number
  completedProblemIds: string[]
  attemptHistory: ProgressAttemptLike[]
  [key: string]: unknown
}

export type AccountIdentity = {
  accountId: string
  email: string
  displayName: string | null
  createdAt: string
  optional: false
}

export type AccountSessionSnapshot = {
  sessionToken: string
  account: AccountIdentity
  expiresAt?: string | null
}

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

export type FlagProblemRequestPayload = {
  problemId: string
  problemVersion: number
  reason: ProblemFlagReason
  notes?: string
  sessionId: string
  evaluationCorrectness?: WorkspaceCorrectness
  evaluationExplanation?: string
}

export type FlagProblemResponsePayload = {
  status: "accepted"
  deduplicated: boolean
  verificationStatus: "verified" | "needs_review" | "rejected"
  triageAction: "queued_for_review" | "status_updated_to_needs_review"
  reviewQueueSize: number
  message: string
  flag?: {
    flagId: string
    problemId: string
  }
}

export type EventHandlerLike = (event?: unknown) => unknown

export type EventNodeLike = {
  addEventListener: (eventName: string, handler: EventHandlerLike) => void
}

export type AttributeNodeLike = {
  setAttribute?: (name: string, value: string) => void
}

export type TextNodeLike = {
  textContent: string
}

export type ClassNameNodeLike = {
  className: string
}

export type TabNodeLike = ClassNameNodeLike & {
  setAttribute?: (name: string, value: string) => void
  ariaSelected?: string | null
}

export type ButtonNodeLike = EventNodeLike & {
  disabled: boolean
}

export type ValueNodeLike = {
  value: string
}

export type InputNodeLike = EventNodeLike & ValueNodeLike

export type InnerHtmlNodeLike = {
  innerHTML: string
}

export type ScrollNodeLike = {
  scrollTop: number
  scrollLeft: number
}

export type PanelNodeLike = {
  hidden: boolean
}

export type KeyEventLike = {
  key?: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  preventDefault?: () => void
  target?: unknown
}

export type SimpleSubmitEventLike = {
  preventDefault?: () => void
}

export type DocumentNodeLike = {
  getElementById: (id: string) => unknown
}

export type QuestionCatalogEntry = {
  id: string
  title: string
  problemType: string
  summary: string
  estimatedMinutes: number
  schedulerWeight?: number
  problemPath?: string
}

export type VisibleTestCaseState = {
  statusLabel: string
  isPass: boolean
  isFail: boolean
}

export type VisibleTestCaseStateMap = Record<string, VisibleTestCaseState>

export type VisibleTestCaseSummary = {
  statusByCaseId: VisibleTestCaseStateMap
  passedCount: number
  totalCount: number
}

export type VisibleTestCaseResultLike = {
  id?: string
  passed?: boolean
  [key: string]: unknown
}

export type SuggestTopicFieldValues = {
  title: string
  problemType: string
  difficulty: string
  learningObjective: string
  context: string
  inputSpecification: string
  outputSpecification: string
  constraintsAndEdgeCases: string
  starterSignature: string
  visibleTestCasePlan: string
}

export type SuggestTopicValidationResult = {
  isValid: boolean
  missingLabels: string[]
}

export type SuggestTopicValidationRequestPayload = {
  title: string
  problemType: string
  difficulty: string
  learningObjective: string
  context: string
  inputSpecification: string
  outputSpecification: string
  constraintsAndEdgeCases: string
  starterSignature: string
  visibleTestCasePlan: string
  hints?: string
  paperLink?: string
  notes?: string
}

export type SuggestTopicValidationApiResponsePayload = {
  status: "valid" | "invalid"
  summary: string
  errors: string[]
  warnings: string[]
  provisionalSpecId: string
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
