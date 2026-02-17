/* Workspace tab, visible test case, and question library controllers. */
import { QuestionCatalog, VisibleTestCaseTracker } from "../domain/models.js"
import {
  setText,
  setClassFlag,
  setTabActiveState,
  setTabSelected
} from "../shared/dom-utils.js"
import type {
  DocumentNodeLike,
  EventNodeLike,
  InnerHtmlNodeLike,
  InputNodeLike,
  PanelNodeLike,
  QuestionCatalogEntry,
  TabNodeLike,
  TextNodeLike,
  VisibleTestCaseStateMap,
  VisibleTestCaseSummary
} from "../shared/types.js"

type WorkspaceTabNodeLike = TabNodeLike & EventNodeLike

type WorkspaceTabControllerOptions = {
  workspaceTabProblem: WorkspaceTabNodeLike | null
  workspaceTabLibrary: WorkspaceTabNodeLike | null
  workspaceProblemTabPanel: PanelNodeLike | null
  workspaceLibraryTabPanel: PanelNodeLike | null
}

type VisibleTestCaseControllerOptions = {
  documentRef: DocumentNodeLike
  tracker: Pick<
    VisibleTestCaseTracker,
    "getVisibleTestCaseIds" | "getInitialActiveCaseId" | "buildResetState" | "summarizeResults"
  >
  appendDebugLine?: (text: string) => void
}

type QuestionLibraryResultNodeLike = TextNodeLike &
  Partial<InnerHtmlNodeLike> &
  Partial<EventNodeLike>

type QuestionLibraryClickTargetLike = {
  closest?: (selector: string) => {
    getAttribute?: (name: string) => string | null
  } | null
}

type QuestionLibraryClickEventLike = {
  preventDefault?: () => void
  target?: unknown
}

type QuestionCatalogModelLike = {
  getCatalog: () => QuestionCatalogEntry[]
  filterQuestions: (normalizedQuery: string, selectedType: string) => QuestionCatalogEntry[]
  renderQuestionListHtml: (questions: QuestionCatalogEntry[]) => string
  renderQuestionListText: (questions: QuestionCatalogEntry[]) => string
}

type QuestionLibraryControllerOptions = {
  catalogModel: QuestionCatalogModelLike
  questionSearchInput: InputNodeLike | null
  questionTypeFilter: InputNodeLike | null
  questionLibraryResults: QuestionLibraryResultNodeLike | null
  questionLibraryCount: TextNodeLike | null
  navigateToProblem?: (problemPath: string) => void
}

export class WorkspaceTabController {
  private readonly workspaceTabProblem: WorkspaceTabNodeLike | null
  private readonly workspaceTabLibrary: WorkspaceTabNodeLike | null
  private readonly workspaceProblemTabPanel: PanelNodeLike | null
  private readonly workspaceLibraryTabPanel: PanelNodeLike | null

  constructor(options: WorkspaceTabControllerOptions) {
    this.workspaceTabProblem = options.workspaceTabProblem
    this.workspaceTabLibrary = options.workspaceTabLibrary
    this.workspaceProblemTabPanel = options.workspaceProblemTabPanel
    this.workspaceLibraryTabPanel = options.workspaceLibraryTabPanel
  }

  activate(tabKey: "problem" | "library"): void {
    if (
      !this.workspaceTabProblem ||
      !this.workspaceTabLibrary ||
      !this.workspaceProblemTabPanel ||
      !this.workspaceLibraryTabPanel
    ) {
      return
    }

    const showProblemTab = tabKey !== "library"
    this.workspaceProblemTabPanel.hidden = !showProblemTab
    this.workspaceLibraryTabPanel.hidden = showProblemTab

    setTabActiveState(this.workspaceTabProblem, showProblemTab)
    setTabActiveState(this.workspaceTabLibrary, !showProblemTab)
    setTabSelected(this.workspaceTabProblem, showProblemTab)
    setTabSelected(this.workspaceTabLibrary, !showProblemTab)
  }

  bind(): void {
    if (
      !this.workspaceTabProblem ||
      !this.workspaceTabLibrary ||
      !this.workspaceProblemTabPanel ||
      !this.workspaceLibraryTabPanel
    ) {
      return
    }

    this.workspaceTabProblem.addEventListener("click", () => {
      this.activate("problem")
    })
    this.workspaceTabLibrary.addEventListener("click", () => {
      this.activate("library")
    })
    this.activate("problem")
  }
}

export class VisibleTestCaseController {
  private readonly documentRef: DocumentNodeLike
  private readonly tracker: VisibleTestCaseControllerOptions["tracker"]
  private readonly appendDebugLine?: (text: string) => void
  private readonly visibleTestCaseIds: string[]
  private activeVisibleTestCaseId: string | null

  constructor(options: VisibleTestCaseControllerOptions) {
    this.documentRef = options.documentRef
    this.tracker = options.tracker
    this.appendDebugLine = options.appendDebugLine
    this.visibleTestCaseIds = this.tracker.getVisibleTestCaseIds()
    this.activeVisibleTestCaseId = this.tracker.getInitialActiveCaseId()
  }

  private getVisibleTestCaseTab(caseId: string): WorkspaceTabNodeLike | null {
    return (this.documentRef.getElementById(
      `test-case-tab-${caseId}`
    ) as WorkspaceTabNodeLike | null) ?? null
  }

  private getVisibleTestCaseStatus(caseId: string): TextNodeLike | null {
    return (this.documentRef.getElementById(
      `test-case-status-${caseId}`
    ) as TextNodeLike | null) ?? null
  }

  private getVisibleTestCasePanel(caseId: string): PanelNodeLike | null {
    return (this.documentRef.getElementById(
      `test-case-panel-${caseId}`
    ) as PanelNodeLike | null) ?? null
  }

  activateVisibleTestCase(caseId: string | null): void {
    if (!caseId) {
      return
    }

    this.activeVisibleTestCaseId = caseId
    for (let index = 0; index < this.visibleTestCaseIds.length; index += 1) {
      const currentCaseId = this.visibleTestCaseIds[index]
      const tab = this.getVisibleTestCaseTab(currentCaseId)
      const panel = this.getVisibleTestCasePanel(currentCaseId)
      const isSelected = currentCaseId === caseId

      if (panel) {
        panel.hidden = !isSelected
      }
      setTabActiveState(tab, isSelected)
      setTabSelected(tab, isSelected)
    }
  }

  private applyVisibleTestCaseState(statusByCaseId: VisibleTestCaseStateMap): void {
    for (let index = 0; index < this.visibleTestCaseIds.length; index += 1) {
      const caseId = this.visibleTestCaseIds[index]
      const tab = this.getVisibleTestCaseTab(caseId)
      const status = this.getVisibleTestCaseStatus(caseId)
      const caseState = statusByCaseId[caseId]

      setClassFlag(tab, "is-pass", Boolean(caseState && caseState.isPass))
      setClassFlag(tab, "is-fail", Boolean(caseState && caseState.isFail))
      if (status) {
        setText(
          status,
          caseState && typeof caseState.statusLabel === "string"
            ? caseState.statusLabel
            : "Not run"
        )
      }
    }
  }

  reset(statusLabel: string): void {
    const resetState = this.tracker.buildResetState(statusLabel)
    this.applyVisibleTestCaseState(resetState.statusByCaseId)
  }

  applyResults(results: unknown): void {
    const summary: VisibleTestCaseSummary = this.tracker.summarizeResults(results)
    this.applyVisibleTestCaseState(summary.statusByCaseId)
    if (summary.totalCount > 0 && typeof this.appendDebugLine === "function") {
      this.appendDebugLine(
        `> visible test cases: ${summary.passedCount}/${summary.totalCount} passed.`
      )
    }
  }

  bind(): void {
    if (this.visibleTestCaseIds.length === 0) {
      return
    }

    for (let index = 0; index < this.visibleTestCaseIds.length; index += 1) {
      const caseId = this.visibleTestCaseIds[index]
      const tab = this.getVisibleTestCaseTab(caseId)
      if (!tab || typeof tab.addEventListener !== "function") {
        continue
      }

      tab.addEventListener("click", () => {
        this.activateVisibleTestCase(caseId)
      })
    }

    this.reset("Not run")
    this.activateVisibleTestCase(this.activeVisibleTestCaseId)
  }
}

export class QuestionLibraryController {
  private readonly catalogModel: QuestionCatalogModelLike
  private readonly questionSearchInput: InputNodeLike | null
  private readonly questionTypeFilter: InputNodeLike | null
  private readonly questionLibraryResults: QuestionLibraryResultNodeLike | null
  private readonly questionLibraryCount: TextNodeLike | null
  private readonly navigateToProblem?: (problemPath: string) => void
  private readonly catalog: QuestionCatalogEntry[]

  constructor(options: QuestionLibraryControllerOptions) {
    this.catalogModel = options.catalogModel
    this.questionSearchInput = options.questionSearchInput
    this.questionTypeFilter = options.questionTypeFilter
    this.questionLibraryResults = options.questionLibraryResults
    this.questionLibraryCount = options.questionLibraryCount
    this.navigateToProblem = options.navigateToProblem
    this.catalog = this.catalogModel.getCatalog()
  }

  private getSelectedType(): string {
    if (this.questionTypeFilter && typeof this.questionTypeFilter.value === "string") {
      return this.questionTypeFilter.value
    }

    return "all"
  }

  render(): void {
    if (!this.questionLibraryResults || !this.questionLibraryCount) {
      return
    }

    const normalizedQuery = QuestionCatalog.normalizeQueryText(
      this.questionSearchInput && typeof this.questionSearchInput.value === "string"
        ? this.questionSearchInput.value
        : ""
    )
    const selectedType = this.getSelectedType()
    const filteredQuestions = this.catalogModel.filterQuestions(
      normalizedQuery,
      selectedType
    )

    setText(
      this.questionLibraryCount,
      `Showing ${filteredQuestions.length} of ${this.catalog.length} questions.`
    )

    if (filteredQuestions.length === 0) {
      if (typeof this.questionLibraryResults.innerHTML === "string") {
        this.questionLibraryResults.innerHTML =
          '<li class="question-library-item">No matching questions yet. Try a different keyword or type.</li>'
      } else {
        setText(
          this.questionLibraryResults,
          "No matching questions yet. Try a different keyword or type."
        )
      }
      return
    }

    const listHtml = this.catalogModel.renderQuestionListHtml(filteredQuestions)
    if (typeof this.questionLibraryResults.innerHTML === "string") {
      this.questionLibraryResults.innerHTML = listHtml
      return
    }

    setText(
      this.questionLibraryResults,
      this.catalogModel.renderQuestionListText(filteredQuestions)
    )
  }

  bind(): void {
    if (this.questionSearchInput) {
      this.questionSearchInput.addEventListener("input", this.render.bind(this))
    }
    if (this.questionTypeFilter) {
      this.questionTypeFilter.addEventListener("change", this.render.bind(this))
    }
    if (
      this.questionLibraryResults &&
      typeof this.questionLibraryResults.addEventListener === "function"
    ) {
      this.questionLibraryResults.addEventListener(
        "click",
        (event: unknown) => {
          const clickEvent = event as QuestionLibraryClickEventLike
          const eventTarget = clickEvent.target as QuestionLibraryClickTargetLike

          if (!eventTarget || typeof eventTarget.closest !== "function") {
            return
          }

          const questionLink = eventTarget.closest(".question-library-item-link")
          if (!questionLink || typeof questionLink.getAttribute !== "function") {
            return
          }

          const problemPath = questionLink.getAttribute("href")
          if (!problemPath || typeof this.navigateToProblem !== "function") {
            return
          }

          if (typeof clickEvent.preventDefault === "function") {
            clickEvent.preventDefault()
          }
          this.navigateToProblem(problemPath)
        }
      )
    }
  }
}
