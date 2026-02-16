import assert from "node:assert/strict"
import test from "node:test"

import { evaluateSeedProblemContract } from "../src/evaluator/seed-problem-evaluator-contract.js"
import { getSeedProblemPackV1 } from "../src/problems/seed-problem-pack.js"

function parseShape(shapeText: string): [number, number] {
  const matched = shapeText.match(/\[(\d+)\s*,\s*(\d+)\]/)

  if (!matched) {
    throw new Error(`Invalid shape format in test fixture: ${shapeText}`)
  }

  return [Number.parseInt(matched[1], 10), Number.parseInt(matched[2], 10)]
}

test("seed problems satisfy evaluator contract for shape and numerical sanity", () => {
  const seedProblems = getSeedProblemPackV1()

  seedProblems.forEach((problem) => {
    const [rows, columns] = parseShape(problem.expected_output.shape)
    const candidateOutput = Array.from({ length: rows }, () => {
      return Array.from({ length: columns }, () => 0.25)
    })

    const evaluationResult = evaluateSeedProblemContract({
      problemId: problem.id,
      candidateOutput
    })

    assert.equal(evaluationResult.correctness, "pass")
    assert.equal(evaluationResult.checks.shape.passed, true)
    assert.equal(evaluationResult.checks.numericalSanity.passed, true)
  })
})
