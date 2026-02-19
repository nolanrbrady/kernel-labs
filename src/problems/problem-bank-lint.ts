import { getRuntimeProblemFixture } from "./runtime-problem-fixtures.js"
import {
  getSeedProblemPack,
  validateSeedProblemSpec
} from "./seed-problem-pack.js"
import { getReferencePythonSolution } from "./reference-python-solutions.js"
import { verifyProblemCard } from "./card-verification-pipeline.js"

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

export function lintProblemBank(): ProblemBankLintResult {
  const seedProblems = getSeedProblemPack()
  const errors: string[] = []
  const warnings: string[] = []

  const seenIds = new Set<string>()
  seedProblems.forEach((problem) => {
    if (seenIds.has(problem.id)) {
      errors.push(`${problem.id}: duplicate id in seed pack.`)
    }
    seenIds.add(problem.id)

    const validation = validateSeedProblemSpec(problem)
    errors.push(...validation.errors)
    warnings.push(...validation.warnings)

    const fixture = getRuntimeProblemFixture(problem.id)
    if (!fixture) {
      errors.push(
        `${problem.id}: missing runtime fixture. Add to src/problems/runtime-problem-fixtures.ts so run/evaluator can validate solutions.`
      )
      return
    }

    const expectedShape = parseMatrixShape(problem.output_contract.shape)
    const fixtureShape: [number, number] = [
      fixture.expectedOutput.length,
      fixture.expectedOutput[0]?.length ?? 0
    ]

    if (
      expectedShape &&
      (expectedShape[0] !== fixtureShape[0] || expectedShape[1] !== fixtureShape[1])
    ) {
      errors.push(
        `${problem.id}: output_contract.shape (${problem.output_contract.shape}) does not match runtime fixture output shape [${fixtureShape[0]}, ${fixtureShape[1]}].`
      )
    }

    if (
      fixture.functionName !==
      problem.evaluation_artifacts.reference_solution_function
    ) {
      errors.push(
        `${problem.id}: evaluation_artifacts.reference_solution_function (${problem.evaluation_artifacts.reference_solution_function}) must match fixture functionName (${fixture.functionName}).`
      )
    }

    if (fixture.testCases.length < 2) {
      warnings.push(
        `${problem.id}: runtime fixture should include at least 2 test cases.`
      )
    }

    const referenceSolution = getReferencePythonSolution(problem.id)
    if (!referenceSolution) {
      errors.push(
        `${problem.id}: missing reference Python solution. Add to src/problems/reference-python-solutions.ts so solution correctness can be regression-tested.`
      )
      return
    }

    if (
      !referenceSolution.includes(
        `def ${problem.evaluation_artifacts.reference_solution_function}`
      )
    ) {
      errors.push(
        `${problem.id}: reference Python solution must define def ${problem.evaluation_artifacts.reference_solution_function}(...).`
      )
    }

    const verification = verifyProblemCard(problem)
    if (verification.status !== "verified") {
      errors.push(
        `${problem.id}: card verification pipeline status is ${verification.status}. blockers=${verification.blockers.join(
          " | "
        )}`
      )
    }
    warnings.push(...verification.warnings.map((warning) => `${problem.id}: ${warning}`))
  })

  return {
    ok: errors.length === 0,
    errors,
    warnings
  }
}
