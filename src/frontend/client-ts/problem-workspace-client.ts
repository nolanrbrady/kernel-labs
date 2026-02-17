// @ts-nocheck
/* Client-side interactivity for the problem workspace screen.
   This file is read at server startup and inlined into the HTML document. */

(function () {
  var workspaceRoot = document.querySelector("[data-workspace-root]");
  if (!workspaceRoot) {
    return;
  }
  var domain = globalThis.DeepMLSRWorkspaceClientDomain;
  if (!domain) {
    return;
  }
  var uiControllers = globalThis.DeepMLSRWorkspaceClientControllers;
  if (!uiControllers) {
    return;
  }

  // ─── Element References ───

  var runButton = document.getElementById("run-button");
  var submitButton = document.getElementById("submit-button");
  var codeEditor = document.getElementById("starter-code-editor");
  var codeHighlight = document.getElementById("starter-code-highlight");
  var codeEditorShell =
    codeEditor && typeof codeEditor.closest === "function"
      ? codeEditor.closest(".code-editor-shell")
      : null;
  if (!codeEditorShell && typeof document.querySelector === "function") {
    codeEditorShell = document.querySelector(".code-editor-shell");
  }
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
  var themeToggle = document.getElementById("theme-toggle");
  var workspaceTabProblem = document.getElementById("workspace-tab-problem");
  var workspaceTabLibrary = document.getElementById("workspace-tab-library");
  var workspaceProblemTabPanel = document.getElementById("workspace-problem-tab-panel");
  var workspaceLibraryTabPanel = document.getElementById("workspace-library-tab-panel");
  var rawVisibleTestCaseIds = workspaceRoot.getAttribute("data-visible-test-case-ids");
  var problemId = workspaceRoot.getAttribute("data-problem-id");

  // ─── Storage Keys ───

  var localProgressStorageKey = "deepmlsr.anonymousProgress.v1";
  var themeStorageKey = "deepmlsr.theme.v1";

  if (!runButton || !submitButton || !codeEditor || !runStatus || !evaluationStatus || !sessionStatus || !problemId) {
    return;
  }
  var localProgressStore = new domain.AnonymousProgressStore({
    storage: typeof localStorage !== "undefined" ? localStorage : null,
    storageKey: localProgressStorageKey,
    problemId: problemId,
    nowProvider: function () {
      return Date.now();
    }
  });
  var suggestTopicValidator = new domain.SuggestTopicFormValidator();
  var questionCatalogModel = new domain.QuestionCatalog({
    rawCatalog: workspaceRoot.getAttribute("data-question-catalog"),
    problemId: problemId
  });
  var visibleTestCaseTracker = new domain.VisibleTestCaseTracker(rawVisibleTestCaseIds);
  var visibleTestCaseController = null;
  var questionLibraryController = null;

  // ─── Session State ───

  var sessionStartedAtMs = null;
  var sessionTimerIntervalId = null;
  var sessionHasStarted = false;
  var sessionLimitMinutes = 30;
  var sessionLimitMs = sessionLimitMinutes * 60000;

  // ─── DOM Utilities ───

  function setText(node, text) {
    node.textContent = text;
  }

  // ─── UI Controllers ───

  var editorController = new uiControllers.EditorController({
    codeEditor: codeEditor,
    codeHighlight: codeHighlight,
    codeEditorShell: codeEditorShell,
    onTypingStart: function (sourceLabel) {
      startSessionTimer(sourceLabel);
    }
  });
  var workspaceTabController = new uiControllers.WorkspaceTabController({
    workspaceTabProblem: workspaceTabProblem,
    workspaceTabLibrary: workspaceTabLibrary,
    workspaceProblemTabPanel: workspaceProblemTabPanel,
    workspaceLibraryTabPanel: workspaceLibraryTabPanel
  });
  visibleTestCaseController = new uiControllers.VisibleTestCaseController({
    documentRef: document,
    tracker: visibleTestCaseTracker,
    appendDebugLine: appendDebugLine
  });
  questionLibraryController = new uiControllers.QuestionLibraryController({
    catalogModel: questionCatalogModel,
    questionSearchInput: questionSearchInput,
    questionTypeFilter: questionTypeFilter,
    questionLibraryResults: questionLibraryResults,
    questionLibraryCount: questionLibraryCount
  });
  var suggestTopicController = new uiControllers.SuggestTopicController({
    validator: suggestTopicValidator,
    questionTypeFilter: questionTypeFilter,
    suggestTopicButton: suggestTopicButton,
    suggestTopicStatus: suggestTopicStatus,
    suggestTopicModal: suggestTopicModal,
    suggestTopicCloseButton: suggestTopicCloseButton,
    suggestTopicCancelButton: suggestTopicCancelButton,
    suggestTopicForm: suggestTopicForm,
    suggestTopicModalFeedback: suggestTopicModalFeedback,
    suggestTopicTitleInput: suggestTopicTitleInput,
    suggestTopicProblemTypeInput: suggestTopicProblemTypeInput,
    suggestTopicDifficultyInput: suggestTopicDifficultyInput,
    suggestTopicLearningObjectiveInput: suggestTopicLearningObjectiveInput,
    suggestTopicContextInput: suggestTopicContextInput,
    suggestTopicInputSpecInput: suggestTopicInputSpecInput,
    suggestTopicOutputSpecInput: suggestTopicOutputSpecInput,
    suggestTopicConstraintsInput: suggestTopicConstraintsInput,
    suggestTopicStarterSignatureInput: suggestTopicStarterSignatureInput,
    suggestTopicVisibleTestsInput: suggestTopicVisibleTestsInput,
    suggestTopicHintsInput: suggestTopicHintsInput,
    suggestTopicPaperLinkInput: suggestTopicPaperLinkInput,
    suggestTopicNotesInput: suggestTopicNotesInput,
    appendDebugLine: appendDebugLine
  });

  function resetVisibleTestCaseStatuses(statusLabel) {
    if (!visibleTestCaseController) {
      return;
    }

    visibleTestCaseController.reset(statusLabel);
  }

  function applyVisibleTestCaseResults(results) {
    if (!visibleTestCaseController) {
      return;
    }

    visibleTestCaseController.applyResults(results);
  }

  var apiAdapters = uiControllers.createWorkspaceApiAdapters({
    fetchImpl: typeof fetch === "function" ? fetch : null
  });
  var sessionController = new uiControllers.SessionController({
    problemId: problemId,
    codeEditor: codeEditor,
    runButton: runButton,
    runStatus: runStatus,
    evaluationStatus: evaluationStatus,
    sessionStatus: sessionStatus,
    scheduleStatus: scheduleStatus,
    api: apiAdapters,
    appendDebugLine: appendDebugLine,
    formatDebugValue: formatDebugValue,
    resetVisibleTestCaseStatuses: resetVisibleTestCaseStatuses,
    applyVisibleTestCaseResults: applyVisibleTestCaseResults,
    nowProvider: function () {
      return Date.now();
    }
  });
  var submissionController = new uiControllers.SubmissionController({
    problemId: problemId,
    submitButton: submitButton,
    sessionStatus: sessionStatus,
    scheduleStatus: scheduleStatus,
    sessionTimerStatus: sessionTimerStatus,
    timerCapMessage: timerCapMessage,
    api: apiAdapters,
    appendDebugLine: appendDebugLine,
    readLocalProgress: readLocalProgress,
    persistAnonymousProgress: persistAnonymousProgress,
    getPriorSuccessfulCompletions: getPriorSuccessfulCompletions,
    getDaysSinceLastExposure: getDaysSinceLastExposure,
    getSessionTimeSpentMinutes: getSessionTimeSpentMinutes,
    getHintTierUsed: function () {
      return revealedHintTier;
    },
    getSessionId: function () {
      return sessionController.getSessionId();
    },
    getLastEvaluation: function () {
      return sessionController.getLastEvaluation();
    },
    stopSessionTimer: stopSessionTimer
  });

  // ─── Debug Console ───

  function appendDebugLine(text) {
    if (!debugShellOutput) {
      return;
    }

    var existingOutput = debugShellOutput.textContent || "";
    debugShellOutput.textContent =
      existingOutput.length > 0
        ? existingOutput + "\n" + text
        : text;
  }

  function formatDebugValue(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  // ─── Session Timer ───

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
    if (
      !submissionController ||
      submissionController.hasSubmitted() ||
      submissionController.isSubmissionInProgress()
    ) {
      return;
    }

    if (timerCapMessage) {
      setText(
        timerCapMessage,
        "30 minutes reached. Submitting automatically so this session ends cleanly."
      );
    }
    appendDebugLine("! session cap reached (30:00). Triggering auto-submit.");
    submissionController.submitSession("timer-cap");
  }

  function tickSessionTimer() {
    if (
      !sessionHasStarted ||
      sessionStartedAtMs === null ||
      (submissionController && submissionController.hasSubmitted())
    ) {
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

  // ─── Progress & Scheduling ───

  function getPriorSuccessfulCompletions(progress) {
    return localProgressStore.getPriorSuccessfulCompletions(progress);
  }

  function getDaysSinceLastExposure(progress) {
    return localProgressStore.getDaysSinceLastExposure(progress);
  }

  // ─── Hints ───

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

  // ─── Local Progress Persistence ───

  function canUseLocalStorage() {
    return localProgressStore.canUseStorage();
  }

  function readLocalProgress() {
    return localProgressStore.read();
  }

  function persistAnonymousProgress(correctness) {
    return localProgressStore.persistAttempt(correctness);
  }

  // ─── Theme Toggle ───

  function getActiveTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (canUseLocalStorage()) {
      try {
        localStorage.setItem(themeStorageKey, theme);
      } catch (error) {
        // noop
      }
    }
  }

  function toggleTheme() {
    var currentTheme = getActiveTheme();
    var nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }

  // ─── Initialization ───

  var localProgress = readLocalProgress();
  updateTimerDisplay(sessionLimitMs);
  if (localProgress.completedProblemIds.indexOf(problemId) !== -1) {
    setText(
      sessionStatus,
      "Session status: active. Previous anonymous completion found for this problem."
    );
  }
  editorController.bind();

  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

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

  workspaceTabController.bind();
  questionLibraryController.bind();
  questionLibraryController.render();
  suggestTopicController.bind();
  visibleTestCaseController.bind();
  sessionController.bind();
  submissionController.bind();
})();
