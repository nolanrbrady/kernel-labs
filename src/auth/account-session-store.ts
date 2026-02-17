import { randomBytes } from "node:crypto"

type AccountSessionRecord = {
  sessionToken: string
  accountId: string
  email: string
  displayName: string | null
  createdAt: string
  expiresAt: string
}

export type AccountSession = {
  sessionToken: string
  account: {
    accountId: string
    email: string
    displayName: string | null
    createdAt: string
    optional: false
  }
  expiresAt: string
}

export type AccountSessionStore = {
  createSession: (account: {
    accountId: string
    email: string
    displayName: string | null
    createdAt: string
  }) => AccountSession
  resolveSession: (sessionToken: string) => AccountSession | null
}

export function extractBearerToken(
  authorizationHeader: unknown
): string | null {
  if (typeof authorizationHeader !== "string") {
    return null
  }

  const trimmedHeader = authorizationHeader.trim()
  if (!trimmedHeader.startsWith("Bearer ")) {
    return null
  }

  const token = trimmedHeader.slice("Bearer ".length).trim()
  return token.length > 0 ? token : null
}

export function createInMemoryAccountSessionStore(options?: {
  nowProvider?: () => number
  ttlMs?: number
}): AccountSessionStore {
  const nowProvider = options?.nowProvider ?? (() => Date.now())
  const ttlMs =
    typeof options?.ttlMs === "number" && options.ttlMs > 0
      ? options.ttlMs
      : 30 * 24 * 60 * 60 * 1000
  const sessionsByToken = new Map<string, AccountSessionRecord>()

  function sanitizeSession(record: AccountSessionRecord): AccountSession {
    return {
      sessionToken: record.sessionToken,
      account: {
        accountId: record.accountId,
        email: record.email,
        displayName: record.displayName,
        createdAt: record.createdAt,
        optional: false
      },
      expiresAt: record.expiresAt
    }
  }

  function pruneExpiredSessions(): void {
    const nowMs = nowProvider()
    for (const [token, session] of sessionsByToken.entries()) {
      if (Date.parse(session.expiresAt) <= nowMs) {
        sessionsByToken.delete(token)
      }
    }
  }

  return {
    createSession(account) {
      pruneExpiredSessions()

      const nowMs = nowProvider()
      const createdAt = new Date(nowMs).toISOString()
      const expiresAt = new Date(nowMs + ttlMs).toISOString()
      const sessionToken = `sess_${randomBytes(24).toString("hex")}`

      const sessionRecord: AccountSessionRecord = {
        sessionToken,
        accountId: account.accountId,
        email: account.email,
        displayName: account.displayName,
        createdAt: account.createdAt,
        expiresAt
      }
      sessionsByToken.set(sessionToken, sessionRecord)

      return sanitizeSession(sessionRecord)
    },
    resolveSession(sessionToken) {
      pruneExpiredSessions()
      const session = sessionsByToken.get(sessionToken)
      if (!session) {
        return null
      }

      return sanitizeSession(session)
    }
  }
}
