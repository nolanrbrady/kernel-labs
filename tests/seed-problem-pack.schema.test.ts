import assert from "node:assert/strict"
import test from "node:test"

import {
  getSeedProblemPackV1,
  validateSeedProblemDefinition
} from "../src/problems/seed-problem-pack.js"

test("seed problem pack includes required schema fields", () => {
  const seedProblems = getSeedProblemPackV1()

  assert.equal(seedProblems.length >= 4, true)

  seedProblems.forEach((problem) => {
    const validation = validateSeedProblemDefinition(problem)

    assert.equal(validation.isValid, true)
    assert.deepEqual(validation.errors, [])
    assert.equal(problem.learning_context.includes("Where this shows up"), true)
  })
})
