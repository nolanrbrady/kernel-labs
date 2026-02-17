import assert from "node:assert/strict"
import test from "node:test"

import {
  getSeedProblemPack,
  validateSeedProblemSpec
} from "../src/problems/seed-problem-pack.js"

test("seed problem pack includes required schema fields", () => {
  const seedProblems = getSeedProblemPack()

  assert.equal(seedProblems.length >= 4, true)

  seedProblems.forEach((problem) => {
    const validation = validateSeedProblemSpec(problem)

    assert.equal(validation.ok, true)
    assert.deepEqual(validation.errors, [])
    assert.equal(problem.learning_context.length >= 180, true)
    assert.equal(problem.pass_criteria.checks.length >= 4, true)
  })
})
