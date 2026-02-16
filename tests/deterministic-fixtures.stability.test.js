import assert from "node:assert/strict"
import test from "node:test"

import {
  createEvaluatorToyFixture,
  createSchedulerToyFixture,
  getDeterministicFixtureSeeds
} from "../src/testing/deterministic-fixtures.js"

test("deterministic fixtures are stable for evaluator and scheduler seeds", () => {
  const seeds = getDeterministicFixtureSeeds()

  const firstEvaluatorFixture = createEvaluatorToyFixture({
    seed: seeds.evaluator
  })
  const secondEvaluatorFixture = createEvaluatorToyFixture({
    seed: seeds.evaluator
  })

  const firstSchedulerFixture = createSchedulerToyFixture({
    seed: seeds.scheduler
  })
  const secondSchedulerFixture = createSchedulerToyFixture({
    seed: seeds.scheduler
  })

  assert.deepEqual(firstEvaluatorFixture, secondEvaluatorFixture)
  assert.deepEqual(firstSchedulerFixture, secondSchedulerFixture)
})
