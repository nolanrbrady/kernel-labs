import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export type AnonymousAttemptRecord = {
  problemId: string
  correctness: "pass" | "partial" | "fail"
  hintTierUsed: number
  timeSpentMinutes: number
  submittedAt: string
}

export type AnonymousProgressSnapshot = {
  version: 1
  updatedAt: string
  completedProblemIds: string[]
  attemptHistory: AnonymousAttemptRecord[]
}

export type AnonymousProgressStore = {
  loadProgress: () => Promise<AnonymousProgressSnapshot>
  saveProgress: (snapshot: AnonymousProgressSnapshot) => Promise<void>
}

export function createInitialAnonymousProgressSnapshot(options?: {
  updatedAt?: string
}): AnonymousProgressSnapshot {
  return {
    version: 1,
    updatedAt: options?.updatedAt ?? new Date().toISOString(),
    completedProblemIds: [],
    attemptHistory: []
  }
}

function isAnonymousProgressSnapshot(
  value: unknown
): value is AnonymousProgressSnapshot {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const snapshot = value as Record<string, unknown>
  return (
    snapshot.version === 1 &&
    typeof snapshot.updatedAt === "string" &&
    Array.isArray(snapshot.completedProblemIds) &&
    Array.isArray(snapshot.attemptHistory)
  )
}

export function createFileAnonymousProgressStore(options: {
  filePath: string
}): AnonymousProgressStore {
  const { filePath } = options

  return {
    async loadProgress() {
      try {
        const contents = await readFile(filePath, "utf8")
        const parsed = JSON.parse(contents) as unknown

        if (!isAnonymousProgressSnapshot(parsed)) {
          return createInitialAnonymousProgressSnapshot()
        }

        return parsed
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return createInitialAnonymousProgressSnapshot()
        }

        throw error
      }
    },
    async saveProgress(snapshot) {
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8")
    }
  }
}
