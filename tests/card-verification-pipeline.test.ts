import assert from "node:assert/strict"
import test from "node:test"

import { verifyProblemCard } from "../src/problems/card-verification-pipeline.js"
import { getSeedProblemPack } from "../src/problems/seed-problem-pack.js"

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

test("verification pipeline marks a seeded card as verified", () => {
  const problem = getSeedProblemPack()[0]
  const result = verifyProblemCard(problem)

  assert.equal(result.status, "verified", result.blockers.join("\n"))
  assert.equal(result.approvalType, "auto_provisional")
  assert.equal(result.blockers.length, 0)
})

test("verification pipeline rejects schema-invalid card definitions", () => {
  const problem = clone(getSeedProblemPack()[0])
  problem.evaluation_artifacts.hidden_tests = []

  const result = verifyProblemCard(problem)

  assert.equal(result.status, "rejected")
  assert.equal(
    result.diagnostics.some((entry) => entry.code === "SCHEMA_INVALID"),
    true
  )
})

test("verification pipeline rejects fixture/reference function mismatches", () => {
  const problem = clone(getSeedProblemPack()[0])
  problem.evaluation_artifacts.reference_solution_function = "not_the_fixture_function"

  const result = verifyProblemCard(problem)

  assert.equal(result.status, "rejected")
  assert.equal(
    result.diagnostics.some((entry) => entry.code === "FUNCTION_NAME_MISMATCH"),
    true
  )
})

test("verification pipeline routes hint leakage to needs_review", () => {
  const problem = clone(getSeedProblemPack()[0])
  problem.hints.tier1 =
    "Begin with shapes, but avoid this leak in practice: def solve(x): y = x @ w; return y. This intentionally contains executable code content."

  const result = verifyProblemCard(problem)

  assert.equal(result.status, "needs_review")
  assert.equal(
    result.diagnostics.some((entry) => entry.code === "TIER1_CODE_LEAK"),
    true
  )
})
