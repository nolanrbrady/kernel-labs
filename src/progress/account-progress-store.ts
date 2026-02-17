import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  type AnonymousProgressSnapshot,
  createInitialAnonymousProgressSnapshot
} from "./anonymous-progress-store.js"

type AccountProgressDirectorySnapshot = {
  version: 1
  updatedAt: string
  progressByAccountId: Record<string, AnonymousProgressSnapshot>
}

export type AccountProgressStore = {
  loadAccountProgress: (accountId: string) => Promise<AnonymousProgressSnapshot>
  saveAccountProgress: (
    accountId: string,
    snapshot: AnonymousProgressSnapshot
  ) => Promise<void>
}

function createInitialAccountProgressDirectorySnapshot(): AccountProgressDirectorySnapshot {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    progressByAccountId: {}
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

function isAccountProgressDirectorySnapshot(
  value: unknown
): value is AccountProgressDirectorySnapshot {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const snapshot = value as Record<string, unknown>
  if (
    snapshot.version !== 1 ||
    typeof snapshot.updatedAt !== "string" ||
    typeof snapshot.progressByAccountId !== "object" ||
    snapshot.progressByAccountId === null
  ) {
    return false
  }

  const progressEntries = Object.values(
    snapshot.progressByAccountId as Record<string, unknown>
  )

  return progressEntries.every((entry) => {
    return isAnonymousProgressSnapshot(entry)
  })
}

export function createFileAccountProgressStore(options: {
  filePath: string
}): AccountProgressStore {
  const { filePath } = options

  async function loadDirectory(): Promise<AccountProgressDirectorySnapshot> {
    try {
      const contents = await readFile(filePath, "utf8")
      const parsed = JSON.parse(contents) as unknown

      if (!isAccountProgressDirectorySnapshot(parsed)) {
        return createInitialAccountProgressDirectorySnapshot()
      }

      return parsed
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return createInitialAccountProgressDirectorySnapshot()
      }

      throw error
    }
  }

  async function saveDirectory(
    snapshot: AccountProgressDirectorySnapshot
  ): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8")
  }

  return {
    async loadAccountProgress(accountId: string): Promise<AnonymousProgressSnapshot> {
      const directory = await loadDirectory()
      const progress = directory.progressByAccountId[accountId]

      if (isAnonymousProgressSnapshot(progress)) {
        return progress
      }

      return createInitialAnonymousProgressSnapshot()
    },
    async saveAccountProgress(accountId, snapshot): Promise<void> {
      const directory = await loadDirectory()
      const nextDirectory: AccountProgressDirectorySnapshot = {
        ...directory,
        updatedAt: new Date().toISOString(),
        progressByAccountId: {
          ...directory.progressByAccountId,
          [accountId]: snapshot
        }
      }

      await saveDirectory(nextDirectory)
    }
  }
}
