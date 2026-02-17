import type {
  Express,
  Request,
  Response
} from "express"

import {
  createInitialAnonymousProgressSnapshot,
  type AnonymousProgressSnapshot,
  type AnonymousProgressStore
} from "../../progress/anonymous-progress-store.js"
import type { AccountProgressStore } from "../../progress/account-progress-store.js"
import { mergeAnonymousProgressIntoAccount } from "../../progress/progress-sync-merge.js"
import { buildMinimalProgressView } from "../../progress/minimal-progress-view.js"
import {
  extractBearerToken,
  type AccountSessionStore
} from "../../auth/account-session-store.js"

export function registerProgressRoutes(options: {
  app: Express
  anonymousProgressStore: AnonymousProgressStore
  accountProgressStore: AccountProgressStore
  accountSessionStore: AccountSessionStore
}): void {
  const {
    app,
    anonymousProgressStore,
    accountProgressStore,
    accountSessionStore
  } = options

  function resolveAuthenticatedAccountId(request: Request): string | null {
    const token = extractBearerToken(request.headers.authorization)
    if (!token) {
      return null
    }

    const session = accountSessionStore.resolveSession(token)
    return session?.account.accountId ?? null
  }

  app.get("/api/progress/anonymous", async (_request: Request, response: Response) => {
    const snapshot = await anonymousProgressStore.loadProgress()
    response.status(200).json(snapshot)
  })

  app.post("/api/progress/anonymous", async (request: Request, response: Response) => {
    const rawBody = request.body as Partial<AnonymousProgressSnapshot>

    if (
      rawBody.version !== 1 ||
      !Array.isArray(rawBody.completedProblemIds) ||
      !Array.isArray(rawBody.attemptHistory)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Anonymous progress payload must include version, completedProblemIds, and attemptHistory."
      })
      return
    }

    const normalizedSnapshot: AnonymousProgressSnapshot = {
      version: 1,
      updatedAt: new Date().toISOString(),
      completedProblemIds: rawBody.completedProblemIds,
      attemptHistory: rawBody.attemptHistory
    }

    await anonymousProgressStore.saveProgress(normalizedSnapshot)
    response.status(200).json(normalizedSnapshot)
  })

  app.post(
    "/api/progress/anonymous/reset",
    async (_request: Request, response: Response) => {
      const snapshot = createInitialAnonymousProgressSnapshot()
      await anonymousProgressStore.saveProgress(snapshot)
      response.status(200).json(snapshot)
    }
  )

  app.get("/api/progress/account", async (request: Request, response: Response) => {
    const accountId = resolveAuthenticatedAccountId(request)
    if (!accountId) {
      response.status(401).json({
        status: "failure",
        errorCode: "UNAUTHORIZED",
        message: "Sign in is required to access account progress."
      })
      return
    }

    const snapshot = await accountProgressStore.loadAccountProgress(accountId)
    response.status(200).json(snapshot)
  })

  app.post("/api/progress/account", async (request: Request, response: Response) => {
    const accountId = resolveAuthenticatedAccountId(request)
    if (!accountId) {
      response.status(401).json({
        status: "failure",
        errorCode: "UNAUTHORIZED",
        message: "Sign in is required to save account progress."
      })
      return
    }

    const rawBody = request.body as Partial<AnonymousProgressSnapshot>
    if (
      rawBody.version !== 1 ||
      !Array.isArray(rawBody.completedProblemIds) ||
      !Array.isArray(rawBody.attemptHistory)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Account progress payload must include version, completedProblemIds, and attemptHistory."
      })
      return
    }

    const normalizedSnapshot: AnonymousProgressSnapshot = {
      version: 1,
      updatedAt: new Date().toISOString(),
      completedProblemIds: rawBody.completedProblemIds,
      attemptHistory: rawBody.attemptHistory
    }
    await accountProgressStore.saveAccountProgress(accountId, normalizedSnapshot)
    response.status(200).json(normalizedSnapshot)
  })

  app.post(
    "/api/progress/account/merge-anonymous",
    async (request: Request, response: Response) => {
      const accountId = resolveAuthenticatedAccountId(request)
      if (!accountId) {
        response.status(401).json({
          status: "failure",
          errorCode: "UNAUTHORIZED",
          message: "Sign in is required to merge progress."
        })
        return
      }

      const rawBody = request.body as {
        anonymousProgress?: Partial<AnonymousProgressSnapshot>
      }
      if (
        rawBody.anonymousProgress?.version !== 1 ||
        !Array.isArray(rawBody.anonymousProgress.completedProblemIds) ||
        !Array.isArray(rawBody.anonymousProgress.attemptHistory)
      ) {
        response.status(400).json({
          status: "failure",
          errorCode: "INVALID_REQUEST",
          message:
            "Merge requires an anonymousProgress snapshot with version 1."
        })
        return
      }

      const accountProgress = await accountProgressStore.loadAccountProgress(accountId)
      const mergedSnapshot = mergeAnonymousProgressIntoAccount({
        anonymousProgress: rawBody.anonymousProgress as AnonymousProgressSnapshot,
        accountProgress
      })
      await accountProgressStore.saveAccountProgress(accountId, mergedSnapshot)
      response.status(200).json(mergedSnapshot)
    }
  )

  app.post("/api/progress/sync-merge", (request: Request, response: Response) => {
    const rawBody = request.body as {
      anonymousProgress?: Partial<AnonymousProgressSnapshot>
      accountProgress?: Partial<AnonymousProgressSnapshot>
    }

    if (
      rawBody.anonymousProgress?.version !== 1 ||
      rawBody.accountProgress?.version !== 1 ||
      !Array.isArray(rawBody.anonymousProgress.completedProblemIds) ||
      !Array.isArray(rawBody.anonymousProgress.attemptHistory) ||
      !Array.isArray(rawBody.accountProgress.completedProblemIds) ||
      !Array.isArray(rawBody.accountProgress.attemptHistory)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Sync merge requires accountProgress and anonymousProgress snapshots with version 1."
      })
      return
    }

    const mergedSnapshot = mergeAnonymousProgressIntoAccount({
      anonymousProgress: rawBody.anonymousProgress as AnonymousProgressSnapshot,
      accountProgress: rawBody.accountProgress as AnonymousProgressSnapshot
    })

    response.status(200).json(mergedSnapshot)
  })

  app.post("/api/progress/view", (request: Request, response: Response) => {
    const rawBody = request.body as {
      categorySnapshots?: unknown
      recentFocusCategories?: unknown
    }

    if (
      !Array.isArray(rawBody.categorySnapshots) ||
      !Array.isArray(rawBody.recentFocusCategories)
    ) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message:
          "Progress view requires categorySnapshots and recentFocusCategories arrays."
      })
      return
    }

    response.status(200).json(
      buildMinimalProgressView({
        categorySnapshots: rawBody.categorySnapshots as Array<{
          category: string
          completedCount: number
          freshnessScore: number
          lastPracticedAt: string
        }>,
        recentFocusCategories: rawBody.recentFocusCategories as string[]
      })
    )
  })
}
