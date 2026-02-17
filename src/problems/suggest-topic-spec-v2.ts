import {
  validateProblemSpecV2,
  type ProblemSpecV2,
  type VerificationCase,
  type ProblemSpecV2ValidationResult
} from "./problem-spec-v2.js"

export type SuggestTopicDraft = {
  title: string
  problemType: string
  difficulty: string
  learningObjective: string
  context: string
  inputSpecification: string
  outputSpecification: string
  constraintsAndEdgeCases: string
  starterSignature: string
  visibleTestCasePlan: string
  hints?: string
  paperLink?: string
  notes?: string
}

export type SuggestTopicProblemSpecValidation = {
  ok: boolean
  errors: string[]
  warnings: string[]
  provisionalSpec: ProblemSpecV2
}

function toSnakeCase(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function normalizeText(value: string | undefined): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function normalizeTimestampIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z")
}

function mapProblemTypeToCategory(problemType: string): ProblemSpecV2["category"] {
  const normalizedType = problemType.toLowerCase()

  if (normalizedType.includes("normal")) {
    return "Normalization"
  }
  if (normalizedType.includes("rnn") || normalizedType.includes("gru") || normalizedType.includes("lstm")) {
    return "RNNs"
  }
  if (normalizedType.includes("attn") || normalizedType.includes("attention")) {
    return "Attention"
  }
  if (
    normalizedType.includes("condition") ||
    normalizedType.includes("film") ||
    normalizedType.includes("modulat")
  ) {
    return "Conditioning & Modulation"
  }
  if (
    normalizedType.includes("adapter") ||
    normalizedType.includes("adapt") ||
    normalizedType.includes("lora") ||
    normalizedType.includes("efficien")
  ) {
    return "Adaptation & Efficiency"
  }
  if (
    normalizedType.includes("position") ||
    normalizedType.includes("rope") ||
    normalizedType.includes("rotary")
  ) {
    return "Positional Encoding"
  }

  return "MLP"
}

function inferEstimatedTimeMinutes(difficulty: string): number {
  const normalizedDifficulty = difficulty.toLowerCase()

  if (normalizedDifficulty === "easy") {
    return 15
  }
  if (normalizedDifficulty === "hard") {
    return 30
  }

  return 25
}

function normalizeFunctionSignature(signature: string, title: string): string {
  const trimmedSignature = signature.trim()

  if (/^def\s+[a-z_][a-z0-9_]*\s*\(.+\):$/i.test(trimmedSignature)) {
    return trimmedSignature
  }

  const fallbackName = toSnakeCase(title) || "solve_problem"
  return `def ${fallbackName}(x):`
}

function extractFunctionName(signature: string): string {
  const matched = signature.match(/^def\s+([a-z_][a-z0-9_]*)\s*\(/i)
  if (!matched) {
    return "solve_problem"
  }

  return matched[1]
}

function extractTensorShapeEntries(inputSpecification: string): string[] {
  const entries: string[] = []
  const pattern = /([a-z_][a-z0-9_]*)?\s*[:=]?\s*\[(\d+\s*,\s*\d+)\]/gi
  let matched = pattern.exec(inputSpecification)

  while (matched) {
    const maybeName = typeof matched[1] === "string" && matched[1].length > 0
      ? matched[1].toLowerCase()
      : `tensor_${entries.length + 1}`
    entries.push(`${maybeName}: [${matched[2]}]`)
    matched = pattern.exec(inputSpecification)
  }

  if (entries.length >= 2) {
    return entries
  }

  const fallbackEntries = [
    "x: [2, 2]",
    "y: [2, 2]"
  ]
  return Array.from(new Set([...entries, ...fallbackEntries])).slice(0, 2)
}

function extractOutputShape(outputSpecification: string): string {
  const matched = outputSpecification.match(/\[(\d+\s*,\s*\d+)\]/)
  if (!matched) {
    return "[2, 2]"
  }

  return `[${matched[1]}]`
}

function parseDelimitedEntries(value: string): string[] {
  return value
    .split(/\r?\n|;/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function parseVisibleTestCases(visibleTestCasePlan: string): VerificationCase[] {
  const splitByCaseBoundary = visibleTestCasePlan
    .split(/\r?\n|;|,\s*(?=Case\s*\d+)/i)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return splitByCaseBoundary.map((entry, index) => {
    const caseId = `visible_case_${index + 1}`
    return {
      id: caseId,
      purpose: `Visible learner-facing test case ${index + 1}`,
      input_summary: entry,
      expected_behavior: `Candidate output should satisfy ${entry.toLowerCase()}.`
    }
  })
}

function buildGeneratedHiddenCases(title: string): VerificationCase[] {
  const normalizedTitle = title.trim().toLowerCase() || "this operation"

  return [
    {
      id: "hidden_case_scale_stability",
      purpose: "Validate numerical stability under scaled magnitudes",
      input_summary: "Larger magnitude toy tensors",
      expected_behavior: `Output remains finite and semantically aligned with ${normalizedTitle}.`
    },
    {
      id: "hidden_case_axis_semantics",
      purpose: "Catch axis-order or transpose mistakes",
      input_summary: "Asymmetric toy tensor dimensions",
      expected_behavior: "Output preserves intended axis semantics and contract."
    },
    {
      id: "hidden_case_edge_baseline",
      purpose: "Validate deterministic edge behavior",
      input_summary: "Boundary toy tensor values",
      expected_behavior: "Edge-case behavior remains deterministic and valid."
    },
    {
      id: "hidden_case_repeated_rows",
      purpose: "Detect unintended coupling between rows",
      input_summary: "Repeated row patterns",
      expected_behavior: "Equivalent row inputs produce equivalent row outputs where expected."
    },
    {
      id: "hidden_case_precision_guard",
      purpose: "Check tolerance-sensitive correctness",
      input_summary: "Mixed positive/negative values near decision boundaries",
      expected_behavior: "Output remains within numeric tolerance of oracle behavior."
    }
  ]
}

function buildGeneratedAdversarialCases(title: string): VerificationCase[] {
  const normalizedTitle = title.trim().toLowerCase() || "the target operation"

  return [
    {
      id: "adversarial_shape_only_bypass",
      purpose: "Catch implementations that only satisfy shape guards",
      input_summary: "Input with valid shape but sensitivity to semantic correctness",
      expected_behavior: `Fails if implementation does not follow ${normalizedTitle} semantics.`
    },
    {
      id: "adversarial_ordering_bug",
      purpose: "Catch wrong-operation order bugs",
      input_summary: "Input requiring strict operation sequencing",
      expected_behavior: "Fails when intermediate operations are ordered incorrectly."
    }
  ]
}

function buildKnownFailurePatterns(constraintsAndEdgeCases: string): string[] {
  const parsed = parseDelimitedEntries(constraintsAndEdgeCases)
    .map((entry) => {
      return entry.toLowerCase()
    })
    .filter((entry) => entry.length > 0)

  const defaults = [
    "shape-only implementation without semantic correctness",
    "incorrect operation ordering",
    "numerically unstable handling of edge magnitudes"
  ]

  return Array.from(new Set([...parsed, ...defaults])).slice(0, 6)
}

function buildHintTiers(hintsText: string): {
  tier1: string
  tier2: string
  tier3: string
} {
  const parsedHints = parseDelimitedEntries(hintsText)
  const tier1 =
    parsedHints[0] ??
    "Start by confirming the exact input/output contract and where each tensor dimension should flow through the computation."
  const tier2 =
    parsedHints[1] ??
    "Break the implementation into explicit intermediate steps and validate each step against the stated semantics before combining them."
  const tier3 =
    parsedHints[2] ??
    "Implement the operation in deterministic stages, run against visible toy cases, and compare outputs against expected semantics and tolerance checks."

  return {
    tier1,
    tier2,
    tier3
  }
}

function buildResources(paperLink: string): Array<{ title: string; url: string }> {
  const resources: Array<{ title: string; url: string }> = []
  const trimmedPaperLink = paperLink.trim()

  if (trimmedPaperLink.startsWith("https://")) {
    resources.push({
      title: "Suggested paper/resource",
      url: trimmedPaperLink
    })
  }

  if (resources.length === 0) {
    resources.push({
      title: "Foundational reference (fallback)",
      url: "https://arxiv.org/abs/1706.03762"
    })
  }

  resources.push({
    title: "PyTorch official docs",
    url: "https://pytorch.org/docs/stable/"
  })

  return resources
}

function buildScorecard(draft: SuggestTopicDraft, visibleTestCases: VerificationCase[]): ProblemSpecV2["quality_scorecard"] {
  const objectiveLength = draft.learningObjective.trim().length
  const contextLength = draft.context.trim().length
  const constraintsLength = draft.constraintsAndEdgeCases.trim().length
  const visibleTestCount = visibleTestCases.length

  const pedagogyDepth = Math.max(0, Math.min(5, Math.floor(contextLength / 120)))
  const specClarity = Math.max(0, Math.min(5, Math.floor(objectiveLength / 40)))
  const graderRigor = Math.max(0, Math.min(5, Math.min(visibleTestCount, 5)))
  const edgeCaseCoverage = Math.max(0, Math.min(5, Math.floor(constraintsLength / 80)))
  const ambiguityRiskControl = Math.max(
    0,
    Math.min(5, draft.starterSignature.trim().startsWith("def ") ? 4 : 2)
  )

  return {
    pedagogy_depth: pedagogyDepth,
    spec_clarity: specClarity,
    grader_rigor: graderRigor,
    edge_case_coverage: edgeCaseCoverage,
    ambiguity_risk_control: ambiguityRiskControl
  }
}

function buildProvisionalProblemSpecV2(draft: SuggestTopicDraft): ProblemSpecV2 {
  const title = normalizeText(draft.title)
  const problemType = normalizeText(draft.problemType)
  const difficulty = normalizeText(draft.difficulty)
  const learningObjective = normalizeText(draft.learningObjective)
  const context = normalizeText(draft.context)
  const inputSpecification = normalizeText(draft.inputSpecification)
  const outputSpecification = normalizeText(draft.outputSpecification)
  const constraintsAndEdgeCases = normalizeText(draft.constraintsAndEdgeCases)
  const starterSignature = normalizeFunctionSignature(
    normalizeText(draft.starterSignature),
    title
  )
  const visibleTestCasePlan = normalizeText(draft.visibleTestCasePlan)
  const hintsText = normalizeText(draft.hints)
  const notesText = normalizeText(draft.notes)
  const paperLink = normalizeText(draft.paperLink)

  const category = mapProblemTypeToCategory(problemType)
  const problemIdBase = toSnakeCase(title) || "suggested_problem"
  const problemId = `${problemIdBase}_v1`
  const functionName = extractFunctionName(starterSignature)
  const tensorShapes = extractTensorShapeEntries(inputSpecification)
  const outputShape = extractOutputShape(outputSpecification)
  const visibleTestCases = parseVisibleTestCases(visibleTestCasePlan)
  const generatedHiddenCases = buildGeneratedHiddenCases(title)
  const generatedAdversarialCases = buildGeneratedAdversarialCases(title)
  const knownFailurePatterns = buildKnownFailurePatterns(constraintsAndEdgeCases)
  const hintTiers = buildHintTiers(hintsText)
  const resources = buildResources(paperLink)

  const starterCode = `${starterSignature}\n    \"\"\"Implement ${title || "the requested operation"} on deterministic toy tensors.\"\"\"\n    # TODO: implement\n    pass`

  const provisionalSpec: ProblemSpecV2 = {
    id: problemId,
    problem_version: 1,
    title,
    category,
    learning_objective: learningObjective,
    concept_description: context,
    learning_context: `${context} ${notesText}`.trim(),
    goal: `${outputSpecification} ${constraintsAndEdgeCases}`.trim(),
    starter_code: starterCode,
    function_signature: starterSignature,
    inputs: {
      tensor_shapes: tensorShapes,
      datatypes: ["float32"],
      constraints: [
        ...parseDelimitedEntries(constraintsAndEdgeCases),
        "toy tensors only"
      ]
    },
    output_contract: {
      shape: outputShape,
      semantics: [
        outputSpecification,
        "Output must align with the declared function semantics for deterministic toy inputs."
      ],
      numerical_properties: [
        "all values finite",
        "deterministic for fixed toy inputs"
      ]
    },
    pass_criteria: {
      determinism: "deterministic",
      checks: [
        {
          id: "shape_guard",
          mode: "shape_guard",
          scope: "both",
          oracle: "reference_solution",
          description: "Output matches declared shape contract for visible and hidden cases."
        },
        {
          id: "hidden_exact_oracle",
          mode: "exact_match",
          scope: "hidden",
          oracle: "reference_solution",
          description: "Hidden deterministic outputs match the oracle exactly within numeric tolerance."
        },
        {
          id: "numeric_tolerance_oracle",
          mode: "numeric_tolerance",
          scope: "both",
          oracle: "reference_solution",
          description: "Numeric outputs remain within strict absolute and relative tolerance bounds.",
          tolerance: {
            abs: 1e-6,
            rel: 1e-5
          }
        },
        {
          id: "property_semantic_guard",
          mode: "property_based",
          scope: "both",
          oracle: "property_checker",
          description: "Key semantic invariants remain true across deterministic and perturbed toy inputs."
        },
        {
          id: "metamorphic_robustness_guard",
          mode: "metamorphic",
          scope: "hidden",
          oracle: "metamorphic_relation",
          description: "Controlled input transformations preserve expected behavioral relations."
        }
      ],
      rationale:
        "This provisional check matrix combines oracle matching, tolerance validation, semantic invariants, and metamorphic robustness so cards cannot pass by satisfying shape alone. Hidden deterministic checks are included to prevent overfitting to visible cases, while property and metamorphic checks verify deeper correctness behavior under controlled perturbations."
    },
    evaluation_artifacts: {
      reference_solution_path: "src/problems/reference-python-solutions.ts",
      reference_solution_function: functionName,
      visible_tests: visibleTestCases,
      hidden_tests: generatedHiddenCases,
      adversarial_tests: generatedAdversarialCases,
      known_failure_patterns: knownFailurePatterns
    },
    hints: hintTiers,
    resources,
    prerequisites: [
      `Basic ${category} tensor-shape reasoning`,
      "Deterministic toy tensor debugging habits",
      "Reading and following precise input/output contracts"
    ],
    common_pitfalls: [
      "Implementing only shape-correct outputs without semantic correctness",
      "Ignoring numerical stability constraints for deterministic test inputs",
      "Misreading the function signature or tensor-shape contract"
    ],
    estimated_time_minutes: inferEstimatedTimeMinutes(difficulty),
    authoring: {
      source: "human",
      human_reviewer: "suggest_topic_intake",
      reviewed_at_iso: normalizeTimestampIso(new Date())
    },
    quality_scorecard: buildScorecard(draft, visibleTestCases),
    verification: {
      status: "needs_review",
      blockers: ["Awaiting full reviewer-authored hidden/adversarial confirmation."],
      notes:
        "Provisional ProblemSpecV2 generated from Suggest Topic intake; requires full review before publish."
    }
  }

  return provisionalSpec
}

export function validateSuggestTopicDraftAgainstProblemSpecV2(
  draft: SuggestTopicDraft
): SuggestTopicProblemSpecValidation {
  const provisionalSpec = buildProvisionalProblemSpecV2(draft)
  const validation = validateProblemSpecV2(provisionalSpec)

  return {
    ok: validation.ok,
    errors: validation.errors,
    warnings: validation.warnings,
    provisionalSpec
  }
}

export function summarizeSuggestTopicValidationResult(
  validation: ProblemSpecV2ValidationResult
): string {
  if (!validation.ok) {
    return `ProblemSpecV2 validation failed with ${validation.errors.length} error(s).`
  }

  if (validation.warnings.length > 0) {
    return `ProblemSpecV2 validation passed with ${validation.warnings.length} warning(s).`
  }

  return "ProblemSpecV2 validation passed."
}
