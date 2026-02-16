import assert from "node:assert/strict"
import test from "node:test"

import {
  createEvaluatorToyFixture,
  getDeterministicFixtureSeeds
} from "../src/testing/deterministic-fixtures.js"

test("evaluator toy tensor fixture has deterministic shapes and outputs", () => {
  const seeds = getDeterministicFixtureSeeds()
  const fixture = createEvaluatorToyFixture({ seed: seeds.evaluator })

  assert.equal(fixture.seed, seeds.evaluator)
  assert.deepEqual(fixture.metadata.inputShape, [2, 3])
  assert.deepEqual(fixture.metadata.weightShape, [3, 2])
  assert.deepEqual(fixture.metadata.outputShape, [2, 2])
  assert.equal(fixture.input.length, 2)
  assert.equal(fixture.weights.length, 3)
  assert.equal(fixture.bias.length, 2)
  assert.equal(fixture.expectedOutput.length, 2)

  fixture.expectedOutput.flat().forEach((value) => {
    assert.equal(Number.isFinite(value), true)
  })
})
