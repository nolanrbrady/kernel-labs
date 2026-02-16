import assert from "node:assert/strict"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import {
  createFileAnonymousProgressStore,
  createInitialAnonymousProgressSnapshot
} from "../src/progress/anonymous-progress-store.js"

test("anonymous progress store persists and reloads progress across restarts", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "deepmlsr-anon-progress-"))
  const filePath = join(tempDirectory, "anonymous-progress.json")

  const firstStore = createFileAnonymousProgressStore({ filePath })
  const progressSnapshot = createInitialAnonymousProgressSnapshot({
    updatedAt: "2026-02-16T18:13:00Z"
  })

  progressSnapshot.completedProblemIds.push("attention_scaled_dot_product_v1")
  progressSnapshot.attemptHistory.push({
    problemId: "attention_scaled_dot_product_v1",
    correctness: "pass",
    hintTierUsed: 1,
    timeSpentMinutes: 18,
    submittedAt: "2026-02-16T18:13:00Z"
  })

  await firstStore.saveProgress(progressSnapshot)

  const secondStore = createFileAnonymousProgressStore({ filePath })
  const reloadedSnapshot = await secondStore.loadProgress()

  assert.deepEqual(reloadedSnapshot, progressSnapshot)
})

test("anonymous progress store returns initial snapshot when no file exists", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "deepmlsr-anon-progress-empty-"))
  const filePath = join(tempDirectory, "anonymous-progress.json")

  const store = createFileAnonymousProgressStore({ filePath })
  const snapshot = await store.loadProgress()

  assert.deepEqual(snapshot.completedProblemIds, [])
  assert.deepEqual(snapshot.attemptHistory, [])
  assert.equal(snapshot.version, 1)
})
