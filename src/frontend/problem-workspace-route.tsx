import { type ReactElement } from "react"
import katex from "katex"

export type QuestionLibraryItem = {
  id: string
  title: string
  problemType: string
  summary: string
  estimatedMinutes: number
  schedulerWeight?: number
  problemPath?: string
}

export type WorkspaceProblem = {
  id: string
  problemVersion?: number
  title: string
  starterCode: string
  interchangeableThreshold?: number
  category?: string
  goal?: string
  conceptDescription?: string
  inputSpecification?: string
  expectedOutputSpecification?: string
  formulaNotes?: string[]
  architectureUses?: string[]
  evaluationChecklist?: string[]
  visibleTestCases?: Array<{
    id?: string
    name: string
    inputSummary: string
    expectedOutputSummary: string
    reasoning?: string
  }>
  paperLinks?: Array<{
    title: string
    url: string
    note?: string
  }>
  questionCatalog?: QuestionLibraryItem[]
  hints?: {
    tier1: string
    tier2: string
    tier3: string
  }
}

export type EditorFirstLandingRoute = {
  path: "/"
  requiresAuth: false
  screen: "problem-workspace"
  primaryActions: ["run", "submit"]
  accountCallToAction: string
  accountCallToActionPath: "/auth/create-account"
  accountCallToActionOptional: true
  problem: WorkspaceProblem
}

export function createEditorFirstLandingRoute(
  problem: WorkspaceProblem
): EditorFirstLandingRoute {
  return {
    path: "/",
    requiresAuth: false,
    screen: "problem-workspace",
    primaryActions: ["run", "submit"],
    accountCallToAction: "Create an account to save progress",
    accountCallToActionPath: "/auth/create-account",
    accountCallToActionOptional: true,
    problem
  }
}

function renderFormulaMathml(expression: string): string {
  return katex.renderToString(expression, {
    displayMode: true,
    output: "mathml",
    throwOnError: false,
    strict: "ignore"
  })
}

function toStableCaseId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

const INTERCHANGEABLE_WEIGHT_EPSILON = 1e-9

function filterInterchangeableQuestionCatalog(
  questionCatalog: QuestionLibraryItem[],
  threshold: number
): QuestionLibraryItem[] {
  if (questionCatalog.length === 0) {
    return []
  }

  const hasSchedulerWeight = questionCatalog.some((question) => {
    return (
      typeof question.schedulerWeight === "number" &&
      Number.isFinite(question.schedulerWeight)
    )
  })

  if (!hasSchedulerWeight) {
    return questionCatalog
  }

  const normalizedThreshold =
    Number.isFinite(threshold) && threshold >= 0 ? threshold : 0.03
  const sortedByWeight = [...questionCatalog].sort((left, right) => {
    const leftWeight =
      typeof left.schedulerWeight === "number" &&
      Number.isFinite(left.schedulerWeight)
        ? left.schedulerWeight
        : Number.NEGATIVE_INFINITY
    const rightWeight =
      typeof right.schedulerWeight === "number" &&
      Number.isFinite(right.schedulerWeight)
        ? right.schedulerWeight
        : Number.NEGATIVE_INFINITY

    if (rightWeight !== leftWeight) {
      return rightWeight - leftWeight
    }

    return left.title.localeCompare(right.title)
  })
  const topWeight =
    typeof sortedByWeight[0]?.schedulerWeight === "number" &&
    Number.isFinite(sortedByWeight[0].schedulerWeight)
      ? sortedByWeight[0].schedulerWeight
      : Number.NEGATIVE_INFINITY

  return sortedByWeight.filter((question) => {
    if (
      typeof question.schedulerWeight !== "number" ||
      Number.isFinite(question.schedulerWeight) === false
    ) {
      return false
    }

    return (
      topWeight - question.schedulerWeight <=
      normalizedThreshold + INTERCHANGEABLE_WEIGHT_EPSILON
    )
  })
}

export function ProblemWorkspaceScreen(props: {
  route: EditorFirstLandingRoute
}): ReactElement {
  const { route } = props
  const problemCategory = route.problem.category ?? "Attention"
  const problemConceptDescription =
    route.problem.conceptDescription ??
    "Scaled dot-product attention transforms token features by comparing query-key similarity, normalizing with softmax, and aggregating value vectors into context-aware outputs. This workspace uses a single-sequence 2D toy formulation so the core math is isolated from batch/head bookkeeping."
  const inputSpecification =
    route.problem.inputSpecification ??
    "q, k, v are toy float arrays with shape [seq_len, d_k]. Optional mask is an additive bias matrix with shape [seq_len, seq_len] and suppresses disallowed attention targets before softmax."
  const expectedOutputSpecification =
    route.problem.expectedOutputSpecification ??
    "Output shape must be [seq_len, d_k]. Numerical behavior should remain finite and stable with masked positions suppressed before softmax."
  const formulaNotes = route.problem.formulaNotes ?? [
    "\\mathrm{scores} = \\frac{QK^{\\top}}{\\sqrt{d_k}}",
    "\\mathrm{masked\\_scores} = \\mathrm{scores} + \\mathrm{mask\\_bias}",
    "\\mathrm{attention\\_weights} = \\mathrm{softmax}(\\mathrm{masked\\_scores})",
    "\\mathrm{context} = \\mathrm{attention\\_weights}V"
  ]
  const architectureUses = route.problem.architectureUses ?? [
    "Transformer encoder/decoder attention blocks",
    "Cross-attention for conditioning on external context",
    "Vision transformers and multimodal fusion layers"
  ]
  const evaluationChecklist = route.problem.evaluationChecklist ?? [
    "Shape agreement with expected output dimensions",
    "Mask handling correctness and suppression behavior",
    "Finite numerical outputs without NaN/Inf drift"
  ]
  const visibleTestCases = route.problem.visibleTestCases ?? [
    {
      id: "case_1_balanced_tokens",
      name: "Case 1 - Balanced Tokens",
      inputSummary:
        "q, k, v each shape [2, 2] with small values and no mask.",
      expectedOutputSummary:
        "Output shape [2, 2] with finite values preserving weighted context mixing."
    },
    {
      id: "case_2_causal_masking",
      name: "Case 2 - Causal Masking",
      inputSummary:
        "q, k, v shape [3, 2] with an upper-triangular mask blocking future tokens.",
      expectedOutputSummary:
        "Later positions can attend to prior tokens only; masked logits do not affect probabilities."
    },
    {
      id: "case_3_stability_magnitudes",
      name: "Case 3 - Stability Magnitudes",
      inputSummary:
        "q, k, v shape [3, 2] with varied magnitudes to stress numeric stability.",
      expectedOutputSummary:
        "Output shape [3, 2], finite values, and no NaN/Inf."
    }
  ]
  const paperLinks = route.problem.paperLinks ?? [
    {
      title: "Attention Is All You Need (Vaswani et al., 2017)",
      url: "https://arxiv.org/abs/1706.03762",
      note: "Original Transformer paper introducing scaled dot-product attention."
    }
  ]
  const problemHints = route.problem.hints ?? {
    tier1: "Start by checking expected tensor shapes for q, k, and v.",
    tier2: "Compute q @ k^T, apply mask if present, then scale by sqrt(d_k).",
    tier3:
      "Run softmax over the last axis of scaled scores and multiply by v to produce context vectors."
  }
  const problemGoal =
    route.problem.goal ??
    "Implement the core attention step with deterministic toy tensors and submit within this focused session."
  const fullQuestionCatalog = route.problem.questionCatalog ?? [
    {
      id: route.problem.id,
      title: route.problem.title,
      problemType: problemCategory,
      summary:
        route.problem.conceptDescription ??
        "Atomic toy-tensor coding problem for focused practice.",
      estimatedMinutes: 30,
      schedulerWeight: 1,
      problemPath: `/?problemId=${encodeURIComponent(route.problem.id)}`
    }
  ]
  const interchangeableThreshold =
    typeof route.problem.interchangeableThreshold === "number"
      ? route.problem.interchangeableThreshold
      : 0.03
  const questionCatalog = filterInterchangeableQuestionCatalog(
    fullQuestionCatalog,
    interchangeableThreshold
  )
  const visibleQuestionCatalog =
    questionCatalog.length > 0 ? questionCatalog : fullQuestionCatalog
  const questionTypeOptions = Array.from(
    new Set(
      visibleQuestionCatalog.map((question) => {
        return question.problemType
      })
    )
  ).sort((left, right) => {
    return left.localeCompare(right)
  })
  const seenVisibleTestCaseIds = new Set<string>()
  const normalizedVisibleTestCases = visibleTestCases.map((testCase, index) => {
    const fallbackId = `case_${index + 1}`
    const candidateId = toStableCaseId(testCase.id ?? testCase.name)
    const baseId = candidateId.length > 0 ? candidateId : fallbackId
    const uniqueId = seenVisibleTestCaseIds.has(baseId)
      ? `${baseId}_${index + 1}`
      : baseId
    seenVisibleTestCaseIds.add(uniqueId)

    return {
      ...testCase,
      id: uniqueId
    }
  })

  return (
    <main
      aria-label="problem-workspace"
      className="workspace-shell"
      data-workspace-root="true"
      data-problem-id={route.problem.id}
      data-problem-version={route.problem.problemVersion ?? 1}
      data-hint-tier-1={problemHints.tier1}
      data-hint-tier-2={problemHints.tier2}
      data-hint-tier-3={problemHints.tier3}
      data-question-catalog={JSON.stringify(visibleQuestionCatalog)}
      data-visible-test-case-ids={JSON.stringify(
        normalizedVisibleTestCases.map((testCase) => {
          return testCase.id
        })
      )}
    >
      <header className="workspace-topbar">
        <p className="workspace-brand">Kernel Labs</p>
        <div className="topbar-actions">
          <a className="account-cta" href={route.accountCallToActionPath}>
            {route.accountCallToAction}
          </a>
          <button
            className="theme-toggle"
            type="button"
            id="theme-toggle"
            aria-label="Toggle light and dark theme"
          >
            <span className="theme-toggle-track" />
            <span className="theme-toggle-thumb">
              <svg className="theme-toggle-moon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
              <svg className="theme-toggle-sun" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        </div>
      </header>
      <section className="workspace-grid">
        <article className="workspace-card problem-panel">
          <div>
            <p className="problem-eyebrow">Problem</p>
            <h1 className="problem-title">{route.problem.title}</h1>
          </div>
          <p className="problem-goal">{problemGoal}</p>
          <div className="problem-session-bar">
            <p className="session-timer-status" id="session-timer-status">
              Session timer: not started (30:00 limit).
            </p>
            <button className="start-problem-button" type="button" id="start-problem-button">
              Start Problem
            </button>
          </div>
          <p className="timer-cap-message" id="timer-cap-message">
            Timer starts when you click Start Problem or type your first character.
          </p>
          <nav className="workspace-tab-strip" aria-label="workspace-tabs">
            <button
              className="workspace-tab is-active"
              type="button"
              id="workspace-tab-problem"
              aria-selected="true"
              aria-controls="workspace-problem-tab-panel"
            >
              Problem
            </button>
            <button
              className="workspace-tab"
              type="button"
              id="workspace-tab-library"
              aria-selected="false"
              aria-controls="workspace-library-tab-panel"
            >
              Question Bank
            </button>
          </nav>
          <section className="workspace-tab-panel" id="workspace-problem-tab-panel">
            <section className="hint-panel">
              <h2>Hints</h2>
              <p>
                Start with shape reasoning first. Reveal deeper hints only if needed.
              </p>
              <nav className="hint-controls" aria-label="hint-controls">
                <button type="button" id="hint-tier-1-button">
                  Reveal Tier 1
                </button>
                <button type="button" id="hint-tier-2-button" disabled>
                  Reveal Tier 2
                </button>
                <button type="button" id="hint-tier-3-button" disabled>
                  Reveal Tier 3
                </button>
              </nav>
              <p className="hint-status" id="hint-status">
                Hint status: reveal tiers in order. Submission stays available.
              </p>
              <ol className="hint-tier-list" aria-label="revealed-hints">
                <li className="hint-tier-item" id="hint-tier-1-text">
                  Tier 1 hidden.
                </li>
                <li className="hint-tier-item" id="hint-tier-2-text">
                  Tier 2 hidden.
                </li>
                <li className="hint-tier-item" id="hint-tier-3-text">
                  Tier 3 hidden.
                </li>
              </ol>
            </section>
            <section className="problem-context" aria-label="problem-context">
              <details className="context-item" open>
                <summary>Concept Background</summary>
                <div className="context-body">
                  <p>{problemConceptDescription}</p>
                </div>
              </details>
              <details className="context-item">
                <summary>Formulas</summary>
                <div className="context-body">
                  <div className="formula-list" aria-label="latex-formulas">
                    {formulaNotes.map((formula) => {
                      return (
                        <div
                          className="formula-expression"
                          key={formula}
                          dangerouslySetInnerHTML={{
                            __html: renderFormulaMathml(formula)
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </details>
              <details className="context-item">
                <summary>Where It Appears In Architectures</summary>
                <div className="context-body">
                  <ul className="context-list">
                    {architectureUses.map((usage) => {
                      return <li key={usage}>{usage}</li>
                    })}
                  </ul>
                </div>
              </details>
              <details className="context-item">
                <summary>Input Shape And Constraints</summary>
                <div className="context-body">
                  <p>{inputSpecification}</p>
                </div>
              </details>
              <details className="context-item">
                <summary>Expected Outputs And Evaluation</summary>
                <div className="context-body">
                  <p>{expectedOutputSpecification}</p>
                  <ul className="context-list">
                    {evaluationChecklist.map((criterion) => {
                      return <li key={criterion}>{criterion}</li>
                    })}
                  </ul>
                </div>
              </details>
              <details className="context-item">
                <summary>Primary Papers</summary>
                <div className="context-body">
                  <ul className="context-list">
                    {paperLinks.map((paper) => {
                      return (
                        <li key={paper.url}>
                          <a
                            className="paper-link"
                            href={paper.url}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {paper.title}
                          </a>
                          {paper.note ? ` - ${paper.note}` : ""}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </details>
            </section>
          </section>
          <section
            className="workspace-tab-panel"
            id="workspace-library-tab-panel"
            hidden
          >
            <section className="question-library" aria-label="question-library">
              <header className="question-library-header">
                <h2>Question Library</h2>
                <p className="question-library-count" id="question-library-count">
                  Showing {visibleQuestionCatalog.length} of {visibleQuestionCatalog.length} questions.
                </p>
              </header>
              <div className="question-library-controls">
                <input
                  type="search"
                  id="question-search-input"
                  aria-label="question-search-input"
                  placeholder="Search questions (fuzzy title/id/concept)"
                />
                <select
                  id="question-type-filter"
                  aria-label="question-type-filter"
                  defaultValue="all"
                >
                  <option value="all">All Types</option>
                  {questionTypeOptions.map((problemType) => {
                    return (
                      <option key={problemType} value={problemType}>
                        {problemType}
                      </option>
                    )
                  })}
                </select>
                <button type="button" id="suggest-topic-button" className="suggest-topic-button">
                  Suggest a Topic
                </button>
              </div>
              <p className="suggest-topic-status" id="suggest-topic-status">
                Suggest a topic and we can prioritize it in the next problem-pack refresh.
              </p>
              <section
                className="suggest-topic-modal"
                id="suggest-topic-modal"
                aria-label="suggest-topic-modal"
                hidden
              >
                <div
                  className="suggest-topic-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="suggest-topic-heading"
                >
                  <header className="suggest-topic-modal-header">
                    <h3 id="suggest-topic-heading">Suggest a New Coding Problem</h3>
                    <button
                      type="button"
                      id="suggest-topic-close-button"
                      className="suggest-topic-close-button"
                    >
                      Close
                    </button>
                  </header>
                  <p className="suggest-topic-modal-copy">
                    Provide enough detail to define a deterministic toy-tensor problem, expected outputs, and scoring criteria.
                  </p>
                  <form className="suggest-topic-form" id="suggest-topic-form">
                    <label className="suggest-topic-field" htmlFor="suggest-topic-title">
                      <span className="suggest-topic-field-label">Topic Title (Required)</span>
                      <input id="suggest-topic-title" type="text" required />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-problem-type">
                      <span className="suggest-topic-field-label">Problem Type (Required)</span>
                      <input
                        id="suggest-topic-problem-type"
                        type="text"
                        placeholder="Attention, Normalization, Optimization, etc."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-difficulty">
                      <span className="suggest-topic-field-label">Difficulty (Required)</span>
                      <select id="suggest-topic-difficulty" defaultValue="" required>
                        <option value="" disabled>
                          Select difficulty
                        </option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-learning-objective">
                      <span className="suggest-topic-field-label">Learning Objective (Required)</span>
                      <textarea
                        id="suggest-topic-learning-objective"
                        rows={2}
                        placeholder="What should learners understand after solving this?"
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-context">
                      <span className="suggest-topic-field-label">Concept Background (Required)</span>
                      <textarea
                        id="suggest-topic-context"
                        rows={3}
                        placeholder="Explain the concept and why it matters in model architectures."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-input-spec">
                      <span className="suggest-topic-field-label">Input Shape + Specification (Required)</span>
                      <textarea
                        id="suggest-topic-input-spec"
                        rows={3}
                        placeholder="Toy tensor shapes, dtype assumptions, and argument contract."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-output-spec">
                      <span className="suggest-topic-field-label">Expected Output + Evaluation Targets (Required)</span>
                      <textarea
                        id="suggest-topic-output-spec"
                        rows={3}
                        placeholder="Expected output shape, invariants, and correctness criteria."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-constraints">
                      <span className="suggest-topic-field-label">Constraints + Edge Cases (Required)</span>
                      <textarea
                        id="suggest-topic-constraints"
                        rows={3}
                        placeholder="Numerical stability constraints, masking rules, boundary conditions."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-starter-signature">
                      <span className="suggest-topic-field-label">Starter Function Signature (Required)</span>
                      <input
                        id="suggest-topic-starter-signature"
                        type="text"
                        placeholder="def my_function(x, y, mask=None):"
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-visible-tests">
                      <span className="suggest-topic-field-label">Visible Test Case Plan (Required)</span>
                      <textarea
                        id="suggest-topic-visible-tests"
                        rows={3}
                        placeholder="At least 2-3 deterministic visible test cases with expected behavior."
                        required
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-hints">
                      <span className="suggest-topic-field-label">Hint Tier Plan (Optional)</span>
                      <textarea
                        id="suggest-topic-hints"
                        rows={2}
                        placeholder="Conceptual, structural, and near-code hint ideas."
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-paper-link">
                      <span className="suggest-topic-field-label">Paper Or Reference Link (Optional)</span>
                      <input
                        id="suggest-topic-paper-link"
                        type="url"
                        placeholder="https://arxiv.org/abs/..."
                      />
                    </label>
                    <label className="suggest-topic-field" htmlFor="suggest-topic-notes">
                      <span className="suggest-topic-field-label">Additional Notes (Optional)</span>
                      <textarea
                        id="suggest-topic-notes"
                        rows={2}
                        placeholder="Anything else needed for implementation and scoring."
                      />
                    </label>
                    <p className="suggest-topic-modal-feedback" id="suggest-topic-modal-feedback">
                      Fill in the required fields to submit a strong topic proposal.
                    </p>
                    <div className="suggest-topic-modal-actions">
                      <button
                        type="button"
                        id="suggest-topic-cancel-button"
                        className="suggest-topic-cancel-button"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="suggest-topic-submit-button">
                        Submit Topic
                      </button>
                    </div>
                  </form>
                </div>
              </section>
              <ul className="question-library-results" id="question-library-results">
                {visibleQuestionCatalog.map((question) => {
                  const isActiveQuestion = question.id === route.problem.id
                  const questionPath =
                    question.problemPath ??
                    `/?problemId=${encodeURIComponent(question.id)}`
                  return (
                    <li key={question.id} className="question-library-item">
                      <a
                        className={`question-library-item-link${isActiveQuestion ? " is-active" : ""}`}
                        href={questionPath}
                      >
                        <span className="question-library-item-title">
                          {question.title}
                          {isActiveQuestion ? (
                            <span className="question-library-item-active-tag">Active</span>
                          ) : null}
                        </span>
                        <span className="question-library-item-meta">
                          [{question.problemType}] {question.id} - {question.estimatedMinutes}m
                        </span>
                        <span className="question-library-item-summary">
                          {question.summary}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          </section>
        </article>
        <article className="workspace-card editor-panel">
          <header className="editor-header">
            <h2>Starter Code</h2>
            <span className="problem-chip">{problemCategory}</span>
          </header>
          <div className="code-editor-shell">
            <pre className="code-editor-highlight" id="starter-code-highlight" aria-hidden="true">
              <code>{route.problem.starterCode}</code>
            </pre>
            <textarea
              id="starter-code-editor"
              className="code-editor"
              defaultValue={route.problem.starterCode}
              aria-label="starter-code-editor"
              wrap="off"
              spellCheck={false}
            />
          </div>
          <nav aria-label="primary-actions" className="workspace-actions">
            <button className="run-button" type="button" id="run-button">
              Run
            </button>
            <button className="submit-button" type="button" id="submit-button">
              Submit
            </button>
          </nav>
          <section className="debug-shell" aria-label="debug-shell">
            <header className="debug-shell-header">
              <p className="debug-shell-title">Debug Console</p>
              <p className="debug-shell-hint">
                Run as many times as needed before submit.
              </p>
            </header>
            <pre className="debug-shell-output" id="debug-shell-output">
              $ ready: run your code to inspect runtime and evaluator output.
            </pre>
          </section>
          <section className="problem-flag-panel" aria-label="problem-flag-panel">
            <div className="problem-flag-controls">
              <label className="problem-flag-label" htmlFor="flag-problem-reason">
                Flag reason
              </label>
              <select id="flag-problem-reason" defaultValue="incorrect_output">
                <option value="incorrect_output">Incorrect output</option>
                <option value="ambiguous_prompt">Ambiguous prompt</option>
                <option value="insufficient_context">Insufficient context</option>
                <option value="bad_hint">Bad hint</option>
                <option value="other">Other</option>
              </select>
              <button className="flag-problem-button" type="button" id="flag-problem-button">
                Flag Problem
              </button>
            </div>
            <label className="problem-flag-notes-label" htmlFor="flag-problem-notes">
              Notes
            </label>
            <textarea
              id="flag-problem-notes"
              className="problem-flag-notes"
              rows={3}
              placeholder="Briefly describe what looks incorrect or unclear."
            />
            <p className="flag-problem-status" id="flag-problem-status">
              Spot an issue? Flag it and this card will be reviewed.
            </p>
          </section>
          <section
            className="visible-test-cases-panel"
            id="visible-test-cases-panel"
            aria-label="visible-test-cases"
          >
            <header className="visible-test-cases-header">
              <p className="visible-test-cases-title">Visible Test Cases</p>
              <p className="visible-test-cases-subtitle">
                Tabs turn green as each deterministic case passes.
              </p>
            </header>
            <nav className="test-case-tabs" aria-label="test-case-tabs">
              {normalizedVisibleTestCases.map((testCase, index) => {
                return (
                  <button
                    key={testCase.id}
                    className={`test-case-tab${index === 0 ? " is-active" : ""}`}
                    type="button"
                    id={`test-case-tab-${testCase.id}`}
                    aria-controls={`test-case-panel-${testCase.id}`}
                    aria-selected={index === 0 ? "true" : "false"}
                  >
                    <span className="test-case-tab-name">{testCase.name}</span>
                    <span className="test-case-tab-status" id={`test-case-status-${testCase.id}`}>
                      Not run
                    </span>
                  </button>
                )
              })}
            </nav>
            {normalizedVisibleTestCases.map((testCase, index) => {
              return (
                <article
                  className="test-case"
                  id={`test-case-panel-${testCase.id}`}
                  key={`panel-${testCase.id}`}
                  hidden={index !== 0}
                >
                  <p>
                    <strong>{testCase.name}</strong>
                  </p>
                  <p>
                    <strong>Input:</strong> {testCase.inputSummary}
                  </p>
                  <p>
                    <strong>Expected:</strong> {testCase.expectedOutputSummary}
                  </p>
                  {testCase.reasoning ? (
                    <p>
                      <strong>Reasoning:</strong> {testCase.reasoning}
                    </p>
                  ) : null}
                </article>
              )
            })}
          </section>
          <section
            className="status-panel"
            id="workspace-status-panel"
            aria-label="workspace-status"
          >
            <p className="next-presentation-status" id="next-presentation-status">
              Days until next presentation: pending submission.
            </p>
            <p className="status-line" id="run-status">
              Run status: waiting for execution.
            </p>
            <p className="status-line" id="evaluation-status">
              Evaluation status: run code to generate feedback.
            </p>
            <p className="status-line" id="session-status">
              Session status: active.
            </p>
            <p className="status-line" id="schedule-status">
              Scheduling details: pending submission.
            </p>
            <p className="status-celebration-copy" id="status-celebration-copy">
              Submission captured. Keep the momentum going.
            </p>
          </section>
          <p className="supportive-feedback">
            Feedback stays supportive: submission is always allowed.
          </p>
        </article>
      </section>
    </main>
  )
}
