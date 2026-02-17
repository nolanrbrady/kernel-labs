// @ts-nocheck
/* Suggest-topic interaction controller for workspace client. */
import { setText, setClassFlag } from "./problem-workspace-client-controller-shared.js";

  class SuggestTopicController {
    constructor(options) {
      this.validator = options.validator;
      this.questionTypeFilter = options.questionTypeFilter;
      this.suggestTopicButton = options.suggestTopicButton;
      this.suggestTopicStatus = options.suggestTopicStatus;
      this.suggestTopicModal = options.suggestTopicModal;
      this.suggestTopicCloseButton = options.suggestTopicCloseButton;
      this.suggestTopicCancelButton = options.suggestTopicCancelButton;
      this.suggestTopicForm = options.suggestTopicForm;
      this.suggestTopicModalFeedback = options.suggestTopicModalFeedback;
      this.suggestTopicTitleInput = options.suggestTopicTitleInput;
      this.suggestTopicProblemTypeInput = options.suggestTopicProblemTypeInput;
      this.suggestTopicDifficultyInput = options.suggestTopicDifficultyInput;
      this.suggestTopicLearningObjectiveInput =
        options.suggestTopicLearningObjectiveInput;
      this.suggestTopicContextInput = options.suggestTopicContextInput;
      this.suggestTopicInputSpecInput = options.suggestTopicInputSpecInput;
      this.suggestTopicOutputSpecInput = options.suggestTopicOutputSpecInput;
      this.suggestTopicConstraintsInput = options.suggestTopicConstraintsInput;
      this.suggestTopicStarterSignatureInput =
        options.suggestTopicStarterSignatureInput;
      this.suggestTopicVisibleTestsInput = options.suggestTopicVisibleTestsInput;
      this.suggestTopicHintsInput = options.suggestTopicHintsInput;
      this.suggestTopicPaperLinkInput = options.suggestTopicPaperLinkInput;
      this.suggestTopicNotesInput = options.suggestTopicNotesInput;
      this.appendDebugLine = options.appendDebugLine;
    }

    readInputValue(inputNode) {
      if (!inputNode || typeof inputNode.value !== "string") {
        return "";
      }

      return inputNode.value.trim();
    }

    setSuggestTopicModalOpen(isOpen) {
      if (!this.suggestTopicModal) {
        return;
      }

      this.suggestTopicModal.hidden = !isOpen;
      setClassFlag(this.suggestTopicModal, "is-open", isOpen);
    }

    openModalFromButton() {
      var selectedType =
        this.questionTypeFilter && typeof this.questionTypeFilter.value === "string"
          ? this.questionTypeFilter.value
          : "all";
      var selectedTypeLabel = selectedType === "all" ? "all problem types" : selectedType;

      if (this.suggestTopicProblemTypeInput && selectedType !== "all") {
        this.suggestTopicProblemTypeInput.value = selectedType;
      }

      if (this.suggestTopicModal) {
        this.setSuggestTopicModalOpen(true);
        if (this.suggestTopicModalFeedback) {
          setText(
            this.suggestTopicModalFeedback,
            "Complete the required fields so we can turn this into a strong, runnable coding problem."
          );
        }
        setText(
          this.suggestTopicStatus,
          "Topic suggestion modal opened for " + selectedTypeLabel + "."
        );
        if (typeof this.appendDebugLine === "function") {
          this.appendDebugLine("> topic suggestion modal opened (" + selectedTypeLabel + ").");
        }
        return;
      }

      setText(
        this.suggestTopicStatus,
        "Thanks. Topic suggestion mode is queued for " + selectedTypeLabel + "."
      );
      if (typeof this.appendDebugLine === "function") {
        this.appendDebugLine(
          "> topic suggestion requested from question library (" + selectedTypeLabel + ")."
        );
      }
    }

    submitForm(event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      var fieldValues = {
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
      };
      var validation = this.validator.validateRequiredFields(fieldValues);

      if (!validation.isValid) {
        if (this.suggestTopicModalFeedback) {
          setText(
            this.suggestTopicModalFeedback,
            "Please complete: " + validation.missingLabels.join(", ") + "."
          );
        }
        setText(
          this.suggestTopicStatus,
          "Topic suggestion needs more detail before it can be queued."
        );
        if (typeof this.appendDebugLine === "function") {
          this.appendDebugLine("> topic suggestion form incomplete.");
        }
        return;
      }

      var problemTypeValue = this.readInputValue(this.suggestTopicProblemTypeInput);
      var titleValue = this.readInputValue(this.suggestTopicTitleInput);
      var difficultyValue = this.readInputValue(this.suggestTopicDifficultyInput);
      var paperLinkValue = this.readInputValue(this.suggestTopicPaperLinkInput);
      var hintsValue = this.readInputValue(this.suggestTopicHintsInput);
      var notesValue = this.readInputValue(this.suggestTopicNotesInput);
      var completionSummary = this.validator.buildCompletionSummary(
        problemTypeValue,
        titleValue
      );

      setText(this.suggestTopicStatus, completionSummary);
      if (this.suggestTopicModalFeedback) {
        setText(
          this.suggestTopicModalFeedback,
          "Captured. We can convert this into a deterministic, testable problem spec."
        );
      }

      if (typeof this.appendDebugLine === "function") {
        this.appendDebugLine(
          "> topic suggestion submitted: " +
            problemTypeValue +
            " | " +
            difficultyValue +
            " | " +
            titleValue
        );
        if (paperLinkValue) {
          this.appendDebugLine("> suggested paper: " + paperLinkValue);
        }
        if (hintsValue) {
          this.appendDebugLine("> hint scaffold provided.");
        }
        if (notesValue) {
          this.appendDebugLine("> additional notes captured.");
        }
      }

      this.setSuggestTopicModalOpen(false);
    }

    bind() {
      if (this.suggestTopicButton && this.suggestTopicStatus) {
        this.suggestTopicButton.addEventListener(
          "click",
          this.openModalFromButton.bind(this)
        );
      }

      if (this.suggestTopicCloseButton) {
        this.suggestTopicCloseButton.addEventListener(
          "click",
          function () {
            this.setSuggestTopicModalOpen(false);
            if (this.suggestTopicStatus) {
              setText(
                this.suggestTopicStatus,
                "Topic suggestion modal closed. Reopen it any time from Suggest a Topic."
              );
            }
          }.bind(this)
        );
      }

      if (this.suggestTopicCancelButton) {
        this.suggestTopicCancelButton.addEventListener(
          "click",
          function () {
            this.setSuggestTopicModalOpen(false);
            if (this.suggestTopicStatus) {
              setText(
                this.suggestTopicStatus,
                "Topic suggestion canceled. Reopen the modal when ready."
              );
            }
          }.bind(this)
        );
      }

      if (this.suggestTopicForm && this.suggestTopicStatus) {
        this.suggestTopicForm.addEventListener("submit", this.submitForm.bind(this));
      }
    }
  }

export { SuggestTopicController };
