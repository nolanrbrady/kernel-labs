import assert from "node:assert/strict"
import test from "node:test"

import { evaluateSeedProblemContract } from "../src/evaluator/seed-problem-evaluator-contract.js"
import { getSeedProblemPack } from "../src/problems/seed-problem-pack.js"

function parseShape(shapeText: string): [number, number] {
  const matched = shapeText.match(/\[(\d+)\s*,\s*(\d+)\]/)

  if (!matched) {
    throw new Error(`Invalid shape format in test fixture: ${shapeText}`)
  }

  return [Number.parseInt(matched[1], 10), Number.parseInt(matched[2], 10)]
}

test("expanded curriculum includes conditioning/adaptation/positional variants", () => {
  const seedProblems = getSeedProblemPack()
  const expandedCategories = [
    "Conditioning & Modulation",
    "Adaptation & Efficiency",
    "Positional Encoding"
  ]

  const expandedProblems = seedProblems.filter((problem) => {
    return expandedCategories.includes(problem.category)
  })

  const byCategoryCounts = expandedCategories.map((category) => {
    return expandedProblems.filter((problem) => problem.category === category).length
  })

  assert.equal(expandedProblems.length >= 6, true)
  byCategoryCounts.forEach((count) => {
    assert.equal(count >= 2, true)
  })
  assert.equal(
    expandedProblems.some((problem) => problem.problem_version > 1),
    true
  )
})

test("expanded curriculum has evaluator contract coverage across variants", () => {
  const seedProblems = getSeedProblemPack().filter((problem) => {
    return [
      "Conditioning & Modulation",
      "Adaptation & Efficiency",
      "Positional Encoding"
    ].includes(problem.category)
  })

  seedProblems.forEach((problem) => {
    const [rows, columns] = parseShape(problem.output_contract.shape)
    const candidateOutput = Array.from({ length: rows }, () => {
      return Array.from({ length: columns }, () => 0.125)
    })

    const evaluation = evaluateSeedProblemContract({
      problemId: problem.id,
      candidateOutput
    })

    assert.equal(evaluation.correctness, "pass")
    assert.equal(evaluation.checks.shape.passed, true)
    assert.equal(evaluation.checks.numericalSanity.passed, true)
  })
})
