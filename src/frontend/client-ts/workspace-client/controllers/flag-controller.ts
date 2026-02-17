/* Problem-flag interaction controller for workspace client. */
import { setText } from "../shared/dom-utils.js"
import type {
  ButtonNodeLike,
  FlagProblemRequestPayload,
  FlagProblemResponsePayload,
  InputNodeLike,
  ProblemFlagReason,
  TextNodeLike,
  WorkspaceCorrectness
} from "../shared/types.js"

type FlagNotesNodeLike = {
  value: string
}

type EvaluationSnapshot = {
  correctness: WorkspaceCorrectness
  explanation: string
}

type FlagProblemControllerOptions = {
  problemId: string
  problemVersion: number
  flagProblemButton: ButtonNodeLike | null
  flagProblemReasonInput: InputNodeLike | null
  flagProblemNotesInput: FlagNotesNodeLike | null
  flagProblemStatus: TextNodeLike | null
  api: {
    flagProblem: (
      payload: FlagProblemRequestPayload
    ) => Promise<{
      ok: boolean
      status: number
      payload: FlagProblemResponsePayload | { message?: string }
    }>
  }
  getSessionId: () => string
  getLastEvaluation: () => EvaluationSnapshot | null
  appendDebugLine?: (text: string) => void
}

const VALID_REASONS: ProblemFlagReason[] = [
  "incorrect_output",
  "ambiguous_prompt",
  "insufficient_context",
  "bad_hint",
  "other"
]

export class ProblemFlagController {
  private readonly problemId: string
  private readonly problemVersion: number
  private readonly flagProblemButton: ButtonNodeLike | null
  private readonly flagProblemReasonInput: InputNodeLike | null
  private readonly flagProblemNotesInput: FlagNotesNodeLike | null
  private readonly flagProblemStatus: TextNodeLike | null
  private readonly api: FlagProblemControllerOptions["api"]
  private readonly getSessionId: () => string
  private readonly getLastEvaluation: () => EvaluationSnapshot | null
  private readonly appendDebugLine?: (text: string) => void

  private submissionInFlight = false

  constructor(options: FlagProblemControllerOptions) {
    this.problemId = options.problemId
    this.problemVersion = options.problemVersion
    this.flagProblemButton = options.flagProblemButton
    this.flagProblemReasonInput = options.flagProblemReasonInput
    this.flagProblemNotesInput = options.flagProblemNotesInput
    this.flagProblemStatus = options.flagProblemStatus
    this.api = options.api
    this.getSessionId = options.getSessionId
    this.getLastEvaluation = options.getLastEvaluation
    this.appendDebugLine = options.appendDebugLine
  }

  private appendDebug(text: string): void {
    if (typeof this.appendDebugLine === "function") {
      this.appendDebugLine(text)
    }
  }

  private readReason(): ProblemFlagReason {
    const reasonValue = this.flagProblemReasonInput?.value
    if (VALID_REASONS.includes(reasonValue as ProblemFlagReason)) {
      return reasonValue as ProblemFlagReason
    }

    return "incorrect_output"
  }

  private readNotes(): string {
    const notesValue = this.flagProblemNotesInput?.value
    if (typeof notesValue !== "string") {
      return ""
    }

    return notesValue.trim()
  }

  private setStatus(text: string): void {
    setText(this.flagProblemStatus, text)
  }

  async submitFlag(): Promise<void> {
    if (this.submissionInFlight) {
      return
    }

    this.submissionInFlight = true
    if (this.flagProblemButton) {
      this.flagProblemButton.disabled = true
    }

    const reason = this.readReason()
    const notes = this.readNotes()
    const lastEvaluation = this.getLastEvaluation()

    this.appendDebug(`$ flag (${this.problemId})`)
    this.setStatus("Submitting flag for review...")

    try {
      const response = await this.api.flagProblem({
        problemId: this.problemId,
        problemVersion: this.problemVersion,
        reason,
        notes,
        sessionId: this.getSessionId(),
        evaluationCorrectness: lastEvaluation?.correctness,
        evaluationExplanation: lastEvaluation?.explanation
      })

      if (!response.ok) {
        const failurePayload = response.payload as { message?: string }
        this.setStatus(
          failurePayload.message ??
            "Flag submission was unavailable. Please try again in a moment."
        )
        this.appendDebug(`! flag submission unavailable (${response.status})`)
        return
      }

      const payload = response.payload as FlagProblemResponsePayload
      this.setStatus(
        payload.deduplicated
          ? "Duplicate flag noted. Existing review item is already queued."
          : `Flag submitted. Verification status: ${payload.verificationStatus}.`
      )
      this.appendDebug(
        `> flag accepted: ${payload.triageAction} (${payload.verificationStatus})`
      )
    } catch (_error) {
      this.setStatus(
        "Flag submission encountered a temporary issue. Please try again."
      )
      this.appendDebug("! flag submission exception")
    } finally {
      this.submissionInFlight = false
      if (this.flagProblemButton) {
        this.flagProblemButton.disabled = false
      }
    }
  }

  bind(): void {
    if (!this.flagProblemButton) {
      return
    }

    this.flagProblemButton.addEventListener("click", () => {
      return this.submitFlag()
    })
  }
}
