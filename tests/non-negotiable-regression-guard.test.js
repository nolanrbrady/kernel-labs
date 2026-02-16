import assert from "node:assert/strict"
import test from "node:test"

import {
  canSubmitSession,
  planDailySession
} from "../src/session/daily-loop-policy.js"

test("daily loop planner excludes streak, backlog, and missed-day penalties", () => {
  const plan = planDailySession({
    availableNewProblemIds: ["mlp_residual_v1"],
    availableResurfacedProblemIds: ["attention_masking_v1"],
    missedDays: 14
  })

  assert.equal(plan.primaryProblemId, "mlp_residual_v1")
  assert.deepEqual(plan.assignedProblemIds, ["mlp_residual_v1"])
  assert.equal(plan.sessionProblemCount, 1)
  assert.equal(plan.backlogCount, 0)
  assert.equal(plan.missedDayPenaltyApplied, false)
  assert.equal(Object.hasOwn(plan, "streak"), false)
  assert.equal(Object.hasOwn(plan, "streakCount"), false)
  assert.equal(Object.hasOwn(plan, "daysMissedPenalty"), false)
})

test("planner enforces one primary problem and caps resurfaced assignment to one", () => {
  const resurfacedOnlyPlan = planDailySession({
    availableNewProblemIds: [],
    availableResurfacedProblemIds: [
      "lstm_cell_v1",
      "gru_step_v1",
      "cross_attention_v1"
    ],
    missedDays: 30
  })

  assert.equal(resurfacedOnlyPlan.primaryProblemId, "lstm_cell_v1")
  assert.deepEqual(resurfacedOnlyPlan.assignedProblemIds, ["lstm_cell_v1"])
  assert.equal(resurfacedOnlyPlan.sessionProblemCount, 1)
  assert.equal(resurfacedOnlyPlan.resurfacedAssignedCount, 1)
})

test("submit remains allowed regardless of session status or correctness", () => {
  assert.equal(
    canSubmitSession({
      hasTimedOut: false,
      latestRunStatus: "pass"
    }),
    true
  )

  assert.equal(
    canSubmitSession({
      hasTimedOut: true,
      latestRunStatus: "fail"
    }),
    true
  )
})
