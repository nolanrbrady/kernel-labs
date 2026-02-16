import assert from "node:assert/strict"
import test from "node:test"

import {
  createSchedulerToyFixture,
  getDeterministicFixtureSeeds
} from "../src/testing/deterministic-fixtures.js"

test("scheduler fixture is deterministic and only uses toy attempt metadata", () => {
  const seeds = getDeterministicFixtureSeeds()
  const fixture = createSchedulerToyFixture({ seed: seeds.scheduler })

  assert.equal(fixture.seed, seeds.scheduler)
  assert.equal(fixture.attemptHistory.length, 3)

  fixture.attemptHistory.forEach((attempt) => {
    assert.equal(typeof attempt.problemId, "string")
    assert.equal(["pass", "partial", "fail"].includes(attempt.correctness), true)
    assert.equal(Number.isInteger(attempt.timeSpentMinutes), true)
    assert.equal(Number.isInteger(attempt.hintTierUsed), true)
    assert.equal(Number.isInteger(attempt.priorSuccessfulCompletions), true)
    assert.equal(Number.isInteger(attempt.daysSinceLastExposure), true)
  })

  assert.equal(typeof fixture.expectedScheduling.nextIntervalDays, "number")
  assert.equal(typeof fixture.expectedScheduling.resurfacingPriority, "number")
})
