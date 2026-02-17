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
import { mergeAnonymousProgressIntoAccount } from "../../progress/progress-sync-merge.js"
import { buildMinimalProgressView } from "../../progress/minimal-progress-view.js"

export function registerProgressRoutes(options: {
  app: Express
  anonymousProgressStore: AnonymousProgressStore
}): void {
  const { app, anonymousProgressStore } = options

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
