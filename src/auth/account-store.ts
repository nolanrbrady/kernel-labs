import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export type StoredAccount = {
  accountId: string
  email: string
  displayName: string | null
  passwordHash: string
  createdAt: string
}

export type AccountDirectorySnapshot = {
  version: 1
  updatedAt: string
  accounts: StoredAccount[]
}

export type AccountStore = {
  loadDirectory: () => Promise<AccountDirectorySnapshot>
  saveDirectory: (snapshot: AccountDirectorySnapshot) => Promise<void>
}

export function createInitialAccountDirectorySnapshot(options?: {
  updatedAt?: string
}): AccountDirectorySnapshot {
  return {
    version: 1,
    updatedAt: options?.updatedAt ?? new Date().toISOString(),
    accounts: []
  }
}

function isStoredAccount(value: unknown): value is StoredAccount {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.accountId === "string" &&
    typeof record.email === "string" &&
    (record.displayName === null || typeof record.displayName === "string") &&
    typeof record.passwordHash === "string" &&
    typeof record.createdAt === "string"
  )
}

function isAccountDirectorySnapshot(
  value: unknown
): value is AccountDirectorySnapshot {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const snapshot = value as Record<string, unknown>
  return (
    snapshot.version === 1 &&
    typeof snapshot.updatedAt === "string" &&
    Array.isArray(snapshot.accounts) &&
    snapshot.accounts.every((account) => {
      return isStoredAccount(account)
    })
  )
}

export function createFileAccountStore(options: {
  filePath: string
}): AccountStore {
  const { filePath } = options

  return {
    async loadDirectory() {
      try {
        const contents = await readFile(filePath, "utf8")
        const parsed = JSON.parse(contents) as unknown

        if (!isAccountDirectorySnapshot(parsed)) {
          return createInitialAccountDirectorySnapshot()
        }

        return parsed
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return createInitialAccountDirectorySnapshot()
        }

        throw error
      }
    },
    async saveDirectory(snapshot) {
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8")
    }
  }
}
