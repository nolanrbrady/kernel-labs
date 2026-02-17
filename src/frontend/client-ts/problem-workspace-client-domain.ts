// @ts-nocheck
/* Domain-layer classes for workspace client logic.
   These classes stay side-effect-light so behavior remains easy to test. */

(function (globalScope) {
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

  function isPlainObject(value) {
    return value !== null && typeof value === "object";
  }

  function createEmptyProgressSnapshot() {
    return {
      version: 1,
      completedProblemIds: [],
      attemptHistory: []
    };
  }

  class QuestionCatalog {
    constructor(options) {
      var safeOptions = isPlainObject(options) ? options : {};
      this.problemId =
        typeof safeOptions.problemId === "string" ? safeOptions.problemId : "";
      this.catalog = this.parseCatalog(safeOptions.rawCatalog);
    }

    static normalizeQueryText(value) {
      return normalizeQueryText(value);
    }

    static escapeHtml(value) {
      return escapeHtml(value);
    }

    createFallbackCatalog() {
      return [
        {
          id: this.problemId,
          title: "Current workspace problem",
          problemType: "Current Session",
          summary: "Use this as today's focused practice item.",
          estimatedMinutes: 30
        }
      ];
    }

    parseCatalog(rawCatalog) {
      if (!rawCatalog) {
        return this.createFallbackCatalog();
      }

      try {
        var parsedCatalog = JSON.parse(rawCatalog);
        if (!Array.isArray(parsedCatalog)) {
          return [];
        }

        return parsedCatalog
          .map(function (entry) {
            if (!isPlainObject(entry)) {
              return null;
            }

            var id = typeof entry.id === "string" ? entry.id : "";
            var title = typeof entry.title === "string" ? entry.title : "";
            var problemType =
              typeof entry.problemType === "string"
                ? entry.problemType
                : "Uncategorized";
            var summary =
              typeof entry.summary === "string"
                ? entry.summary
                : "Atomic toy-tensor coding problem.";
            var estimatedMinutes =
              typeof entry.estimatedMinutes === "number" &&
              Number.isFinite(entry.estimatedMinutes)
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

    getCatalog() {
      return this.catalog.slice();
    }

    computeFuzzyScore(query, text) {
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

    buildQuestionSearchScore(question, normalizedQuery) {
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
        var score = this.computeFuzzyScore(normalizedQuery, candidates[index]);
        if (score < bestScore) {
          bestScore = score;
        }
      }

      return bestScore;
    }

    filterQuestions(normalizedQuery, selectedType) {
      var safeQuery = normalizeQueryText(normalizedQuery);
      var safeType =
        typeof selectedType === "string" && selectedType.length > 0
          ? selectedType
          : "all";

      return this.catalog
        .filter(function (question) {
          if (safeType === "all") {
            return true;
          }

          return question.problemType === safeType;
        })
        .map(
          function (question) {
            return {
              question: question,
              score: this.buildQuestionSearchScore(question, safeQuery)
            };
          }.bind(this)
        )
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
    }

    renderQuestionListHtml(questions) {
      return questions
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
    }

    renderQuestionListText(questions) {
      return questions
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
        .join("\n");
    }
  }

  class VisibleTestCaseTracker {
    constructor(rawVisibleTestCaseIds) {
      this.visibleTestCaseIds = this.parseVisibleTestCaseIds(rawVisibleTestCaseIds);
    }

    parseVisibleTestCaseIds(rawVisibleTestCaseIds) {
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

    getVisibleTestCaseIds() {
      return this.visibleTestCaseIds.slice();
    }

    getInitialActiveCaseId() {
      if (this.visibleTestCaseIds.length === 0) {
        return null;
      }

      return this.visibleTestCaseIds[0];
    }

    buildResetState(statusLabel) {
      var statusByCaseId = {};

      for (var index = 0; index < this.visibleTestCaseIds.length; index += 1) {
        statusByCaseId[this.visibleTestCaseIds[index]] = {
          statusLabel: statusLabel,
          isPass: false,
          isFail: false
        };
      }

      return {
        statusByCaseId: statusByCaseId,
        passedCount: 0,
        totalCount: this.visibleTestCaseIds.length
      };
    }

    summarizeResults(results) {
      var resultByCaseId = {};
      if (Array.isArray(results)) {
        for (var resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
          var resultEntry = results[resultIndex];
          if (
            isPlainObject(resultEntry) &&
            typeof resultEntry.id === "string"
          ) {
            resultByCaseId[resultEntry.id] = resultEntry;
          }
        }
      }

      var passedCount = 0;
      var statusByCaseId = {};

      for (var index = 0; index < this.visibleTestCaseIds.length; index += 1) {
        var caseId = this.visibleTestCaseIds[index];
        var caseResult = resultByCaseId[caseId];

        if (!caseResult) {
          statusByCaseId[caseId] = {
            statusLabel: "Not run",
            isPass: false,
            isFail: false
          };
          continue;
        }

        var passed = caseResult.passed === true;
        statusByCaseId[caseId] = {
          statusLabel: passed ? "Pass" : "Fail",
          isPass: passed,
          isFail: !passed
        };
        if (passed) {
          passedCount += 1;
        }
      }

      return {
        statusByCaseId: statusByCaseId,
        passedCount: passedCount,
        totalCount: this.visibleTestCaseIds.length
      };
    }
  }

  class SuggestTopicFormValidator {
    buildRequiredFields(fieldValues) {
      return [
        { label: "Topic title", value: fieldValues.title },
        { label: "Problem type", value: fieldValues.problemType },
        { label: "Difficulty", value: fieldValues.difficulty },
        { label: "Learning objective", value: fieldValues.learningObjective },
        { label: "Concept background", value: fieldValues.context },
        { label: "Input specification", value: fieldValues.inputSpecification },
        { label: "Expected output", value: fieldValues.outputSpecification },
        {
          label: "Constraints and edge cases",
          value: fieldValues.constraintsAndEdgeCases
        },
        { label: "Starter signature", value: fieldValues.starterSignature },
        { label: "Visible test case plan", value: fieldValues.visibleTestCasePlan }
      ];
    }

    validateRequiredFields(fieldValues) {
      var requiredFields = this.buildRequiredFields(fieldValues);
      var missingLabels = [];

      for (var index = 0; index < requiredFields.length; index += 1) {
        if (!requiredFields[index].value) {
          missingLabels.push(requiredFields[index].label);
        }
      }

      return {
        isValid: missingLabels.length === 0,
        missingLabels: missingLabels
      };
    }

    buildCompletionSummary(problemTypeValue, titleValue) {
      return "Topic suggestion captured for " + problemTypeValue + ": " + titleValue + ".";
    }
  }

  class AnonymousProgressStore {
    constructor(options) {
      var safeOptions = isPlainObject(options) ? options : {};
      this.storage = safeOptions.storage;
      this.storageKey =
        typeof safeOptions.storageKey === "string"
          ? safeOptions.storageKey
          : "deepmlsr.anonymousProgress.v1";
      this.problemId =
        typeof safeOptions.problemId === "string" ? safeOptions.problemId : "";
      this.nowProvider =
        typeof safeOptions.nowProvider === "function"
          ? safeOptions.nowProvider
          : function () {
              return Date.now();
            };
    }

    createEmptyProgress() {
      return createEmptyProgressSnapshot();
    }

    canUseStorage() {
      return this.storage !== undefined && this.storage !== null;
    }

    read() {
      if (!this.canUseStorage()) {
        return this.createEmptyProgress();
      }

      try {
        var rawValue = this.storage.getItem(this.storageKey);
        if (!rawValue) {
          return this.createEmptyProgress();
        }

        var parsed = JSON.parse(rawValue);
        if (!isPlainObject(parsed)) {
          return this.createEmptyProgress();
        }

        if (
          !Array.isArray(parsed.completedProblemIds) ||
          !Array.isArray(parsed.attemptHistory)
        ) {
          return this.createEmptyProgress();
        }

        return {
          version: 1,
          completedProblemIds: parsed.completedProblemIds.filter(function (entry) {
            return typeof entry === "string";
          }),
          attemptHistory: parsed.attemptHistory
        };
      } catch (error) {
        return this.createEmptyProgress();
      }
    }

    write(progress) {
      if (!this.canUseStorage()) {
        return;
      }

      try {
        this.storage.setItem(this.storageKey, JSON.stringify(progress));
      } catch (error) {
        // noop: keep solve flow non-blocking when storage is unavailable
      }
    }

    persistAttempt(correctness) {
      var progress = this.read();
      progress.attemptHistory.push({
        problemId: this.problemId,
        correctness: correctness,
        submittedAt: new Date(this.nowProvider()).toISOString()
      });

      if (
        (correctness === "pass" || correctness === "partial") &&
        progress.completedProblemIds.indexOf(this.problemId) === -1
      ) {
        progress.completedProblemIds.push(this.problemId);
      }

      this.write(progress);
      return progress;
    }

    getPriorSuccessfulCompletions(progress) {
      var targetProgress =
        isPlainObject(progress) && Array.isArray(progress.attemptHistory)
          ? progress
          : this.createEmptyProgress();

      return targetProgress.attemptHistory.reduce(
        function (count, attempt) {
          if (
            isPlainObject(attempt) &&
            attempt.problemId === this.problemId &&
            attempt.correctness === "pass"
          ) {
            return count + 1;
          }

          return count;
        }.bind(this),
        0
      );
    }

    getDaysSinceLastExposure(progress) {
      var targetProgress =
        isPlainObject(progress) && Array.isArray(progress.attemptHistory)
          ? progress
          : this.createEmptyProgress();

      var latestExposureAtMs = null;
      for (var index = 0; index < targetProgress.attemptHistory.length; index += 1) {
        var attempt = targetProgress.attemptHistory[index];
        if (
          !isPlainObject(attempt) ||
          attempt.problemId !== this.problemId ||
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

      var elapsedSinceExposureMs = this.nowProvider() - latestExposureAtMs;
      if (elapsedSinceExposureMs <= 0) {
        return 0;
      }

      return Math.floor(elapsedSinceExposureMs / 86400000);
    }
  }

  globalScope.DeepMLSRWorkspaceClientDomain = {
    QuestionCatalog: QuestionCatalog,
    VisibleTestCaseTracker: VisibleTestCaseTracker,
    SuggestTopicFormValidator: SuggestTopicFormValidator,
    AnonymousProgressStore: AnonymousProgressStore
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
