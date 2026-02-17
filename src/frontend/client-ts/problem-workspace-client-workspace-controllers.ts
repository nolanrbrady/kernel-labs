// @ts-nocheck
/* Workspace tab, visible test case, and question library controllers. */
(function (globalScope) {
  var domain = globalScope.DeepMLSRWorkspaceClientDomain;
  var shared = globalScope.DeepMLSRWorkspaceClientControllerShared;
  if (!domain || !shared) { return; }
  var setText = shared.setText;
  var setClassFlag = shared.setClassFlag;
  var setTabActiveState = shared.setTabActiveState;
  var setTabSelected = shared.setTabSelected;
  class WorkspaceTabController {
    constructor(options) {
      this.workspaceTabProblem = options.workspaceTabProblem;
      this.workspaceTabLibrary = options.workspaceTabLibrary;
      this.workspaceProblemTabPanel = options.workspaceProblemTabPanel;
      this.workspaceLibraryTabPanel = options.workspaceLibraryTabPanel;
    }

    activate(tabKey) {
      if (
        !this.workspaceTabProblem ||
        !this.workspaceTabLibrary ||
        !this.workspaceProblemTabPanel ||
        !this.workspaceLibraryTabPanel
      ) {
        return;
      }

      var showProblemTab = tabKey !== "library";
      this.workspaceProblemTabPanel.hidden = !showProblemTab;
      this.workspaceLibraryTabPanel.hidden = showProblemTab;

      setTabActiveState(this.workspaceTabProblem, showProblemTab);
      setTabActiveState(this.workspaceTabLibrary, !showProblemTab);
      setTabSelected(this.workspaceTabProblem, showProblemTab);
      setTabSelected(this.workspaceTabLibrary, !showProblemTab);
    }

    bind() {
      if (
        !this.workspaceTabProblem ||
        !this.workspaceTabLibrary ||
        !this.workspaceProblemTabPanel ||
        !this.workspaceLibraryTabPanel
      ) {
        return;
      }

      this.workspaceTabProblem.addEventListener(
        "click",
        function () {
          this.activate("problem");
        }.bind(this)
      );
      this.workspaceTabLibrary.addEventListener(
        "click",
        function () {
          this.activate("library");
        }.bind(this)
      );
      this.activate("problem");
    }
  }

  class VisibleTestCaseController {
    constructor(options) {
      this.documentRef = options.documentRef;
      this.tracker = options.tracker;
      this.appendDebugLine = options.appendDebugLine;
      this.visibleTestCaseIds = this.tracker.getVisibleTestCaseIds();
      this.activeVisibleTestCaseId = this.tracker.getInitialActiveCaseId();
    }

    getVisibleTestCaseTab(caseId) {
      return this.documentRef.getElementById("test-case-tab-" + caseId);
    }

    getVisibleTestCaseStatus(caseId) {
      return this.documentRef.getElementById("test-case-status-" + caseId);
    }

    getVisibleTestCasePanel(caseId) {
      return this.documentRef.getElementById("test-case-panel-" + caseId);
    }

    activateVisibleTestCase(caseId) {
      if (!caseId) {
        return;
      }

      this.activeVisibleTestCaseId = caseId;
      for (var index = 0; index < this.visibleTestCaseIds.length; index += 1) {
        var currentCaseId = this.visibleTestCaseIds[index];
        var tab = this.getVisibleTestCaseTab(currentCaseId);
        var panel = this.getVisibleTestCasePanel(currentCaseId);
        var isSelected = currentCaseId === caseId;

        if (panel) {
          panel.hidden = !isSelected;
        }
        setTabActiveState(tab, isSelected);
        setTabSelected(tab, isSelected);
      }
    }

    applyVisibleTestCaseState(statusByCaseId) {
      for (var index = 0; index < this.visibleTestCaseIds.length; index += 1) {
        var caseId = this.visibleTestCaseIds[index];
        var tab = this.getVisibleTestCaseTab(caseId);
        var status = this.getVisibleTestCaseStatus(caseId);
        var caseState = statusByCaseId[caseId];

        setClassFlag(tab, "is-pass", Boolean(caseState && caseState.isPass));
        setClassFlag(tab, "is-fail", Boolean(caseState && caseState.isFail));
        if (status) {
          setText(
            status,
            caseState && typeof caseState.statusLabel === "string"
              ? caseState.statusLabel
              : "Not run"
          );
        }
      }
    }

    reset(statusLabel) {
      var resetState = this.tracker.buildResetState(statusLabel);
      this.applyVisibleTestCaseState(resetState.statusByCaseId);
    }

    applyResults(results) {
      var summary = this.tracker.summarizeResults(results);
      this.applyVisibleTestCaseState(summary.statusByCaseId);
      if (summary.totalCount > 0 && typeof this.appendDebugLine === "function") {
        this.appendDebugLine(
          "> visible test cases: " +
            summary.passedCount +
            "/" +
            summary.totalCount +
            " passed."
        );
      }
    }

    bind() {
      if (this.visibleTestCaseIds.length === 0) {
        return;
      }

      for (var index = 0; index < this.visibleTestCaseIds.length; index += 1) {
        var caseId = this.visibleTestCaseIds[index];
        var tab = this.getVisibleTestCaseTab(caseId);
        if (!tab || typeof tab.addEventListener !== "function") {
          continue;
        }

        (function (id, controller) {
          tab.addEventListener("click", function () {
            controller.activateVisibleTestCase(id);
          });
        })(caseId, this);
      }

      this.reset("Not run");
      this.activateVisibleTestCase(this.activeVisibleTestCaseId);
    }
  }

  class QuestionLibraryController {
    constructor(options) {
      this.catalogModel = options.catalogModel;
      this.questionSearchInput = options.questionSearchInput;
      this.questionTypeFilter = options.questionTypeFilter;
      this.questionLibraryResults = options.questionLibraryResults;
      this.questionLibraryCount = options.questionLibraryCount;
      this.catalog = this.catalogModel.getCatalog();
    }

    getSelectedType() {
      if (
        this.questionTypeFilter &&
        typeof this.questionTypeFilter.value === "string"
      ) {
        return this.questionTypeFilter.value;
      }

      return "all";
    }

    render() {
      if (!this.questionLibraryResults || !this.questionLibraryCount) {
        return;
      }

      var normalizedQuery = domain.QuestionCatalog.normalizeQueryText(
        this.questionSearchInput && typeof this.questionSearchInput.value === "string"
          ? this.questionSearchInput.value
          : ""
      );
      var selectedType = this.getSelectedType();
      var filteredQuestions = this.catalogModel.filterQuestions(
        normalizedQuery,
        selectedType
      );

      setText(
        this.questionLibraryCount,
        "Showing " + filteredQuestions.length + " of " + this.catalog.length + " questions."
      );

      if (filteredQuestions.length === 0) {
        if ("innerHTML" in this.questionLibraryResults) {
          this.questionLibraryResults.innerHTML =
            "<li class=\"question-library-item\">No matching questions yet. Try a different keyword or type.</li>";
        } else {
          setText(
            this.questionLibraryResults,
            "No matching questions yet. Try a different keyword or type."
          );
        }
        return;
      }

      var listHtml = this.catalogModel.renderQuestionListHtml(filteredQuestions);
      if ("innerHTML" in this.questionLibraryResults) {
        this.questionLibraryResults.innerHTML = listHtml;
        return;
      }

      setText(
        this.questionLibraryResults,
        this.catalogModel.renderQuestionListText(filteredQuestions)
      );
    }

    bind() {
      if (this.questionSearchInput) {
        this.questionSearchInput.addEventListener("input", this.render.bind(this));
      }
      if (this.questionTypeFilter) {
        this.questionTypeFilter.addEventListener("change", this.render.bind(this));
      }
    }
  }
  var controllers = globalScope.DeepMLSRWorkspaceClientControllers || (globalScope.DeepMLSRWorkspaceClientControllers = {});
  controllers.WorkspaceTabController = WorkspaceTabController;
  controllers.VisibleTestCaseController = VisibleTestCaseController;
  controllers.QuestionLibraryController = QuestionLibraryController;
})(typeof globalThis !== "undefined" ? globalThis : this);
