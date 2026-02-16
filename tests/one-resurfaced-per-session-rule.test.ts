import assert from "node:assert/strict"
import test from "node:test"

import { planSessionAssignment } from "../src/scheduler/spaced-repetition-scheduler.js"

test("planner assigns at most one resurfaced problem when no new problems exist", () => {
  const sessionPlan = planSessionAssignment({
    newProblemIds: [],
    resurfacedCandidates: [
      { problemId: "old_problem_a", resurfacingPriority: 0.93 },
      { problemId: "old_problem_b", resurfacingPriority: 0.76 },
      { problemId: "old_problem_c", resurfacingPriority: 0.45 }
    ]
  })

  assert.equal(sessionPlan.assignedProblemIds.length, 1)
  assert.equal(sessionPlan.resurfacedAssignedCount, 1)
  assert.deepEqual(sessionPlan.assignedProblemIds, ["old_problem_a"])
})

test("planner keeps resurfaced assignment at zero when new problem is available", () => {
  const sessionPlan = planSessionAssignment({
    newProblemIds: ["new_problem_a"],
    resurfacedCandidates: [
      { problemId: "old_problem_a", resurfacingPriority: 0.99 },
      { problemId: "old_problem_b", resurfacingPriority: 0.91 }
    ]
  })

  assert.deepEqual(sessionPlan.assignedProblemIds, ["new_problem_a"])
  assert.equal(sessionPlan.resurfacedAssignedCount, 0)
})
