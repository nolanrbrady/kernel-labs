import { getRuntimeProblemFixture } from "./runtime-problem-fixtures.js"
import {
  getSeedProblemPackV1,
  validateSeedProblemDefinition,
  type SeedProblemDefinition
} from "./seed-problem-pack.js"
import { getReferencePythonSolution } from "./reference-python-solutions.js"

export type ProblemBankLintResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
}

function parseMatrixShape(shapeText: string): [number, number] | null {
  const matched = shapeText.match(/\[(\d+)\s*,\s*(\d+)\]/)
  if (!matched) {
    return null
  }

  return [Number.parseInt(matched[1], 10), Number.parseInt(matched[2], 10)]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function lintUrl(url: string): string | null {
  if (!url.startsWith("https://")) {
    return "Resource URL must start with https://"
  }

  try {
    // eslint-disable-next-line no-new
    new URL(url)
  } catch {
    return "Resource URL must be a valid URL"
  }

  return null
}

function lintSeedProblem(problem: SeedProblemDefinition): {
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  const baseValidation = validateSeedProblemDefinition(problem)
  baseValidation.errors.forEach((error) => {
    errors.push(`${problem.id}: ${error}`)
  })

  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*_v[0-9]+$/.test(problem.id)) {
    errors.push(
      `${problem.id}: id must be snake_case and end with _vN (example: layer_norm_forward_v1).`
    )
  }

  if (problem.title.trim().length < 12) {
    errors.push(`${problem.id}: title is too short; expand for clarity.`)
  }

  if (problem.concept_description.trim().length < 160) {
    errors.push(
      `${problem.id}: concept_description is too short; include motivation, semantics, and context.`
    )
  }

  if (problem.goal.trim().length < 120) {
    errors.push(
      `${problem.id}: goal is too short; explicitly state required function behavior and constraints.`
    )
  }

  if (!/def\s+[a-z_][a-z0-9_]*\s*\(/i.test(problem.starter_code)) {
    errors.push(
      `${problem.id}: starter_code must include a Python function definition (def ...).`
    )
  }

  if (!problem.starter_code.includes("TODO")) {
    warnings.push(
      `${problem.id}: starter_code should contain a TODO marker to clearly indicate the implementation area.`
    )
  }

  if (problem.inputs.tensor_shapes.length < 2) {
    errors.push(`${problem.id}: inputs.tensor_shapes must list at least 2 items.`)
  }

  const shapeEntries = problem.inputs.tensor_shapes.filter((entry) => entry.includes(":"))
  if (shapeEntries.length !== problem.inputs.tensor_shapes.length) {
    errors.push(
      `${problem.id}: each inputs.tensor_shapes entry must contain a ':' (example: x: [2, 3]).`
    )
  }

  if (!problem.inputs.constraints.some((constraint) => constraint.toLowerCase().includes("toy"))) {
    errors.push(`${problem.id}: inputs.constraints must explicitly mention toy tensors.`)
  }

  const bans = ["dataset", "training loop", "optimizer", "backlog", "streak"]
  bans.forEach((banned) => {
    if (problem.inputs.constraints.some((constraint) => constraint.toLowerCase().includes(banned))) {
      if (banned === "backlog" || banned === "streak") {
        errors.push(
          `${problem.id}: inputs.constraints mentions banned mechanics (${banned}); remove it from problem text.`
        )
      }
    }
  })

  const expectedShape = parseMatrixShape(problem.expected_output.shape)
  if (!expectedShape) {
    errors.push(
      `${problem.id}: expected_output.shape must be a 2D shape like [2, 4].`
    )
  }

  if (
    !problem.expected_output.numerical_properties.some((property) => {
      return property.toLowerCase().includes("finite")
    })
  ) {
    errors.push(
      `${problem.id}: expected_output.numerical_properties must mention finiteness (no NaN/Inf).`
    )
  }

  if (problem.evaluation_logic.checks.length < 3) {
    errors.push(`${problem.id}: evaluation_logic.checks must include at least 3 checks.`)
  }

  const normalizedChecks = problem.evaluation_logic.checks
    .map((check) => check.toLowerCase())
    .join(" | ")
  if (!normalizedChecks.includes("shape")) {
    errors.push(`${problem.id}: evaluation_logic.checks must include a shape check.`)
  }
  if (!normalizedChecks.includes("numerical")) {
    errors.push(`${problem.id}: evaluation_logic.checks must include a numerical sanity check.`)
  }

  if (problem.evaluation_logic.rationale.trim().length < 120) {
    errors.push(`${problem.id}: evaluation_logic.rationale is too short; expand the why.`)
  }

  if (problem.hints.tier1.trim().length < 50) {
    errors.push(`${problem.id}: hints.tier1 is too short; make it a conceptual nudge.`)
  }
  if (problem.hints.tier2.trim().length < 70) {
    errors.push(`${problem.id}: hints.tier2 is too short; add structural guidance.`)
  }
  if (problem.hints.tier3.trim().length < 70) {
    errors.push(`${problem.id}: hints.tier3 is too short; include near-code guidance.`)
  }

  if (
    problem.hints.tier2.trim().length <= problem.hints.tier1.trim().length ||
    problem.hints.tier3.trim().length <= problem.hints.tier2.trim().length
  ) {
    warnings.push(
      `${problem.id}: hint tiers should generally increase in specificity/length from tier1 -> tier3.`
    )
  }

  if (problem.resources.length === 0) {
    errors.push(`${problem.id}: resources must include at least one authoritative link.`)
  }

  const authoritativeHosts = ["arxiv.org", "pytorch.org"]
  const hasAuthoritativeLink = problem.resources.some((resource) => {
    try {
      const url = new URL(resource.url)
      return authoritativeHosts.includes(url.hostname)
    } catch {
      return false
    }
  })
  if (!hasAuthoritativeLink) {
    warnings.push(
      `${problem.id}: add at least one authoritative reference (prefer arxiv.org or pytorch.org).`
    )
  }

  problem.resources.forEach((resource, index) => {
    if (!isNonEmptyString(resource.title)) {
      errors.push(`${problem.id}: resources[${index}] is missing a title.`)
    }
    if (!isNonEmptyString(resource.url)) {
      errors.push(`${problem.id}: resources[${index}] is missing a url.`)
      return
    }
    const urlError = lintUrl(resource.url)
    if (urlError) {
      errors.push(`${problem.id}: resources[${index}] ${urlError}.`)
    }
  })

  if (problem.prerequisites.length < 3) {
    errors.push(`${problem.id}: prerequisites must list at least 3 items.`)
  }
  if (problem.common_pitfalls.length < 3) {
    errors.push(`${problem.id}: common_pitfalls must list at least 3 items.`)
  }

  if (problem.estimated_time_minutes < 10) {
    errors.push(`${problem.id}: estimated_time_minutes is too low; keep tasks substantial.`)
  }
  if (problem.estimated_time_minutes > 30) {
    errors.push(`${problem.id}: estimated_time_minutes must be <= 30.`)
  }

  return { errors, warnings }
}

export function lintProblemBank(): ProblemBankLintResult {
  const seedProblems = getSeedProblemPackV1()
  const errors: string[] = []
  const warnings: string[] = []

  const seenIds = new Set<string>()
  seedProblems.forEach((problem) => {
    if (seenIds.has(problem.id)) {
      errors.push(`${problem.id}: duplicate id in seed pack.`)
    }
    seenIds.add(problem.id)

    const result = lintSeedProblem(problem)
    errors.push(...result.errors)
    warnings.push(...result.warnings)

    const fixture = getRuntimeProblemFixture(problem.id)
    if (!fixture) {
      errors.push(
        `${problem.id}: missing runtime fixture. Add to src/problems/runtime-problem-fixtures.ts so run/evaluator can validate solutions.`
      )
      return
    }

    const expectedShape = parseMatrixShape(problem.expected_output.shape)
    const fixtureShape: [number, number] = [
      fixture.expectedOutput.length,
      fixture.expectedOutput[0]?.length ?? 0
    ]
    if (expectedShape && (expectedShape[0] !== fixtureShape[0] || expectedShape[1] !== fixtureShape[1])) {
      errors.push(
        `${problem.id}: expected_output.shape (${problem.expected_output.shape}) does not match runtime fixture output shape [${fixtureShape[0]}, ${fixtureShape[1]}].`
      )
    }

    if (fixture.testCases.length < 2) {
      warnings.push(`${problem.id}: runtime fixture should include at least 2 test cases.`)
    }

    const referenceSolution = getReferencePythonSolution(problem.id)
    if (!referenceSolution) {
      errors.push(
        `${problem.id}: missing reference Python solution. Add to src/problems/reference-python-solutions.ts so solution correctness can be regression-tested.`
      )
      return
    }

    if (!referenceSolution.includes(`def ${fixture.functionName}`)) {
      errors.push(
        `${problem.id}: reference Python solution must define def ${fixture.functionName}(...).`
      )
    }
  })

  return {
    ok: errors.length === 0,
    errors,
    warnings
  }
}
