import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateSpacedRepetitionSchedule,
  rankSessionCandidates
} from "../src/scheduler/spaced-repetition-scheduler.js"

test("scheduler decision table differentiates pass/partial/fail outcomes", () => {
  const passDecision = calculateSpacedRepetitionSchedule({
    correctness: "pass",
    timeSpentMinutes: 15,
    hintTierUsed: 1,
    priorSuccessfulCompletions: 1,
    daysSinceLastExposure: 3
  })
  const partialDecision = calculateSpacedRepetitionSchedule({
    correctness: "partial",
    timeSpentMinutes: 15,
    hintTierUsed: 1,
    priorSuccessfulCompletions: 1,
    daysSinceLastExposure: 3
  })
  const failDecision = calculateSpacedRepetitionSchedule({
    correctness: "fail",
    timeSpentMinutes: 15,
    hintTierUsed: 1,
    priorSuccessfulCompletions: 1,
    daysSinceLastExposure: 3
  })

  assert.equal(passDecision.nextIntervalDays > partialDecision.nextIntervalDays, true)
  assert.equal(partialDecision.nextIntervalDays > failDecision.nextIntervalDays, true)
  assert.equal(passDecision.resurfacingPriority < partialDecision.resurfacingPriority, true)
  assert.equal(partialDecision.resurfacingPriority < failDecision.resurfacingPriority, true)
})

test("scheduler increases resurfacing pressure with time decay", () => {
  const recentDecision = calculateSpacedRepetitionSchedule({
    correctness: "pass",
    timeSpentMinutes: 12,
    hintTierUsed: 1,
    priorSuccessfulCompletions: 2,
    daysSinceLastExposure: 1
  })
  const staleDecision = calculateSpacedRepetitionSchedule({
    correctness: "pass",
    timeSpentMinutes: 12,
    hintTierUsed: 1,
    priorSuccessfulCompletions: 2,
    daysSinceLastExposure: 12
  })

  assert.equal(staleDecision.resurfacingPriority > recentDecision.resurfacingPriority, true)
})

test("new problems are prioritized over resurfaced candidates without debt accumulation", () => {
  const rankedSession = rankSessionCandidates({
    newProblemIds: ["new_problem_a", "new_problem_b"],
    resurfacedCandidates: [
      { problemId: "old_problem_a", resurfacingPriority: 0.95 },
      { problemId: "old_problem_b", resurfacingPriority: 0.72 }
    ]
  })

  assert.equal(rankedSession.primaryProblemId, "new_problem_a")
  assert.equal(rankedSession.prioritizedNewProblem, true)
  assert.equal(rankedSession.resurfacingDebtCount, 0)
})
