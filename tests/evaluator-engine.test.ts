import assert from "node:assert/strict"
import test from "node:test"

import { evaluateOutputAgainstFixture } from "../src/evaluator/evaluator-engine.js"
import { getRuntimeProblemFixture } from "../src/problems/runtime-problem-fixtures.js"

test("evaluator fails when output shape does not match expected shape", () => {
  const result = evaluateOutputAgainstFixture({
    problemId: "attention_scaled_dot_product_v1",
    candidateOutput: [[0.1], [0.2]]
  })

  assert.equal(result.correctness, "fail")
  assert.equal(result.checks.shape.passed, false)
  assert.equal(result.checks.invariance.passed, false)
})

test("evaluator marks invariance-preserving offset output as partial", () => {
  const fixture = getRuntimeProblemFixture("attention_scaled_dot_product_v1")
  assert.notEqual(fixture, null)
  const shiftedOutput = fixture!.expectedOutput.map((row) => {
    return row.map((value) => value + 0.5)
  })

  const result = evaluateOutputAgainstFixture({
    problemId: "attention_scaled_dot_product_v1",
    candidateOutput: shiftedOutput
  })

  assert.equal(result.correctness, "partial")
  assert.equal(result.checks.shape.passed, true)
  assert.equal(result.checks.invariance.passed, true)
  assert.equal(result.checks.numericalSanity.passed, true)
})

test("evaluator fails numerical sanity checks for non-finite outputs", () => {
  const fixture = getRuntimeProblemFixture("attention_scaled_dot_product_v1")
  assert.notEqual(fixture, null)
  const invalidOutput = fixture!.expectedOutput.map((row) => {
    return [...row]
  })

  invalidOutput[0][0] = Number.POSITIVE_INFINITY

  const result = evaluateOutputAgainstFixture({
    problemId: "attention_scaled_dot_product_v1",
    candidateOutput: invalidOutput
  })

  assert.equal(result.correctness, "fail")
  assert.equal(result.checks.numericalSanity.passed, false)
})

test("evaluator returns pass with structured explanation for expected output", () => {
  const fixture = getRuntimeProblemFixture("attention_scaled_dot_product_v1")
  assert.notEqual(fixture, null)

  const result = evaluateOutputAgainstFixture({
    problemId: "attention_scaled_dot_product_v1",
    candidateOutput: fixture!.expectedOutput
  })

  assert.equal(result.correctness, "pass")
  assert.equal(typeof result.explanation, "string")
  assert.equal(result.explanation.length > 0, true)
})
