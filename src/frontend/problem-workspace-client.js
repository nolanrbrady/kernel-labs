/* Client-side interactivity for the problem workspace screen.
   This file is read at server startup and inlined into the HTML document. */

(function () {
  var workspaceRoot = document.querySelector("[data-workspace-root]");
  if (!workspaceRoot) {
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

  // ─── Session State ───

  var sessionCreatedAtMs = Date.now();
  var sessionId = "session-" + sessionCreatedAtMs;
  var sessionStartedAtMs = null;
  var sessionTimerIntervalId = null;
  var sessionHasStarted = false;
  var sessionSubmitted = false;
  var submissionInProgress = false;
  var sessionLimitMinutes = 30;
  var sessionLimitMs = sessionLimitMinutes * 60000;
  var lastEvaluation = null;
  var runAttemptCount = 0;

  // ─── Editor Helpers ───

  function handleEditorTabIndent(event) {
    if (!event || event.key !== "Tab") {
      return;
    }

    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    var currentValue = codeEditor.value || "";
    var selectionStart =
      typeof codeEditor.selectionStart === "number"
        ? codeEditor.selectionStart
        : currentValue.length;
    var selectionEnd =
      typeof codeEditor.selectionEnd === "number"
        ? codeEditor.selectionEnd
        : selectionStart;
    var indent = "  ";

    codeEditor.value =
      currentValue.slice(0, selectionStart) +
      indent +
      currentValue.slice(selectionEnd);

    var nextCursor = selectionStart + indent.length;
    if (typeof codeEditor.setSelectionRange === "function") {
      codeEditor.setSelectionRange(nextCursor, nextCursor);
    } else {
      codeEditor.selectionStart = nextCursor;
      codeEditor.selectionEnd = nextCursor;
    }

    renderCodeHighlight();
  }

  function isTypingKey(event) {
    if (!event || typeof event.key !== "string") {
      return false;
    }

    if (event.key.length !== 1) {
      return false;
    }

    return !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  function handleSessionStartFromTyping(event) {
    if (isTypingKey(event)) {
      startSessionTimer("first-character");
    }
  }

  function focusEditorFromShellClick(event) {
    if (!codeEditor || typeof codeEditor.focus !== "function") {
      return;
    }

    if (event && event.target === codeEditor) {
      return;
    }

    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    codeEditor.focus();
  }

  function setEditorEditingState(isEditing) {
    if (!codeEditorShell) {
      return;
    }

    setClassFlag(codeEditorShell, "is-editing", isEditing);
  }

  // ─── DOM Utilities ───

  function setText(node, text) {
    node.textContent = text;
  }

  function setTabActiveState(tabElement, isActive) {
    if (!tabElement || typeof tabElement.className !== "string") {
      return;
    }

    var normalizedClassName = tabElement.className
      .replace(/\bis-active\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    tabElement.className = isActive
      ? (normalizedClassName + " is-active").trim()
      : normalizedClassName;
  }

  function setClassFlag(node, classToken, enabled) {
    if (!node || typeof node.className !== "string") {
      return;
    }

    var tokenRegex = new RegExp("(^|\\s)" + classToken + "(?=\\s|$)", "g");
    var normalizedClassName = node.className
      .replace(tokenRegex, " ")
      .replace(/\s+/g, " ")
      .trim();
    node.className = enabled
      ? (normalizedClassName + " " + classToken).trim()
      : normalizedClassName;
  }

  function setTabSelected(tabElement, isSelected) {
    if (!tabElement) {
      return;
    }

    if (typeof tabElement.setAttribute === "function") {
      tabElement.setAttribute("aria-selected", isSelected ? "true" : "false");
      return;
    }

    tabElement.ariaSelected = isSelected ? "true" : "false";
  }

  // ─── Workspace Tabs ───

  function activateWorkspaceTab(tabKey) {
    if (
      !workspaceTabProblem ||
      !workspaceTabLibrary ||
      !workspaceProblemTabPanel ||
      !workspaceLibraryTabPanel
    ) {
      return;
    }

    var showProblemTab = tabKey !== "library";
    workspaceProblemTabPanel.hidden = !showProblemTab;
    workspaceLibraryTabPanel.hidden = showProblemTab;

    setTabActiveState(workspaceTabProblem, showProblemTab);
    setTabActiveState(workspaceTabLibrary, !showProblemTab);
    setTabSelected(workspaceTabProblem, showProblemTab);
    setTabSelected(workspaceTabLibrary, !showProblemTab);
  }

  function readInputValue(inputNode) {
    if (!inputNode || typeof inputNode.value !== "string") {
      return "";
    }

    return inputNode.value.trim();
  }

  // ─── Topic Suggestion Modal ───

  function setSuggestTopicModalOpen(isOpen) {
    if (!suggestTopicModal) {
      return;
    }

    suggestTopicModal.hidden = !isOpen;
    setClassFlag(suggestTopicModal, "is-open", isOpen);
  }

  // ─── Visible Test Cases ───

  function parseVisibleTestCaseIds() {
    if (!rawVisibleTestCaseIds) {
      return [];
    }

    try {
      var parsedIds = JSON.parse(rawVisibleTestCaseIds);
      if (!Array.isArray(parsedIds)) {
        return [];
      }

      return parsedIds.filter(function (entry) {
        return typeof entry === "string" && entry.length > 0;
      });
    } catch (error) {
      return [];
    }
  }

  var visibleTestCaseIds = parseVisibleTestCaseIds();
  var activeVisibleTestCaseId = visibleTestCaseIds.length > 0 ? visibleTestCaseIds[0] : null;

  function getVisibleTestCaseTab(caseId) {
    return document.getElementById("test-case-tab-" + caseId);
  }

  function getVisibleTestCaseStatus(caseId) {
    return document.getElementById("test-case-status-" + caseId);
  }

  function getVisibleTestCasePanel(caseId) {
    return document.getElementById("test-case-panel-" + caseId);
  }

  function activateVisibleTestCase(caseId) {
    if (!caseId) {
      return;
    }

    activeVisibleTestCaseId = caseId;
    for (var index = 0; index < visibleTestCaseIds.length; index += 1) {
      var currentCaseId = visibleTestCaseIds[index];
      var tab = getVisibleTestCaseTab(currentCaseId);
      var panel = getVisibleTestCasePanel(currentCaseId);
      var isSelected = currentCaseId === caseId;

      if (panel) {
        panel.hidden = !isSelected;
      }
      setTabActiveState(tab, isSelected);
      setTabSelected(tab, isSelected);
    }
  }

  function resetVisibleTestCaseStatuses(statusLabel) {
    for (var index = 0; index < visibleTestCaseIds.length; index += 1) {
      var caseId = visibleTestCaseIds[index];
      var tab = getVisibleTestCaseTab(caseId);
      var status = getVisibleTestCaseStatus(caseId);

      setClassFlag(tab, "is-pass", false);
      setClassFlag(tab, "is-fail", false);
      if (status) {
        setText(status, statusLabel);
      }
    }
  }

  function applyVisibleTestCaseResults(results) {
    var resultByCaseId = {};
    if (Array.isArray(results)) {
      for (var resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
        var resultEntry = results[resultIndex];
        if (
          resultEntry &&
          typeof resultEntry === "object" &&
          typeof resultEntry.id === "string"
        ) {
          resultByCaseId[resultEntry.id] = resultEntry;
        }
      }
    }

    var passedCount = 0;
    for (var index = 0; index < visibleTestCaseIds.length; index += 1) {
      var caseId = visibleTestCaseIds[index];
      var tab = getVisibleTestCaseTab(caseId);
      var status = getVisibleTestCaseStatus(caseId);
      var caseResult = resultByCaseId[caseId];

      if (!caseResult) {
        setClassFlag(tab, "is-pass", false);
        setClassFlag(tab, "is-fail", false);
        if (status) {
          setText(status, "Not run");
        }
        continue;
      }

      var passed = caseResult.passed === true;
      setClassFlag(tab, "is-pass", passed);
      setClassFlag(tab, "is-fail", !passed);
      if (status) {
        setText(status, passed ? "Pass" : "Fail");
      }
      if (passed) {
        passedCount += 1;
      }
    }

    if (visibleTestCaseIds.length > 0) {
      appendDebugLine(
        "> visible test cases: " + passedCount + "/" + visibleTestCaseIds.length + " passed."
      );
    }
  }

  function initializeVisibleTestCaseTabs() {
    if (visibleTestCaseIds.length === 0) {
      return;
    }

    for (var index = 0; index < visibleTestCaseIds.length; index += 1) {
      var caseId = visibleTestCaseIds[index];
      var tab = getVisibleTestCaseTab(caseId);
      if (!tab || typeof tab.addEventListener !== "function") {
        continue;
      }

      (function (id) {
        tab.addEventListener("click", function () {
          activateVisibleTestCase(id);
        });
      })(caseId);
    }

    resetVisibleTestCaseStatuses("Not run");
    activateVisibleTestCase(activeVisibleTestCaseId);
  }

  // ─── Question Library Search ───

  function normalizeQueryText(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ─── Syntax Highlighting ───

  function buildSyntaxHighlightedHtml(sourceText) {
    var escapedSource = escapeHtml(sourceText);
    var tokenPattern = /(#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:def|return|if|elif|else|for|while|in|None|True|False|pass|class|import|from|as|and|or|not|with|try|except|finally|lambda|yield|break|continue)\b|\b(?:len|range|sum|min|max|print|enumerate|zip|float|int|list|dict|set|tuple)\b|\b\d+(?:\.\d+)?\b)/g;

    return escapedSource.replace(tokenPattern, function (token) {
      if (token[0] === "#") {
        return "<span class=\"token-comment\">" + token + "</span>";
      }
      if (token[0] === "'" || token[0] === '"') {
        return "<span class=\"token-string\">" + token + "</span>";
      }
      if (/^\d/.test(token)) {
        return "<span class=\"token-number\">" + token + "</span>";
      }
      if (/^(len|range|sum|min|max|print|enumerate|zip|float|int|list|dict|set|tuple)$/.test(token)) {
        return "<span class=\"token-builtin\">" + token + "</span>";
      }

      return "<span class=\"token-keyword\">" + token + "</span>";
    });
  }

  function renderCodeHighlight() {
    if (!codeHighlight || !("innerHTML" in codeHighlight)) {
      return;
    }

    var editorValue = typeof codeEditor.value === "string" ? codeEditor.value : "";
    var highlightedHtml = buildSyntaxHighlightedHtml(editorValue);
    if (editorValue.endsWith("\n")) {
      highlightedHtml += "\n";
    }
    codeHighlight.innerHTML = "<code>" + highlightedHtml + "</code>";
    codeHighlight.scrollTop = codeEditor.scrollTop || 0;
    codeHighlight.scrollLeft = codeEditor.scrollLeft || 0;
  }

  function syncHighlightScroll() {
    if (!codeHighlight) {
      return;
    }

    codeHighlight.scrollTop = codeEditor.scrollTop || 0;
    codeHighlight.scrollLeft = codeEditor.scrollLeft || 0;
  }

  // ─── Question Catalog ───

  function parseQuestionCatalog() {
    var rawCatalog = workspaceRoot.getAttribute("data-question-catalog");
    if (!rawCatalog) {
      return [
        {
          id: problemId,
          title: "Current workspace problem",
          problemType: "Current Session",
          summary: "Use this as today's focused practice item.",
          estimatedMinutes: 30
        }
      ];
    }

    try {
      var parsedCatalog = JSON.parse(rawCatalog);
      if (!Array.isArray(parsedCatalog)) {
        return [];
      }

      return parsedCatalog
        .map(function (entry) {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          var id = typeof entry.id === "string" ? entry.id : "";
          var title = typeof entry.title === "string" ? entry.title : "";
          var problemType =
            typeof entry.problemType === "string" ? entry.problemType : "Uncategorized";
          var summary =
            typeof entry.summary === "string"
              ? entry.summary
              : "Atomic toy-tensor coding problem.";
          var estimatedMinutes =
            typeof entry.estimatedMinutes === "number" && Number.isFinite(entry.estimatedMinutes)
              ? entry.estimatedMinutes
              : 30;

          if (!id || !title) {
            return null;
          }

          return {
            id: id,
            title: title,
            problemType: problemType,
            summary: summary,
            estimatedMinutes: Math.max(1, Math.round(estimatedMinutes))
          };
        })
        .filter(function (entry) {
          return entry !== null;
        });
    } catch (error) {
      return [];
    }
  }

  var questionCatalog = parseQuestionCatalog();

  function computeFuzzyScore(query, text) {
    if (!query) {
      return 0;
    }

    var normalizedText = normalizeQueryText(text);
    if (!normalizedText) {
      return Number.POSITIVE_INFINITY;
    }

    var queryIndex = 0;
    var firstMatch = -1;
    var lastMatch = -1;

    for (var index = 0; index < normalizedText.length; index += 1) {
      if (queryIndex >= query.length) {
        break;
      }

      if (normalizedText[index] === query[queryIndex]) {
        if (firstMatch === -1) {
          firstMatch = index;
        }
        lastMatch = index;
        queryIndex += 1;
      }
    }

    if (queryIndex !== query.length) {
      return Number.POSITIVE_INFINITY;
    }

    var spanPenalty = lastMatch - firstMatch + 1 - query.length;
    return firstMatch + spanPenalty;
  }

  function buildQuestionSearchScore(question, normalizedQuery) {
    if (!normalizedQuery) {
      return 0;
    }

    var bestScore = Number.POSITIVE_INFINITY;
    var candidates = [
      question.title,
      question.id,
      question.problemType,
      question.summary
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      var score = computeFuzzyScore(normalizedQuery, candidates[index]);
      if (score < bestScore) {
        bestScore = score;
      }
    }

    return bestScore;
  }

  function renderQuestionLibrary() {
    if (!questionLibraryResults || !questionLibraryCount) {
      return;
    }

    var normalizedQuery = normalizeQueryText(
      questionSearchInput && typeof questionSearchInput.value === "string"
        ? questionSearchInput.value
        : ""
    );
    var selectedType =
      questionTypeFilter && typeof questionTypeFilter.value === "string"
        ? questionTypeFilter.value
        : "all";

    var filteredQuestions = questionCatalog
      .filter(function (question) {
        if (selectedType === "all") {
          return true;
        }

        return question.problemType === selectedType;
      })
      .map(function (question) {
        return {
          question: question,
          score: buildQuestionSearchScore(question, normalizedQuery)
        };
      })
      .filter(function (candidate) {
        return candidate.score !== Number.POSITIVE_INFINITY;
      })
      .sort(function (left, right) {
        if (left.score !== right.score) {
          return left.score - right.score;
        }

        return left.question.title.localeCompare(right.question.title);
      })
      .map(function (candidate) {
        return candidate.question;
      });

    setText(
      questionLibraryCount,
      "Showing " + filteredQuestions.length + " of " + questionCatalog.length + " questions."
    );

    if (filteredQuestions.length === 0) {
      if ("innerHTML" in questionLibraryResults) {
        questionLibraryResults.innerHTML =
          "<li class=\"question-library-item\">No matching questions yet. Try a different keyword or type.</li>";
      } else {
        setText(
          questionLibraryResults,
          "No matching questions yet. Try a different keyword or type."
        );
      }
      return;
    }

    var listHtml = filteredQuestions
      .map(function (question) {
        return (
          "<li class=\"question-library-item\">" +
          "<span class=\"question-library-item-title\">" +
          escapeHtml(question.title) +
          "</span> " +
          "<span class=\"question-library-item-meta\">[" +
          escapeHtml(question.problemType) +
          "] " +
          escapeHtml(question.id) +
          " - " +
          question.estimatedMinutes +
          "m</span>" +
          "<br />" +
          escapeHtml(question.summary) +
          "</li>"
        );
      })
      .join("");

    if ("innerHTML" in questionLibraryResults) {
      questionLibraryResults.innerHTML = listHtml;
      return;
    }

    setText(
      questionLibraryResults,
      filteredQuestions
        .map(function (question) {
          return (
            question.title +
            " [" +
            question.problemType +
            "] " +
            question.id +
            " - " +
            question.estimatedMinutes +
            "m"
          );
        })
        .join("\n")
    );
  }

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

  function isValidCorrectness(value) {
    return value === "pass" || value === "partial" || value === "fail";
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
    if (sessionSubmitted || submissionInProgress) {
      return;
    }

    if (timerCapMessage) {
      setText(
        timerCapMessage,
        "30 minutes reached. Submitting automatically so this session ends cleanly."
      );
    }
    appendDebugLine("! session cap reached (30:00). Triggering auto-submit.");
    submitSession("timer-cap");
  }

  function tickSessionTimer() {
    if (!sessionHasStarted || sessionStartedAtMs === null || sessionSubmitted) {
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
    return progress.attemptHistory.reduce(function (count, attempt) {
      if (
        attempt &&
        typeof attempt === "object" &&
        attempt.problemId === problemId &&
        attempt.correctness === "pass"
      ) {
        return count + 1;
      }

      return count;
    }, 0);
  }

  function getDaysSinceLastExposure(progress) {
    var latestExposureAtMs = null;
    for (var index = 0; index < progress.attemptHistory.length; index += 1) {
      var attempt = progress.attemptHistory[index];
      if (
        !attempt ||
        typeof attempt !== "object" ||
        attempt.problemId !== problemId ||
        typeof attempt.submittedAt !== "string"
      ) {
        continue;
      }

      var submittedAtMs = Date.parse(attempt.submittedAt);
      if (Number.isNaN(submittedAtMs)) {
        continue;
      }

      if (latestExposureAtMs === null || submittedAtMs > latestExposureAtMs) {
        latestExposureAtMs = submittedAtMs;
      }
    }

    if (latestExposureAtMs === null) {
      return 0;
    }

    var elapsedSinceExposureMs = Date.now() - latestExposureAtMs;
    if (elapsedSinceExposureMs <= 0) {
      return 0;
    }

    return Math.floor(elapsedSinceExposureMs / 86400000);
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

  function createEmptyLocalProgress() {
    return {
      version: 1,
      completedProblemIds: [],
      attemptHistory: []
    };
  }

  function canUseLocalStorage() {
    return typeof localStorage !== "undefined" && localStorage !== null;
  }

  function readLocalProgress() {
    if (!canUseLocalStorage()) {
      return createEmptyLocalProgress();
    }

    try {
      var rawValue = localStorage.getItem(localProgressStorageKey);
      if (!rawValue) {
        return createEmptyLocalProgress();
      }

      var parsed = JSON.parse(rawValue);
      if (!parsed || typeof parsed !== "object") {
        return createEmptyLocalProgress();
      }

      if (!Array.isArray(parsed.completedProblemIds) || !Array.isArray(parsed.attemptHistory)) {
        return createEmptyLocalProgress();
      }

      return {
        version: 1,
        completedProblemIds: parsed.completedProblemIds.filter(function (entry) {
          return typeof entry === "string";
        }),
        attemptHistory: parsed.attemptHistory
      };
    } catch (error) {
      return createEmptyLocalProgress();
    }
  }

  function writeLocalProgress(progress) {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      localStorage.setItem(localProgressStorageKey, JSON.stringify(progress));
    } catch (error) {
      // noop: keep solve flow non-blocking when storage is unavailable
    }
  }

  function persistAnonymousProgress(correctness) {
    var progress = readLocalProgress();
    progress.attemptHistory.push({
      problemId: problemId,
      correctness: correctness,
      submittedAt: new Date().toISOString()
    });

    if ((correctness === "pass" || correctness === "partial") && progress.completedProblemIds.indexOf(problemId) === -1) {
      progress.completedProblemIds.push(problemId);
    }

    writeLocalProgress(progress);
    return progress;
  }

  async function syncAnonymousProgress(progress) {
    try {
      await fetch("/api/progress/anonymous", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(progress)
      });
    } catch (error) {
      // noop: sync is best-effort and must not block session completion
    }
  }

  async function updateSchedulerDecision(correctness, priorProgress) {
    if (scheduleStatus) {
      setText(
        scheduleStatus,
        "Scheduling status: computing next resurfacing window..."
      );
    }

    try {
      var schedulerResponse = await fetch("/api/scheduler/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          correctness: correctness,
          timeSpentMinutes: getSessionTimeSpentMinutes(),
          hintTierUsed: revealedHintTier,
          priorSuccessfulCompletions: getPriorSuccessfulCompletions(priorProgress),
          daysSinceLastExposure: getDaysSinceLastExposure(priorProgress)
        })
      });
      var schedulerPayload = await schedulerResponse.json();

      if (!schedulerResponse.ok) {
        if (scheduleStatus) {
          setText(
            scheduleStatus,
            "Scheduling status: unavailable right now. A next problem will still be ready."
          );
        }
        return;
      }

      if (scheduleStatus) {
        setText(
          scheduleStatus,
          "Scheduling status: next resurfacing in " +
            schedulerPayload.nextIntervalDays +
            " day(s), priority " +
            schedulerPayload.resurfacingPriority +
            "."
        );
      }
    } catch (error) {
      if (scheduleStatus) {
        setText(
          scheduleStatus,
          "Scheduling status: temporarily unavailable. Your session is still complete."
        );
      }
    }
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

  // ─── Session Submission ───

  async function submitSession(submitSource) {
    if (sessionSubmitted || submissionInProgress) {
      return;
    }

    submissionInProgress = true;
    submitButton.disabled = true;

    var correctness = lastEvaluation && isValidCorrectness(lastEvaluation.correctness)
      ? lastEvaluation.correctness
      : "fail";
    var explanation =
      lastEvaluation && typeof lastEvaluation.explanation === "string"
        ? lastEvaluation.explanation
        : "Submitted without a completed successful run.";
    var priorProgress = readLocalProgress();

    setText(sessionStatus, "Submitting session...");
    appendDebugLine("$ submit (" + problemId + ")");
    if (scheduleStatus) {
      setText(
        scheduleStatus,
        "Scheduling status: preparing scheduler decision..."
      );
    }

    try {
      var submitResponse = await fetch("/api/session/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          problemId: problemId,
          correctness: correctness,
          explanation: explanation
        })
      });
      var submitPayload = await submitResponse.json();

      if (!submitResponse.ok) {
        setText(sessionStatus, "Submission temporarily unavailable. Please retry.");
        if (submitSource === "timer-cap" && timerCapMessage) {
          setText(
            timerCapMessage,
            "30 minutes reached. Auto-submit could not complete; please retry submit."
          );
        }
        return;
      }

      sessionSubmitted = true;
      stopSessionTimer();
      setText(
        sessionStatus,
        "Session status: " + submitPayload.nextState.status + ". " + submitPayload.supportiveFeedback
      );
      if (sessionTimerStatus) {
        setText(sessionTimerStatus, "Session timer: completed.");
      }
      if (submitSource === "timer-cap" && timerCapMessage) {
        setText(
          timerCapMessage,
          "30-minute cap reached. Your session was submitted automatically."
        );
      }
      appendDebugLine(
        "> submit accepted: " + submitPayload.nextState.status + " - " + submitPayload.supportiveFeedback
      );
      var updatedProgress = persistAnonymousProgress(correctness);
      await syncAnonymousProgress(updatedProgress);
      await updateSchedulerDecision(correctness, priorProgress);
    } catch (error) {
      setText(sessionStatus, "Submission encountered a temporary issue. Please retry.");
      if (submitSource === "timer-cap" && timerCapMessage) {
        setText(
          timerCapMessage,
          "30 minutes reached. Auto-submit encountered an issue; please retry submit."
        );
      }
    } finally {
      submissionInProgress = false;
      submitButton.disabled = false;
    }
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
  if (codeEditorShell && typeof codeEditorShell.setAttribute === "function") {
    codeEditorShell.setAttribute("data-editor-enhanced", "true");
  }

  codeEditor.addEventListener("keydown", handleEditorTabIndent);
  codeEditor.addEventListener("keydown", handleSessionStartFromTyping);
  codeEditor.addEventListener("focus", function () {
    setEditorEditingState(true);
  });
  codeEditor.addEventListener("blur", function () {
    setEditorEditingState(false);
  });
  codeEditor.addEventListener("input", renderCodeHighlight);
  codeEditor.addEventListener("scroll", syncHighlightScroll);
  if (codeEditorShell && typeof codeEditorShell.addEventListener === "function") {
    codeEditorShell.addEventListener("mousedown", focusEditorFromShellClick);
  }
  renderCodeHighlight();

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

  if (
    workspaceTabProblem &&
    workspaceTabLibrary &&
    workspaceProblemTabPanel &&
    workspaceLibraryTabPanel
  ) {
    workspaceTabProblem.addEventListener("click", function () {
      activateWorkspaceTab("problem");
    });
    workspaceTabLibrary.addEventListener("click", function () {
      activateWorkspaceTab("library");
    });
    activateWorkspaceTab("problem");
  }

  if (questionSearchInput) {
    questionSearchInput.addEventListener("input", renderQuestionLibrary);
  }
  if (questionTypeFilter) {
    questionTypeFilter.addEventListener("change", renderQuestionLibrary);
  }
  if (suggestTopicButton && suggestTopicStatus) {
    suggestTopicButton.addEventListener("click", function () {
      var selectedType =
        questionTypeFilter && typeof questionTypeFilter.value === "string"
          ? questionTypeFilter.value
          : "all";
      var selectedTypeLabel = selectedType === "all" ? "all problem types" : selectedType;

      if (suggestTopicProblemTypeInput && selectedType !== "all") {
        suggestTopicProblemTypeInput.value = selectedType;
      }

      if (suggestTopicModal) {
        setSuggestTopicModalOpen(true);
        if (suggestTopicModalFeedback) {
          setText(
            suggestTopicModalFeedback,
            "Complete the required fields so we can turn this into a strong, runnable coding problem."
          );
        }
        setText(
          suggestTopicStatus,
          "Topic suggestion modal opened for " + selectedTypeLabel + "."
        );
        appendDebugLine("> topic suggestion modal opened (" + selectedTypeLabel + ").");
        return;
      }

      setText(
        suggestTopicStatus,
        "Thanks. Topic suggestion mode is queued for " + selectedTypeLabel + "."
      );
      appendDebugLine("> topic suggestion requested from question library (" + selectedTypeLabel + ").");
    });
  }
  if (suggestTopicCloseButton) {
    suggestTopicCloseButton.addEventListener("click", function () {
      setSuggestTopicModalOpen(false);
      if (suggestTopicStatus) {
        setText(
          suggestTopicStatus,
          "Topic suggestion modal closed. Reopen it any time from Suggest a Topic."
        );
      }
    });
  }
  if (suggestTopicCancelButton) {
    suggestTopicCancelButton.addEventListener("click", function () {
      setSuggestTopicModalOpen(false);
      if (suggestTopicStatus) {
        setText(
          suggestTopicStatus,
          "Topic suggestion canceled. Reopen the modal when ready."
        );
      }
    });
  }
  if (suggestTopicForm && suggestTopicStatus) {
    suggestTopicForm.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      var requiredFields = [
        { label: "Topic title", value: readInputValue(suggestTopicTitleInput) },
        { label: "Problem type", value: readInputValue(suggestTopicProblemTypeInput) },
        { label: "Difficulty", value: readInputValue(suggestTopicDifficultyInput) },
        { label: "Learning objective", value: readInputValue(suggestTopicLearningObjectiveInput) },
        { label: "Concept background", value: readInputValue(suggestTopicContextInput) },
        { label: "Input specification", value: readInputValue(suggestTopicInputSpecInput) },
        { label: "Expected output", value: readInputValue(suggestTopicOutputSpecInput) },
        { label: "Constraints and edge cases", value: readInputValue(suggestTopicConstraintsInput) },
        { label: "Starter signature", value: readInputValue(suggestTopicStarterSignatureInput) },
        { label: "Visible test case plan", value: readInputValue(suggestTopicVisibleTestsInput) }
      ];

      var missingLabels = [];
      for (var index = 0; index < requiredFields.length; index += 1) {
        if (!requiredFields[index].value) {
          missingLabels.push(requiredFields[index].label);
        }
      }

      if (missingLabels.length > 0) {
        if (suggestTopicModalFeedback) {
          setText(
            suggestTopicModalFeedback,
            "Please complete: " + missingLabels.join(", ") + "."
          );
        }
        setText(
          suggestTopicStatus,
          "Topic suggestion needs more detail before it can be queued."
        );
        appendDebugLine("> topic suggestion form incomplete.");
        return;
      }

      var problemTypeValue = readInputValue(suggestTopicProblemTypeInput);
      var titleValue = readInputValue(suggestTopicTitleInput);
      var difficultyValue = readInputValue(suggestTopicDifficultyInput);
      var paperLinkValue = readInputValue(suggestTopicPaperLinkInput);
      var hintsValue = readInputValue(suggestTopicHintsInput);
      var notesValue = readInputValue(suggestTopicNotesInput);
      var completionSummary =
        "Topic suggestion captured for " + problemTypeValue + ": " + titleValue + ".";

      setText(suggestTopicStatus, completionSummary);
      if (suggestTopicModalFeedback) {
        setText(
          suggestTopicModalFeedback,
          "Captured. We can convert this into a deterministic, testable problem spec."
        );
      }
      appendDebugLine(
        "> topic suggestion submitted: " +
          problemTypeValue +
          " | " +
          difficultyValue +
          " | " +
          titleValue
      );
      if (paperLinkValue) {
        appendDebugLine("> suggested paper: " + paperLinkValue);
      }
      if (hintsValue) {
        appendDebugLine("> hint scaffold provided.");
      }
      if (notesValue) {
        appendDebugLine("> additional notes captured.");
      }
      setSuggestTopicModalOpen(false);
    });
  }
  renderQuestionLibrary();
  initializeVisibleTestCaseTabs();

  runButton.addEventListener("click", async function () {
    runButton.disabled = true;
    runAttemptCount += 1;
    setText(runStatus, "Running code against toy tensors...");
    setText(evaluationStatus, "Awaiting evaluator result...");
    setText(sessionStatus, "Session in progress.");
    resetVisibleTestCaseStatuses("Running...");
    appendDebugLine("$ run #" + runAttemptCount + " (" + problemId + ")");
    appendDebugLine("> executing code against deterministic toy tensors...");
    if (scheduleStatus) {
      setText(scheduleStatus, "Scheduling status: waiting for submission.");
    }

    try {
      var runtimeResponse = await fetch("/api/runtime/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problemId: problemId,
          userCode: codeEditor.value
        })
      });
      var runtimePayload = await runtimeResponse.json();

      if (!runtimeResponse.ok) {
        setText(runStatus, "Run unavailable right now. Please try again.");
        setText(evaluationStatus, "Evaluation skipped.");
        resetVisibleTestCaseStatuses("Run unavailable");
        appendDebugLine("! runtime unavailable: " + runtimeResponse.status);
        return;
      }

      if (runtimePayload.status !== "success") {
        setText(runStatus, runtimePayload.message || "Run needs one more iteration.");
        setText(evaluationStatus, "Evaluation skipped until run succeeds.");
        resetVisibleTestCaseStatuses("Run failed");
        if (Array.isArray(runtimePayload.preloadedPackages)) {
          appendDebugLine(
            "> preloaded packages: " +
              runtimePayload.preloadedPackages.join(", ")
          );
        }
        if (
          typeof runtimePayload.runtimeStdout === "string" &&
          runtimePayload.runtimeStdout.trim().length > 0
        ) {
          appendDebugLine("> stdout:");
          appendDebugLine(runtimePayload.runtimeStdout.trimEnd());
        }
        appendDebugLine(
          "! runtime failure: " +
            (runtimePayload.errorCode || "RUNTIME_FAILURE") +
            " - " +
            (runtimePayload.message || "Run failed.")
        );
        if (Array.isArray(runtimePayload.actionableSteps)) {
          appendDebugLine("> next steps: " + runtimePayload.actionableSteps.join(" | "));
        }
        return;
      }

      setText(runStatus, runtimePayload.message || "Run complete.");
      appendDebugLine("> runtime success: " + (runtimePayload.message || "Run complete."));
      if (Array.isArray(runtimePayload.preloadedPackages)) {
        appendDebugLine(
          "> preloaded packages: " +
            runtimePayload.preloadedPackages.join(", ")
        );
      }
      if (
        typeof runtimePayload.runtimeStdout === "string" &&
        runtimePayload.runtimeStdout.trim().length > 0
      ) {
        appendDebugLine("> stdout:");
        appendDebugLine(runtimePayload.runtimeStdout.trimEnd());
      }
      appendDebugLine("> output:");
      appendDebugLine(formatDebugValue(runtimePayload.output));
      applyVisibleTestCaseResults(runtimePayload.testCaseResults);

      var evaluatorResponse = await fetch("/api/evaluator/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problemId: problemId,
          candidateOutput: runtimePayload.output
        })
      });
      var evaluatorPayload = await evaluatorResponse.json();

      if (!evaluatorResponse.ok) {
        setText(evaluationStatus, "Evaluator unavailable right now.");
        appendDebugLine("! evaluator unavailable: " + evaluatorResponse.status);
        return;
      }

      lastEvaluation = evaluatorPayload;
      setText(
        evaluationStatus,
        "Evaluation: " + evaluatorPayload.correctness + " - " + evaluatorPayload.explanation
      );
      appendDebugLine(
        "> evaluator: " +
          evaluatorPayload.correctness +
          " - " +
          evaluatorPayload.explanation
      );
    } catch (error) {
      setText(runStatus, "Run encountered a temporary issue. You can still submit this session.");
      setText(evaluationStatus, "Evaluation unavailable for this run.");
      resetVisibleTestCaseStatuses("Run interrupted");
      appendDebugLine("! runtime exception: temporary issue while running.");
    } finally {
      runButton.disabled = false;
    }
  });

  submitButton.addEventListener("click", async function () {
    await submitSession("manual");
  });
})();
