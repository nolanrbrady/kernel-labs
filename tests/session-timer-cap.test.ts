import assert from "node:assert/strict"
import test from "node:test"

import { evaluateSessionTimeCap } from "../src/session/session-timer.js"

test("session timer enforces cap at exactly 30 minutes", () => {
  const evaluation = evaluateSessionTimeCap({
    startedAt: "2026-02-16T18:00:00Z",
    now: "2026-02-16T18:30:00Z"
  })

  assert.equal(evaluation.hasTimedOut, true)
  assert.equal(evaluation.status, "timed_out")
  assert.equal(evaluation.remainingSeconds, 0)
})

test("session timer keeps session active before 30-minute boundary", () => {
  const evaluation = evaluateSessionTimeCap({
    startedAt: "2026-02-16T18:00:00Z",
    now: "2026-02-16T18:12:00Z"
  })

  assert.equal(evaluation.hasTimedOut, false)
  assert.equal(evaluation.status, "active")
  assert.equal(evaluation.remainingSeconds, 1080)
})

test("cap message remains supportive and non-punitive", () => {
  const evaluation = evaluateSessionTimeCap({
    startedAt: "2026-02-16T18:00:00Z",
    now: "2026-02-16T18:45:00Z"
  })

  assert.equal(evaluation.message.includes("complete"), true)
  assert.equal(evaluation.message.includes("penalty"), false)
  assert.equal(evaluation.message.includes("missed"), false)
})
