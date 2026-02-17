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

test("scheduler groups interchangeable resurfaced candidates within threshold boundaries", () => {
  const rankedSession = rankSessionCandidates({
    newProblemIds: [],
    resurfacedCandidates: [
      { problemId: "outside_threshold", resurfacingPriority: 0.84 },
      { problemId: "boundary_match", resurfacingPriority: 0.85 },
      { problemId: "top_card", resurfacingPriority: 0.9 }
    ],
    interchangeableThreshold: 0.05
  })

  assert.equal(rankedSession.primaryProblemId, "top_card")
  assert.equal(rankedSession.interchangeableThreshold, 0.05)
  assert.deepEqual(rankedSession.interchangeableResurfacedProblemIds, [
    "top_card",
    "boundary_match"
  ])
})

test("scheduler rank ordering is deterministic on priority ties", () => {
  const rankedSession = rankSessionCandidates({
    newProblemIds: [],
    resurfacedCandidates: [
      { problemId: "z_problem", resurfacingPriority: 0.9 },
      { problemId: "a_problem", resurfacingPriority: 0.9 },
      { problemId: "m_problem", resurfacingPriority: 0.88 }
    ],
    interchangeableThreshold: 0.01
  })

  assert.equal(rankedSession.primaryProblemId, "a_problem")
  assert.deepEqual(rankedSession.rankedResurfacedProblemIds, [
    "a_problem",
    "z_problem",
    "m_problem"
  ])
  assert.deepEqual(rankedSession.interchangeableResurfacedProblemIds, [
    "a_problem",
    "z_problem"
  ])
})
