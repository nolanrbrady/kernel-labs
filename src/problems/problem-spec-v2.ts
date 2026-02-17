const BANNED_MECHANIC_PATTERNS = [
  /streak/i,
  /backlog/i,
  /missed\s*day/i,
  /penalt/i,
  /debt/i
]

const ISO_8601_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

export type VerificationMode =
  | "shape_guard"
  | "exact_match"
  | "numeric_tolerance"
  | "property_based"
  | "metamorphic"
export type VerificationScope = "visible" | "hidden" | "both"

export type VerificationOracle =
  | "reference_solution"
  | "property_checker"
  | "metamorphic_relation"

export type VerificationStatus = "draft" | "needs_review" | "verified" | "rejected"

export type ProblemSpecV2 = {
  id: string
  problem_version: number
  title: string
  category:
    | "MLP"
    | "Normalization"
    | "RNNs"
    | "Attention"
    | "Conditioning & Modulation"
    | "Adaptation & Efficiency"
    | "Positional Encoding"
    | "Reinforcement Learning"
  learning_objective: string
  concept_description: string
  learning_context: string
  goal: string
  starter_code: string
  function_signature: string
  inputs: {
    tensor_shapes: string[]
    datatypes: string[]
    constraints: string[]
  }
  output_contract: {
    shape: string
    semantics: string[]
    numerical_properties: string[]
  }
  pass_criteria: {
    determinism: "deterministic" | "stochastic_but_bounded"
    checks: Array<{
      id: string
      mode: VerificationMode
      scope: VerificationScope
      oracle: VerificationOracle
      description: string
      tolerance?: {
        abs?: number
        rel?: number
      }
    }>
    rationale: string
  }
  evaluation_artifacts: {
    reference_solution_path: string
    reference_solution_function: string
    visible_tests: VerificationCase[]
    hidden_tests: VerificationCase[]
    adversarial_tests: VerificationCase[]
    known_failure_patterns: string[]
  }
  hints: {
    tier1: string
    tier2: string
    tier3: string
  }
  resources: Array<{
    title: string
    url: string
  }>
  prerequisites: string[]
  common_pitfalls: string[]
  estimated_time_minutes: number
  authoring: {
    source: "human" | "ai_assisted" | "ai_generated"
    model_name?: string
    generation_prompt_id?: string
    generation_temperature?: number
    human_reviewer: string
    reviewed_at_iso: string
  }
  quality_scorecard: {
    pedagogy_depth: number
    spec_clarity: number
    grader_rigor: number
    edge_case_coverage: number
    ambiguity_risk_control: number
  }
  verification: {
    status: VerificationStatus
    blockers: string[]
    notes: string
  }
}

export type VerificationCase = {
  id: string
  purpose: string
  input_summary: string
  expected_behavior: string
}

export type ProblemSpecV2ValidationResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function hasBannedMechanicText(text: string): boolean {
  return BANNED_MECHANIC_PATTERNS.some((pattern) => pattern.test(text))
}

function lintUrl(url: string): string | null {
  if (!url.startsWith("https://")) {
    return "URL must start with https://"
  }

  try {
    // eslint-disable-next-line no-new
    new URL(url)
  } catch {
    return "URL must be valid"
  }

  return null
}

function scoreIsValid(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 5
}

function averageScorecard(scorecard: ProblemSpecV2["quality_scorecard"]): number {
  const total =
    scorecard.pedagogy_depth +
    scorecard.spec_clarity +
    scorecard.grader_rigor +
    scorecard.edge_case_coverage +
    scorecard.ambiguity_risk_control

  return total / 5
}

function lintVerificationCases(
  problemId: string,
  label: string,
  cases: VerificationCase[],
  errors: string[]
): void {
  cases.forEach((entry, index) => {
    if (!isNonEmptyString(entry.id)) {
      errors.push(`${problemId}: ${label}[${index}] is missing id.`)
    }
    if (!isNonEmptyString(entry.purpose)) {
      errors.push(`${problemId}: ${label}[${index}] is missing purpose.`)
    }
    if (!isNonEmptyString(entry.input_summary)) {
      errors.push(`${problemId}: ${label}[${index}] is missing input_summary.`)
    }
    if (!isNonEmptyString(entry.expected_behavior)) {
      errors.push(`${problemId}: ${label}[${index}] is missing expected_behavior.`)
    }
  })
}

export function validateProblemSpecV2(spec: ProblemSpecV2): ProblemSpecV2ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const problemId = spec.id

  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*_v[0-9]+$/.test(problemId)) {
    errors.push(
      `${problemId}: id must be snake_case and end with _vN (example: layer_norm_forward_v1).`
    )
  }

  if (spec.problem_version < 1) {
    errors.push(`${problemId}: problem_version must be >= 1.`)
  }

  if (spec.title.trim().length < 16) {
    errors.push(`${problemId}: title is too short; increase specificity.`)
  }

  if (spec.learning_objective.trim().length < 80) {
    errors.push(`${problemId}: learning_objective is too short; state the exact competency.`)
  }

  if (spec.concept_description.trim().length < 220) {
    errors.push(
      `${problemId}: concept_description is too short; include mechanism, motivation, and failure modes.`
    )
  }

  if (spec.learning_context.trim().length < 180) {
    errors.push(
      `${problemId}: learning_context is too short; explain where this appears in real models.`
    )
  }

  if (spec.goal.trim().length < 140) {
    errors.push(`${problemId}: goal is too short; define behavior and constraints precisely.`)
  }

  if (!spec.starter_code.includes("TODO")) {
    warnings.push(`${problemId}: starter_code should include TODO to mark the implementation area.`)
  }

  if (!/def\s+[a-z_][a-z0-9_]*\s*\(/i.test(spec.starter_code)) {
    errors.push(`${problemId}: starter_code must include a Python function definition.`)
  }

  if (!/^def\s+[a-z_][a-z0-9_]*\s*\(.+\):$/i.test(spec.function_signature.trim())) {
    errors.push(
      `${problemId}: function_signature must be a full Python signature (example: def fn(x, y):).`
    )
  }

  if (spec.inputs.tensor_shapes.length < 2) {
    errors.push(`${problemId}: inputs.tensor_shapes must include at least 2 entries.`)
  }

  if (!spec.inputs.constraints.some((entry) => entry.toLowerCase().includes("toy"))) {
    errors.push(`${problemId}: inputs.constraints must explicitly require toy tensors.`)
  }

  const textFields = [
    spec.learning_objective,
    spec.concept_description,
    spec.learning_context,
    spec.goal,
    ...spec.inputs.constraints,
    ...spec.output_contract.semantics,
    ...spec.common_pitfalls
  ]

  if (textFields.some((field) => hasBannedMechanicText(field))) {
    errors.push(`${problemId}: problem text includes banned guilt mechanics (streak/backlog/penalty/debt).`)
  }

  if (!/^\[\d+\s*,\s*\d+\]$/.test(spec.output_contract.shape.trim())) {
    errors.push(`${problemId}: output_contract.shape must be a concrete 2D shape like [2, 4].`)
  }

  if (!spec.output_contract.numerical_properties.some((entry) => entry.toLowerCase().includes("finite"))) {
    errors.push(`${problemId}: output_contract.numerical_properties must include finite-value constraints.`)
  }

  if (spec.pass_criteria.checks.length < 4) {
    errors.push(`${problemId}: pass_criteria.checks must include at least 4 checks.`)
  }

  const nonShapeChecks = spec.pass_criteria.checks.filter((check) => check.mode !== "shape_guard")
  if (nonShapeChecks.length < 3) {
    errors.push(`${problemId}: pass_criteria cannot be shape-heavy; require at least 3 non-shape checks.`)
  }

  const hasExactOrTolerance = spec.pass_criteria.checks.some((check) => {
    return check.mode === "exact_match" || check.mode === "numeric_tolerance"
  })
  if (!hasExactOrTolerance) {
    errors.push(`${problemId}: pass_criteria requires at least one exact or tolerance check.`)
  }

  const hasPropertyOrMetamorphic = spec.pass_criteria.checks.some((check) => {
    return check.mode === "property_based" || check.mode === "metamorphic"
  })
  if (!hasPropertyOrMetamorphic) {
    errors.push(`${problemId}: pass_criteria requires at least one property/metamorphic check.`)
  }

  if (spec.pass_criteria.determinism === "deterministic") {
    const hasDeterministicExact = spec.pass_criteria.checks.some((check) => {
      return check.mode === "exact_match" && check.scope !== "visible"
    })
    if (!hasDeterministicExact) {
      errors.push(
        `${problemId}: deterministic problems must include hidden exact-match verification against the oracle.`
      )
    }
  }

  spec.pass_criteria.checks.forEach((check, index) => {
    if (!isNonEmptyString(check.id)) {
      errors.push(`${problemId}: pass_criteria.checks[${index}] is missing id.`)
    }
    if (!isNonEmptyString(check.description)) {
      errors.push(`${problemId}: pass_criteria.checks[${index}] is missing description.`)
    }
    if (check.mode === "numeric_tolerance") {
      const abs = check.tolerance?.abs
      const rel = check.tolerance?.rel
      if (typeof abs !== "number" && typeof rel !== "number") {
        errors.push(
          `${problemId}: numeric_tolerance check ${check.id} must define tolerance.abs and/or tolerance.rel.`
        )
      }
    }
  })

  if (spec.pass_criteria.rationale.trim().length < 160) {
    errors.push(`${problemId}: pass_criteria.rationale is too short; explain why these checks are sufficient.`)
  }

  if (!isNonEmptyString(spec.evaluation_artifacts.reference_solution_path)) {
    errors.push(`${problemId}: evaluation_artifacts.reference_solution_path is required.`)
  }

  if (!isNonEmptyString(spec.evaluation_artifacts.reference_solution_function)) {
    errors.push(`${problemId}: evaluation_artifacts.reference_solution_function is required.`)
  }

  if (spec.evaluation_artifacts.visible_tests.length < 2) {
    errors.push(`${problemId}: include at least 2 visible tests.`)
  }

  if (spec.evaluation_artifacts.hidden_tests.length < 5) {
    errors.push(`${problemId}: include at least 5 hidden tests.`)
  }

  if (spec.evaluation_artifacts.adversarial_tests.length < 2) {
    errors.push(`${problemId}: include at least 2 adversarial tests.`)
  }

  lintVerificationCases(problemId, "visible_tests", spec.evaluation_artifacts.visible_tests, errors)
  lintVerificationCases(problemId, "hidden_tests", spec.evaluation_artifacts.hidden_tests, errors)
  lintVerificationCases(problemId, "adversarial_tests", spec.evaluation_artifacts.adversarial_tests, errors)

  if (spec.evaluation_artifacts.known_failure_patterns.length < 3) {
    errors.push(`${problemId}: list at least 3 known failure patterns to catch weak solutions.`)
  }

  if (spec.hints.tier1.trim().length < 60) {
    errors.push(`${problemId}: hints.tier1 is too short.`)
  }
  if (spec.hints.tier2.trim().length < 80) {
    errors.push(`${problemId}: hints.tier2 is too short.`)
  }
  if (spec.hints.tier3.trim().length < 110) {
    errors.push(`${problemId}: hints.tier3 is too short.`)
  }

  if (spec.resources.length < 2) {
    errors.push(`${problemId}: resources must include at least 2 links.`)
  }

  spec.resources.forEach((resource, index) => {
    if (!isNonEmptyString(resource.title)) {
      errors.push(`${problemId}: resources[${index}] is missing title.`)
    }
    if (!isNonEmptyString(resource.url)) {
      errors.push(`${problemId}: resources[${index}] is missing URL.`)
      return
    }
    const urlError = lintUrl(resource.url)
    if (urlError) {
      errors.push(`${problemId}: resources[${index}] ${urlError}.`)
    }
  })

  if (spec.prerequisites.length < 3) {
    errors.push(`${problemId}: prerequisites must include at least 3 items.`)
  }

  if (spec.common_pitfalls.length < 3) {
    errors.push(`${problemId}: common_pitfalls must include at least 3 items.`)
  }

  if (spec.estimated_time_minutes < 10 || spec.estimated_time_minutes > 30) {
    errors.push(`${problemId}: estimated_time_minutes must be between 10 and 30.`)
  }

  if (!isNonEmptyString(spec.authoring.human_reviewer)) {
    errors.push(`${problemId}: authoring.human_reviewer is required.`)
  }

  if (!ISO_8601_UTC_PATTERN.test(spec.authoring.reviewed_at_iso)) {
    errors.push(`${problemId}: authoring.reviewed_at_iso must be UTC ISO format YYYY-MM-DDTHH:MM:SSZ.`)
  }

  if (spec.authoring.source !== "human") {
    if (!isNonEmptyString(spec.authoring.model_name)) {
      errors.push(`${problemId}: AI-authored cards must include authoring.model_name.`)
    }
    if (!isNonEmptyString(spec.authoring.generation_prompt_id)) {
      errors.push(`${problemId}: AI-authored cards must include authoring.generation_prompt_id.`)
    }
    const temperature = spec.authoring.generation_temperature
    if (typeof temperature !== "number" || temperature < 0 || temperature > 1) {
      errors.push(`${problemId}: AI-authored cards must include generation_temperature in [0, 1].`)
    }
  }

  const scorecard = spec.quality_scorecard
  const scoreValues = [
    scorecard.pedagogy_depth,
    scorecard.spec_clarity,
    scorecard.grader_rigor,
    scorecard.edge_case_coverage,
    scorecard.ambiguity_risk_control
  ]

  if (!scoreValues.every((value) => scoreIsValid(value))) {
    errors.push(`${problemId}: each quality_scorecard dimension must be an integer between 0 and 5.`)
  }

  const scoreAverage = averageScorecard(scorecard)
  if (spec.verification.status === "verified") {
    if (scoreAverage < 4.2) {
      errors.push(`${problemId}: verified cards must have scorecard average >= 4.2.`)
    }
    if (scorecard.grader_rigor < 4 || scorecard.spec_clarity < 4) {
      errors.push(`${problemId}: verified cards require grader_rigor >= 4 and spec_clarity >= 4.`)
    }
    if (spec.verification.blockers.length > 0) {
      errors.push(`${problemId}: verified cards cannot contain blockers.`)
    }
  } else if (scoreAverage >= 4.2) {
    warnings.push(
      `${problemId}: scorecard is verification-ready; consider advancing status to verified after final review.`
    )
  }

  if (!isNonEmptyString(spec.verification.notes)) {
    warnings.push(`${problemId}: add verification.notes to document review rationale.`)
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  }
}
