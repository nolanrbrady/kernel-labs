import assert from "node:assert/strict"
import test from "node:test"
import {
  QuestionCatalog,
  VisibleTestCaseTracker,
  SuggestTopicFormValidator,
  AnonymousProgressStore
} from "../src/frontend/client-ts/problem-workspace-client-domain.js"

function loadDomainClasses() {
  return {
    QuestionCatalog,
    VisibleTestCaseTracker,
    SuggestTopicFormValidator,
    AnonymousProgressStore
  }
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

test("question catalog falls back to current workspace problem when no payload is available", () => {
  const { QuestionCatalog } = loadDomainClasses()
  const catalog = new QuestionCatalog({
    problemId: "attention_scaled_dot_product_v1"
  })

  assert.deepEqual(toPlain(catalog.getCatalog()), [
    {
      id: "attention_scaled_dot_product_v1",
      title: "Current workspace problem",
      problemType: "Current Session",
      summary: "Use this as today's focused practice item.",
      estimatedMinutes: 30
    }
  ])
})

test("question catalog applies fuzzy matching and type filtering deterministically", () => {
  const { QuestionCatalog } = loadDomainClasses()
  const catalog = new QuestionCatalog({
    rawCatalog: JSON.stringify([
      {
        id: "normalization_layernorm_forward_v1",
        title: "Implement LayerNorm Forward Pass",
        problemType: "Normalization",
        summary: "Normalize activations row-wise with epsilon stabilization.",
        estimatedMinutes: 25
      },
      {
        id: "attention_scaled_dot_product_core_v1",
        title: "Implement Scaled Dot-Product Attention Core",
        problemType: "Attention",
        summary: "Compute qk attention with optional masking on toy tensors.",
        estimatedMinutes: 30
      },
      {
        id: "mlp_affine_relu_step_v1",
        title: "Implement a Single MLP Affine + ReLU Step",
        problemType: "MLP",
        summary: "Compose affine transform and relu for toy tensors.",
        estimatedMinutes: 20
      }
    ])
  })

  const fuzzyFiltered = catalog.filterQuestions("lnfwd", "all")
  assert.equal(fuzzyFiltered.length, 1)
  assert.equal(fuzzyFiltered[0]?.id, "normalization_layernorm_forward_v1")

  const typeFiltered = catalog.filterQuestions("", "Attention")
  assert.equal(typeFiltered.length, 1)
  assert.equal(typeFiltered[0]?.id, "attention_scaled_dot_product_core_v1")

  assert.equal(
    catalog.computeFuzzyScore("zzz", "attention"),
    Number.POSITIVE_INFINITY
  )
})

test("question catalog list rendering escapes HTML-sensitive values", () => {
  const { QuestionCatalog } = loadDomainClasses()
  const catalog = new QuestionCatalog({
    rawCatalog: JSON.stringify([
      {
        id: "unsafe_<id>",
        title: "Unsafe <script>alert(1)</script>",
        problemType: "Attention",
        summary: "Summary with 'quotes' & symbols.",
        estimatedMinutes: 30
      }
    ])
  })
  const html = catalog.renderQuestionListHtml(catalog.getCatalog())

  assert.equal(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), true)
  assert.equal(html.includes("unsafe_&lt;id&gt;"), true)
  assert.equal(html.includes("&#39;quotes&#39; &amp; symbols."), true)
})

test("visible test-case tracker summarizes statuses for pass/fail/not-run paths", () => {
  const { VisibleTestCaseTracker } = loadDomainClasses()
  const tracker = new VisibleTestCaseTracker(
    JSON.stringify([
      "case_1_balanced_tokens",
      "",
      "case_2_causal_masking",
      42
    ])
  )

  assert.deepEqual(toPlain(tracker.getVisibleTestCaseIds()), [
    "case_1_balanced_tokens",
    "case_2_causal_masking"
  ])
  assert.equal(tracker.getInitialActiveCaseId(), "case_1_balanced_tokens")

  const resetState = tracker.buildResetState("Running...")
  const resetStatusByCaseId = resetState.statusByCaseId as Record<
    string,
    { statusLabel: string; isPass: boolean; isFail: boolean }
  >
  assert.equal(resetState.totalCount, 2)
  assert.deepEqual(
    toPlain(resetStatusByCaseId["case_2_causal_masking"]),
    {
      statusLabel: "Running...",
      isPass: false,
      isFail: false
    }
  )

  const resultState = tracker.summarizeResults([
    {
      id: "case_1_balanced_tokens",
      passed: true
    },
    {
      id: "case_2_causal_masking",
      passed: false
    }
  ])
  const resultStatusByCaseId = resultState.statusByCaseId as Record<
    string,
    { statusLabel: string; isPass: boolean; isFail: boolean }
  >

  assert.equal(resultState.passedCount, 1)
  assert.deepEqual(
    toPlain(resultStatusByCaseId["case_1_balanced_tokens"]),
    {
      statusLabel: "Pass",
      isPass: true,
      isFail: false
    }
  )
  assert.deepEqual(
    toPlain(resultStatusByCaseId["case_2_causal_masking"]),
    {
      statusLabel: "Fail",
      isPass: false,
      isFail: true
    }
  )
})

test("suggest-topic validator enforces required fields and builds completion summary", () => {
  const { SuggestTopicFormValidator } = loadDomainClasses()
  const validator = new SuggestTopicFormValidator()

  const invalidResult = validator.validateRequiredFields({
    title: "",
    problemType: "Attention",
    difficulty: "",
    learningObjective: "Learn masking.",
    context: "Attention computes weighted combinations.",
    inputSpecification: "",
    outputSpecification: "Return context tensor.",
    constraintsAndEdgeCases: "",
    starterSignature: "def solve(x):",
    visibleTestCasePlan: ""
  })

  assert.equal(invalidResult.isValid, false)
  assert.deepEqual(toPlain(invalidResult.missingLabels), [
    "Topic title",
    "Difficulty",
    "Input specification",
    "Constraints and edge cases",
    "Visible test case plan"
  ])

  const validResult = validator.validateRequiredFields({
    title: "Rotary Embeddings",
    problemType: "Attention",
    difficulty: "Medium",
    learningObjective: "Apply rotation matrices correctly.",
    context: "RoPE adds relative positional information.",
    inputSpecification: "q, k shape [seq_len, d_k].",
    outputSpecification: "rotated q and k with same shape.",
    constraintsAndEdgeCases: "Even d_k and finite outputs.",
    starterSignature: "def apply_rope(q, k, positions):",
    visibleTestCasePlan: "No-rotation, partial-rotation, stability checks."
  })

  assert.equal(validResult.isValid, true)
  assert.deepEqual(toPlain(validResult.missingLabels), [])
  assert.equal(
    validator.buildCompletionSummary("Attention", "Rotary Embeddings"),
    "Topic suggestion captured for Attention: Rotary Embeddings."
  )
})

test("anonymous progress store persists attempts and computes scheduling metrics", () => {
  const { AnonymousProgressStore } = loadDomainClasses()
  const storageMap = new Map<string, string>()

  const store = new AnonymousProgressStore({
    storage: {
      getItem(key: string) {
        return storageMap.get(key) ?? null
      },
      setItem(key: string, value: string) {
        storageMap.set(key, value)
      }
    },
    storageKey: "deepmlsr.anonymousProgress.v1",
    problemId: "attention_scaled_dot_product_v1",
    nowProvider: () => Date.parse("2026-02-17T12:00:00.000Z")
  })

  assert.deepEqual(toPlain(store.read()), {
    version: 1,
    completedProblemIds: [],
    attemptHistory: []
  })

  const persisted = store.persistAttempt("partial")
  assert.equal(persisted.version, 1)
  assert.deepEqual(toPlain(persisted.completedProblemIds), [
    "attention_scaled_dot_product_v1"
  ])
  assert.equal(persisted.attemptHistory.length, 1)
  assert.equal(persisted.attemptHistory[0]?.correctness, "partial")
  assert.equal(
    persisted.attemptHistory[0]?.submittedAt,
    "2026-02-17T12:00:00.000Z"
  )

  const progressSnapshot = {
    version: 1,
    completedProblemIds: ["attention_scaled_dot_product_v1"],
    attemptHistory: [
      {
        problemId: "attention_scaled_dot_product_v1",
        correctness: "pass",
        submittedAt: "2026-02-15T11:59:59.000Z"
      },
      {
        problemId: "attention_scaled_dot_product_v1",
        correctness: "fail",
        submittedAt: "2026-02-16T12:00:00.000Z"
      },
      {
        problemId: "other_problem",
        correctness: "pass",
        submittedAt: "2026-02-17T00:00:00.000Z"
      }
    ]
  }

  assert.equal(store.getPriorSuccessfulCompletions(progressSnapshot), 1)
  assert.equal(store.getDaysSinceLastExposure(progressSnapshot), 1)
})
