/* Domain-layer classes for workspace client logic.
   These classes stay side-effect-light so behavior remains easy to test. */

import type {
  ProgressAttemptLike,
  ProgressSnapshotLike,
  QuestionCatalogEntry,
  SuggestTopicFieldValues,
  SuggestTopicValidationResult,
  VisibleTestCaseResultLike,
  VisibleTestCaseStateMap,
  VisibleTestCaseSummary,
  WorkspaceCorrectness
} from "../shared/types.js"

type QuestionCatalogOptions = {
  rawCatalog?: string | null
  problemId?: string
}

type AnonymousProgressStoreOptions = {
  storage?: StorageLike | null
  storageKey?: string
  problemId?: string
  nowProvider?: () => number
}

type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

type QuestionSearchCandidate = {
  question: QuestionCatalogEntry
  score: number
}

type RequiredTopicField = {
  label: string
  value: string
}

function normalizeQueryText(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().toLowerCase()
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

function isResultWithPassedFlag(
  value: unknown
): value is VisibleTestCaseResultLike & { passed: boolean } {
  return (
    isPlainObject(value) &&
    typeof value.passed === "boolean"
  )
}

function createEmptyProgressSnapshot(): ProgressSnapshotLike {
  return {
    version: 1,
    completedProblemIds: [],
    attemptHistory: []
  }
}

function isProgressSnapshotLike(value: unknown): value is ProgressSnapshotLike {
  return (
    isPlainObject(value) &&
    Array.isArray(value.completedProblemIds) &&
    Array.isArray(value.attemptHistory)
  )
}

export class QuestionCatalog {
  private readonly problemId: string
  private readonly catalog: QuestionCatalogEntry[]

  constructor(options: QuestionCatalogOptions = {}) {
    this.problemId =
      typeof options.problemId === "string" ? options.problemId : ""
    this.catalog = this.parseCatalog(options.rawCatalog)
  }

  static normalizeQueryText(value: unknown): string {
    return normalizeQueryText(value)
  }

  static escapeHtml(value: unknown): string {
    return escapeHtml(value)
  }

  private createFallbackCatalog(): QuestionCatalogEntry[] {
    return [
      {
        id: this.problemId,
        title: "Current workspace problem",
        problemType: "Current Session",
        summary: "Use this as today's focused practice item.",
        estimatedMinutes: 30
      }
    ]
  }

  private parseCatalog(rawCatalog: string | null | undefined): QuestionCatalogEntry[] {
    if (!rawCatalog) {
      return this.createFallbackCatalog()
    }

    try {
      const parsedCatalog = JSON.parse(rawCatalog)
      if (!Array.isArray(parsedCatalog)) {
        return []
      }

      return parsedCatalog
        .map((entry: unknown): QuestionCatalogEntry | null => {
          if (!isPlainObject(entry)) {
            return null
          }

          const id = typeof entry.id === "string" ? entry.id : ""
          const title = typeof entry.title === "string" ? entry.title : ""
          const problemType =
            typeof entry.problemType === "string"
              ? entry.problemType
              : "Uncategorized"
          const summary =
            typeof entry.summary === "string"
              ? entry.summary
              : "Atomic toy-tensor coding problem."
          const estimatedMinutes =
            typeof entry.estimatedMinutes === "number" &&
            Number.isFinite(entry.estimatedMinutes)
              ? entry.estimatedMinutes
              : 30
          const schedulerWeight =
            typeof entry.schedulerWeight === "number" &&
            Number.isFinite(entry.schedulerWeight)
              ? entry.schedulerWeight
              : undefined
          const problemPath =
            typeof entry.problemPath === "string" && entry.problemPath.length > 0
              ? entry.problemPath
              : undefined

          if (!id || !title) {
            return null
          }

          return {
            id,
            title,
            problemType,
            summary,
            estimatedMinutes: Math.max(1, Math.round(estimatedMinutes)),
            schedulerWeight,
            problemPath
          }
        })
        .filter((entry): entry is QuestionCatalogEntry => entry !== null)
    } catch (_error) {
      return []
    }
  }

  getCatalog(): QuestionCatalogEntry[] {
    return this.catalog.slice()
  }

  computeFuzzyScore(query: string, text: string): number {
    if (!query) {
      return 0
    }

    const normalizedText = normalizeQueryText(text)
    if (!normalizedText) {
      return Number.POSITIVE_INFINITY
    }

    let queryIndex = 0
    let firstMatch = -1
    let lastMatch = -1

    for (let index = 0; index < normalizedText.length; index += 1) {
      if (queryIndex >= query.length) {
        break
      }

      if (normalizedText[index] === query[queryIndex]) {
        if (firstMatch === -1) {
          firstMatch = index
        }
        lastMatch = index
        queryIndex += 1
      }
    }

    if (queryIndex !== query.length) {
      return Number.POSITIVE_INFINITY
    }

    const spanPenalty = lastMatch - firstMatch + 1 - query.length
    return firstMatch + spanPenalty
  }

  private buildQuestionSearchScore(
    question: QuestionCatalogEntry,
    normalizedQuery: string
  ): number {
    if (!normalizedQuery) {
      return 0
    }

    let bestScore = Number.POSITIVE_INFINITY
    const candidates = [
      question.title,
      question.id,
      question.problemType,
      question.summary
    ]

    for (let index = 0; index < candidates.length; index += 1) {
      const score = this.computeFuzzyScore(normalizedQuery, candidates[index])
      if (score < bestScore) {
        bestScore = score
      }
    }

    return bestScore
  }

  filterQuestions(normalizedQuery: string, selectedType: string): QuestionCatalogEntry[] {
    const safeQuery = normalizeQueryText(normalizedQuery)
    const safeType =
      typeof selectedType === "string" && selectedType.length > 0
        ? selectedType
        : "all"

    return this.catalog
      .filter((question) => {
        if (safeType === "all") {
          return true
        }

        return question.problemType === safeType
      })
      .map(
        (question): QuestionSearchCandidate => ({
          question,
          score: this.buildQuestionSearchScore(question, safeQuery)
        })
      )
      .filter((candidate) => candidate.score !== Number.POSITIVE_INFINITY)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score
        }

        return left.question.title.localeCompare(right.question.title)
      })
      .map((candidate) => candidate.question)
  }

  renderQuestionListHtml(questions: QuestionCatalogEntry[]): string {
    return questions
      .map((question) => {
        const isActiveQuestion = question.id === this.problemId
        const escapedId = encodeURIComponent(question.id)
        const questionPath =
          typeof question.problemPath === "string" && question.problemPath.length > 0
            ? question.problemPath
            : `/?problemId=${escapedId}`
        return (
          '<li class="question-library-item">' +
          '<a class="question-library-item-link' +
          (isActiveQuestion ? " is-active" : "") +
          '" href="' +
          escapeHtml(questionPath) +
          '">' +
          '<span class="question-library-item-title">' +
          escapeHtml(question.title) +
          (isActiveQuestion
            ? '<span class="question-library-item-active-tag">Active</span>'
            : "") +
          "</span> " +
          '<span class="question-library-item-meta">[' +
          escapeHtml(question.problemType) +
          "] " +
          escapeHtml(question.id) +
          " - " +
          question.estimatedMinutes +
          "m</span>" +
          '<span class="question-library-item-summary">' +
          escapeHtml(question.summary) +
          "</span>" +
          "</a>" +
          "</li>"
        )
      })
      .join("")
  }

  renderQuestionListText(questions: QuestionCatalogEntry[]): string {
    return questions
      .map((question) => {
        return (
          question.title +
          " [" +
          question.problemType +
          "] " +
          question.id +
          " - " +
          question.estimatedMinutes +
          "m"
        )
      })
      .join("\n")
  }
}

export class VisibleTestCaseTracker {
  private readonly visibleTestCaseIds: string[]

  constructor(rawVisibleTestCaseIds?: string | null) {
    this.visibleTestCaseIds = this.parseVisibleTestCaseIds(rawVisibleTestCaseIds)
  }

  private parseVisibleTestCaseIds(rawVisibleTestCaseIds?: string | null): string[] {
    if (!rawVisibleTestCaseIds) {
      return []
    }

    try {
      const parsedIds = JSON.parse(rawVisibleTestCaseIds)
      if (!Array.isArray(parsedIds)) {
        return []
      }

      return parsedIds.filter(
        (entry): entry is string => typeof entry === "string" && entry.length > 0
      )
    } catch (_error) {
      return []
    }
  }

  getVisibleTestCaseIds(): string[] {
    return this.visibleTestCaseIds.slice()
  }

  getInitialActiveCaseId(): string | null {
    if (this.visibleTestCaseIds.length === 0) {
      return null
    }

    return this.visibleTestCaseIds[0]
  }

  buildResetState(statusLabel: string): VisibleTestCaseSummary {
    const statusByCaseId: VisibleTestCaseStateMap = {}

    for (let index = 0; index < this.visibleTestCaseIds.length; index += 1) {
      statusByCaseId[this.visibleTestCaseIds[index]] = {
        statusLabel,
        isPass: false,
        isFail: false
      }
    }

    return {
      statusByCaseId,
      passedCount: 0,
      totalCount: this.visibleTestCaseIds.length
    }
  }

  summarizeResults(results: unknown): VisibleTestCaseSummary {
    const resultByCaseId: Record<string, VisibleTestCaseResultLike> = {}
    const orderedResults: Array<VisibleTestCaseResultLike & { passed: boolean }> = []
    if (Array.isArray(results)) {
      for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
        const resultEntry = results[resultIndex]
        if (isPlainObject(resultEntry) && typeof resultEntry.id === "string") {
          resultByCaseId[resultEntry.id] = resultEntry
        }
        if (isResultWithPassedFlag(resultEntry)) {
          orderedResults.push(resultEntry)
        }
      }
    }

    let passedCount = 0
    const statusByCaseId: VisibleTestCaseStateMap = {}

    for (let index = 0; index < this.visibleTestCaseIds.length; index += 1) {
      const caseId = this.visibleTestCaseIds[index]
      const caseResult = resultByCaseId[caseId] ?? orderedResults[index]

      if (!caseResult) {
        statusByCaseId[caseId] = {
          statusLabel: "Not run",
          isPass: false,
          isFail: false
        }
        continue
      }

      const passed = caseResult.passed === true
      statusByCaseId[caseId] = {
        statusLabel: passed ? "Pass" : "Fail",
        isPass: passed,
        isFail: !passed
      }
      if (passed) {
        passedCount += 1
      }
    }

    return {
      statusByCaseId,
      passedCount,
      totalCount: this.visibleTestCaseIds.length
    }
  }
}

export class SuggestTopicFormValidator {
  private buildRequiredFields(fieldValues: SuggestTopicFieldValues): RequiredTopicField[] {
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
    ]
  }

  validateRequiredFields(
    fieldValues: SuggestTopicFieldValues
  ): SuggestTopicValidationResult {
    const requiredFields = this.buildRequiredFields(fieldValues)
    const missingLabels: string[] = []

    for (let index = 0; index < requiredFields.length; index += 1) {
      if (!requiredFields[index].value) {
        missingLabels.push(requiredFields[index].label)
      }
    }

    return {
      isValid: missingLabels.length === 0,
      missingLabels
    }
  }

  buildCompletionSummary(problemTypeValue: string, titleValue: string): string {
    return `Topic suggestion captured for ${problemTypeValue}: ${titleValue}.`
  }
}

export class AnonymousProgressStore {
  private readonly storage: StorageLike | null
  private readonly storageKey: string
  private readonly problemId: string
  private readonly nowProvider: () => number

  constructor(options: AnonymousProgressStoreOptions = {}) {
    this.storage =
      options.storage &&
      typeof options.storage.getItem === "function" &&
      typeof options.storage.setItem === "function"
        ? options.storage
        : null
    this.storageKey =
      typeof options.storageKey === "string"
        ? options.storageKey
        : "deepmlsr.anonymousProgress.v1"
    this.problemId = typeof options.problemId === "string" ? options.problemId : ""
    this.nowProvider =
      typeof options.nowProvider === "function"
        ? options.nowProvider
        : () => {
            return Date.now()
          }
  }

  private createEmptyProgress(): ProgressSnapshotLike {
    return createEmptyProgressSnapshot()
  }

  canUseStorage(): boolean {
    return this.storage !== null
  }

  read(): ProgressSnapshotLike {
    if (!this.canUseStorage() || !this.storage) {
      return this.createEmptyProgress()
    }

    try {
      const rawValue = this.storage.getItem(this.storageKey)
      if (!rawValue) {
        return this.createEmptyProgress()
      }

      const parsed = JSON.parse(rawValue)
      if (!isProgressSnapshotLike(parsed)) {
        return this.createEmptyProgress()
      }

      return {
        version: 1,
        completedProblemIds: parsed.completedProblemIds.filter(
          (entry): entry is string => typeof entry === "string"
        ),
        attemptHistory: parsed.attemptHistory
      }
    } catch (_error) {
      return this.createEmptyProgress()
    }
  }

  private write(progress: ProgressSnapshotLike): void {
    if (!this.canUseStorage() || !this.storage) {
      return
    }

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(progress))
    } catch (_error) {
      // noop: keep solve flow non-blocking when storage is unavailable
    }
  }

  persistAttempt(correctness: WorkspaceCorrectness | string): ProgressSnapshotLike {
    const progress = this.read()
    progress.attemptHistory.push({
      problemId: this.problemId,
      correctness,
      submittedAt: new Date(this.nowProvider()).toISOString()
    })

    if (
      (correctness === "pass" || correctness === "partial") &&
      progress.completedProblemIds.indexOf(this.problemId) === -1
    ) {
      progress.completedProblemIds.push(this.problemId)
    }

    this.write(progress)
    return progress
  }

  getPriorSuccessfulCompletions(progress: unknown): number {
    const targetProgress = isProgressSnapshotLike(progress)
      ? progress
      : this.createEmptyProgress()

    return targetProgress.attemptHistory.reduce((count, attempt) => {
      if (
        isPlainObject(attempt) &&
        attempt.problemId === this.problemId &&
        attempt.correctness === "pass"
      ) {
        return count + 1
      }

      return count
    }, 0)
  }

  getDaysSinceLastExposure(progress: unknown): number {
    const targetProgress = isProgressSnapshotLike(progress)
      ? progress
      : this.createEmptyProgress()

    let latestExposureAtMs: number | null = null
    for (let index = 0; index < targetProgress.attemptHistory.length; index += 1) {
      const attempt: ProgressAttemptLike = targetProgress.attemptHistory[index]
      if (
        !isPlainObject(attempt) ||
        attempt.problemId !== this.problemId ||
        typeof attempt.submittedAt !== "string"
      ) {
        continue
      }

      const submittedAtMs = Date.parse(attempt.submittedAt)
      if (Number.isNaN(submittedAtMs)) {
        continue
      }

      if (latestExposureAtMs === null || submittedAtMs > latestExposureAtMs) {
        latestExposureAtMs = submittedAtMs
      }
    }

    if (latestExposureAtMs === null) {
      return 0
    }

    const elapsedSinceExposureMs = this.nowProvider() - latestExposureAtMs
    if (elapsedSinceExposureMs <= 0) {
      return 0
    }

    return Math.floor(elapsedSinceExposureMs / 86400000)
  }
}
