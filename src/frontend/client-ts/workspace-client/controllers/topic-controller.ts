/* Suggest-topic interaction controller for workspace client. */
import { setText, setClassFlag } from "../shared/dom-utils.js"
import type { SuggestTopicFormValidator } from "../domain/models.js"
import type {
  ClassNameNodeLike,
  EventHandlerLike,
  EventNodeLike,
  InputNodeLike,
  SimpleSubmitEventLike,
  SuggestTopicFieldValues,
  SuggestTopicValidationApiResponsePayload,
  SuggestTopicValidationRequestPayload,
  TextNodeLike,
  ValueNodeLike
} from "../shared/types.js"

type SuggestTopicModalNodeLike = ClassNameNodeLike & {
  hidden: boolean
}

type SuggestTopicControllerOptions = {
  validator: Pick<
    SuggestTopicFormValidator,
    "validateRequiredFields" | "buildCompletionSummary"
  >
  questionTypeFilter: InputNodeLike | null
  suggestTopicButton: EventNodeLike | null
  suggestTopicStatus: TextNodeLike | null
  suggestTopicModal: SuggestTopicModalNodeLike | null
  suggestTopicCloseButton: EventNodeLike | null
  suggestTopicCancelButton: EventNodeLike | null
  suggestTopicForm: EventNodeLike | null
  suggestTopicModalFeedback: TextNodeLike | null
  suggestTopicTitleInput: ValueNodeLike | null
  suggestTopicProblemTypeInput: ValueNodeLike | null
  suggestTopicDifficultyInput: ValueNodeLike | null
  suggestTopicLearningObjectiveInput: ValueNodeLike | null
  suggestTopicContextInput: ValueNodeLike | null
  suggestTopicInputSpecInput: ValueNodeLike | null
  suggestTopicOutputSpecInput: ValueNodeLike | null
  suggestTopicConstraintsInput: ValueNodeLike | null
  suggestTopicStarterSignatureInput: ValueNodeLike | null
  suggestTopicVisibleTestsInput: ValueNodeLike | null
  suggestTopicHintsInput: ValueNodeLike | null
  suggestTopicPaperLinkInput: ValueNodeLike | null
  suggestTopicNotesInput: ValueNodeLike | null
  api: {
    validateSuggestedTopic: (
      payload: SuggestTopicValidationRequestPayload
    ) => Promise<{
      ok: boolean
      status: number
      payload:
        | SuggestTopicValidationApiResponsePayload
        | { message?: string }
    }>
  }
  appendDebugLine?: (text: string) => void
}

export class SuggestTopicController {
  private readonly validator: SuggestTopicControllerOptions["validator"]
  private readonly questionTypeFilter: InputNodeLike | null
  private readonly suggestTopicButton: EventNodeLike | null
  private readonly suggestTopicStatus: TextNodeLike | null
  private readonly suggestTopicModal: SuggestTopicModalNodeLike | null
  private readonly suggestTopicCloseButton: EventNodeLike | null
  private readonly suggestTopicCancelButton: EventNodeLike | null
  private readonly suggestTopicForm: EventNodeLike | null
  private readonly suggestTopicModalFeedback: TextNodeLike | null
  private readonly suggestTopicTitleInput: ValueNodeLike | null
  private readonly suggestTopicProblemTypeInput: ValueNodeLike | null
  private readonly suggestTopicDifficultyInput: ValueNodeLike | null
  private readonly suggestTopicLearningObjectiveInput: ValueNodeLike | null
  private readonly suggestTopicContextInput: ValueNodeLike | null
  private readonly suggestTopicInputSpecInput: ValueNodeLike | null
  private readonly suggestTopicOutputSpecInput: ValueNodeLike | null
  private readonly suggestTopicConstraintsInput: ValueNodeLike | null
  private readonly suggestTopicStarterSignatureInput: ValueNodeLike | null
  private readonly suggestTopicVisibleTestsInput: ValueNodeLike | null
  private readonly suggestTopicHintsInput: ValueNodeLike | null
  private readonly suggestTopicPaperLinkInput: ValueNodeLike | null
  private readonly suggestTopicNotesInput: ValueNodeLike | null
  private readonly api: SuggestTopicControllerOptions["api"]
  private readonly appendDebugLine?: (text: string) => void

  constructor(options: SuggestTopicControllerOptions) {
    this.validator = options.validator
    this.questionTypeFilter = options.questionTypeFilter
    this.suggestTopicButton = options.suggestTopicButton
    this.suggestTopicStatus = options.suggestTopicStatus
    this.suggestTopicModal = options.suggestTopicModal
    this.suggestTopicCloseButton = options.suggestTopicCloseButton
    this.suggestTopicCancelButton = options.suggestTopicCancelButton
    this.suggestTopicForm = options.suggestTopicForm
    this.suggestTopicModalFeedback = options.suggestTopicModalFeedback
    this.suggestTopicTitleInput = options.suggestTopicTitleInput
    this.suggestTopicProblemTypeInput = options.suggestTopicProblemTypeInput
    this.suggestTopicDifficultyInput = options.suggestTopicDifficultyInput
    this.suggestTopicLearningObjectiveInput =
      options.suggestTopicLearningObjectiveInput
    this.suggestTopicContextInput = options.suggestTopicContextInput
    this.suggestTopicInputSpecInput = options.suggestTopicInputSpecInput
    this.suggestTopicOutputSpecInput = options.suggestTopicOutputSpecInput
    this.suggestTopicConstraintsInput = options.suggestTopicConstraintsInput
    this.suggestTopicStarterSignatureInput =
      options.suggestTopicStarterSignatureInput
    this.suggestTopicVisibleTestsInput = options.suggestTopicVisibleTestsInput
    this.suggestTopicHintsInput = options.suggestTopicHintsInput
    this.suggestTopicPaperLinkInput = options.suggestTopicPaperLinkInput
    this.suggestTopicNotesInput = options.suggestTopicNotesInput
    this.api = options.api
    this.appendDebugLine = options.appendDebugLine
  }

  private readInputValue(inputNode: ValueNodeLike | null | undefined): string {
    if (!inputNode || typeof inputNode.value !== "string") {
      return ""
    }

    return inputNode.value.trim()
  }

  private appendDebug(text: string): void {
    if (typeof this.appendDebugLine === "function") {
      this.appendDebugLine(text)
    }
  }

  setSuggestTopicModalOpen(isOpen: boolean): void {
    if (!this.suggestTopicModal) {
      return
    }

    this.suggestTopicModal.hidden = !isOpen
    setClassFlag(this.suggestTopicModal, "is-open", isOpen)
  }

  openModalFromButton(): void {
    const selectedType =
      this.questionTypeFilter && typeof this.questionTypeFilter.value === "string"
        ? this.questionTypeFilter.value
        : "all"
    const selectedTypeLabel =
      selectedType === "all" ? "all problem types" : selectedType

    if (this.suggestTopicProblemTypeInput && selectedType !== "all") {
      this.suggestTopicProblemTypeInput.value = selectedType
    }

    if (this.suggestTopicModal) {
      this.setSuggestTopicModalOpen(true)
      if (this.suggestTopicModalFeedback) {
        setText(
          this.suggestTopicModalFeedback,
          "Complete the required fields so we can turn this into a strong, runnable coding problem."
        )
      }
      setText(
        this.suggestTopicStatus,
        `Topic suggestion modal opened for ${selectedTypeLabel}.`
      )
      this.appendDebug(`> topic suggestion modal opened (${selectedTypeLabel}).`)
      return
    }

    setText(
      this.suggestTopicStatus,
      `Thanks. Topic suggestion mode is queued for ${selectedTypeLabel}.`
    )
    this.appendDebug(
      `> topic suggestion requested from question library (${selectedTypeLabel}).`
    )
  }

  async submitForm(event?: SimpleSubmitEventLike): Promise<void> {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault()
    }

    const fieldValues: SuggestTopicFieldValues = {
      title: this.readInputValue(this.suggestTopicTitleInput),
      problemType: this.readInputValue(this.suggestTopicProblemTypeInput),
      difficulty: this.readInputValue(this.suggestTopicDifficultyInput),
      learningObjective: this.readInputValue(this.suggestTopicLearningObjectiveInput),
      context: this.readInputValue(this.suggestTopicContextInput),
      inputSpecification: this.readInputValue(this.suggestTopicInputSpecInput),
      outputSpecification: this.readInputValue(this.suggestTopicOutputSpecInput),
      constraintsAndEdgeCases: this.readInputValue(this.suggestTopicConstraintsInput),
      starterSignature: this.readInputValue(this.suggestTopicStarterSignatureInput),
      visibleTestCasePlan: this.readInputValue(this.suggestTopicVisibleTestsInput)
    }
    const validation = this.validator.validateRequiredFields(fieldValues)

    if (!validation.isValid) {
      if (this.suggestTopicModalFeedback) {
        setText(
          this.suggestTopicModalFeedback,
          `Please complete: ${validation.missingLabels.join(", ")}.`
        )
      }
      setText(
        this.suggestTopicStatus,
        "Topic suggestion needs more detail before it can be queued."
      )
      this.appendDebug("> topic suggestion form incomplete.")
      return
    }

    const problemTypeValue = this.readInputValue(this.suggestTopicProblemTypeInput)
    const titleValue = this.readInputValue(this.suggestTopicTitleInput)
    const difficultyValue = this.readInputValue(this.suggestTopicDifficultyInput)
    const paperLinkValue = this.readInputValue(this.suggestTopicPaperLinkInput)
    const hintsValue = this.readInputValue(this.suggestTopicHintsInput)
    const notesValue = this.readInputValue(this.suggestTopicNotesInput)

    if (this.suggestTopicModalFeedback) {
      setText(
        this.suggestTopicModalFeedback,
        "Running ProblemSpecV2 validation on your suggestion..."
      )
    }
    setText(
      this.suggestTopicStatus,
      "Validating topic suggestion against ProblemSpecV2..."
    )

    let validationPayload: SuggestTopicValidationApiResponsePayload | null = null
    try {
      const validationResponse = await this.api.validateSuggestedTopic({
        ...fieldValues,
        hints: hintsValue,
        paperLink: paperLinkValue,
        notes: notesValue
      })

      if (!validationResponse.ok) {
        const failurePayload = validationResponse.payload as { message?: string }
        setText(
          this.suggestTopicStatus,
          failurePayload.message ??
            "Topic suggestion validation is temporarily unavailable."
        )
        if (this.suggestTopicModalFeedback) {
          setText(
            this.suggestTopicModalFeedback,
            "Validation service unavailable. Please retry in a moment."
          )
        }
        this.appendDebug("> topic suggestion validation unavailable.")
        return
      }

      validationPayload =
        validationResponse.payload as SuggestTopicValidationApiResponsePayload
    } catch (_error) {
      setText(
        this.suggestTopicStatus,
        "Topic suggestion validation encountered a temporary issue."
      )
      if (this.suggestTopicModalFeedback) {
        setText(
          this.suggestTopicModalFeedback,
          "Validation service unavailable. Please retry in a moment."
        )
      }
      this.appendDebug("> topic suggestion validation exception.")
      return
    }

    if (validationPayload.status === "invalid") {
      const topErrors = validationPayload.errors.slice(0, 3)
      if (this.suggestTopicModalFeedback) {
        setText(
          this.suggestTopicModalFeedback,
          topErrors.length > 0
            ? `ProblemSpecV2 requirements not met: ${topErrors.join(" | ")}`
            : "ProblemSpecV2 requirements not met. Add more detail and retry."
        )
      }
      setText(
        this.suggestTopicStatus,
        "Topic suggestion needs more detail to satisfy ProblemSpecV2."
      )
      this.appendDebug(
        `> topic suggestion rejected by ProblemSpecV2: ${validationPayload.errors.length} error(s).`
      )
      return
    }

    const completionSummary = this.validator.buildCompletionSummary(
      problemTypeValue,
      titleValue
    )

    setText(this.suggestTopicStatus, completionSummary)
    if (this.suggestTopicModalFeedback) {
      setText(
        this.suggestTopicModalFeedback,
        "Captured and validated against ProblemSpecV2. The card remains needs_review until publish checks pass."
      )
    }

    this.appendDebug(
      `> topic suggestion submitted: ${problemTypeValue} | ${difficultyValue} | ${titleValue}`
    )
    this.appendDebug(
      `> topic suggestion ProblemSpecV2: ${validationPayload.summary} (${validationPayload.provisionalSpecId})`
    )
    if (validationPayload.warnings.length > 0) {
      this.appendDebug(
        `> topic suggestion warnings: ${validationPayload.warnings.slice(0, 3).join(" | ")}`
      )
    }
    if (paperLinkValue) {
      this.appendDebug(`> suggested paper: ${paperLinkValue}`)
    }
    if (hintsValue) {
      this.appendDebug("> hint scaffold provided.")
    }
    if (notesValue) {
      this.appendDebug("> additional notes captured.")
    }

    this.setSuggestTopicModalOpen(false)
  }

  bind(): void {
    if (this.suggestTopicButton && this.suggestTopicStatus) {
      this.suggestTopicButton.addEventListener(
        "click",
        this.openModalFromButton.bind(this)
      )
    }

    if (this.suggestTopicCloseButton) {
      this.suggestTopicCloseButton.addEventListener("click", () => {
        this.setSuggestTopicModalOpen(false)
        if (this.suggestTopicStatus) {
          setText(
            this.suggestTopicStatus,
            "Topic suggestion modal closed. Reopen it any time from Suggest a Topic."
          )
        }
      })
    }

    if (this.suggestTopicCancelButton) {
      this.suggestTopicCancelButton.addEventListener("click", () => {
        this.setSuggestTopicModalOpen(false)
        if (this.suggestTopicStatus) {
          setText(
            this.suggestTopicStatus,
            "Topic suggestion canceled. Reopen the modal when ready."
          )
        }
      })
    }

    if (this.suggestTopicForm && this.suggestTopicStatus) {
      this.suggestTopicForm.addEventListener(
        "submit",
        this.submitForm.bind(this) as EventHandlerLike
      )
    }
  }
}
