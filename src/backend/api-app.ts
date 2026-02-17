import express, { type Express } from "express"
import { join } from "node:path"

import { createFileAnonymousProgressStore } from "../progress/anonymous-progress-store.js"
import { createFileAccountStore } from "../auth/account-store.js"
import { createFileAccountProgressStore } from "../progress/account-progress-store.js"
import { createInMemoryAccountSessionStore } from "../auth/account-session-store.js"
import { registerAppMiddleware } from "./middleware/app-middleware.js"
import { registerFallbackHandlers } from "./middleware/error-handlers.js"
import { registerWorkspaceRoutes } from "./routes/workspace-routes.js"
import { registerPracticeRoutes } from "./routes/practice-routes.js"
import { registerProgressRoutes } from "./routes/progress-routes.js"
import { registerSchedulerRoutes } from "./routes/scheduler-routes.js"
import { registerProblemRoutes } from "./routes/problem-routes.js"
import { registerAnalyticsRoutes } from "./routes/analytics-routes.js"
import { registerAuthRoutes } from "./routes/auth-routes.js"
import { staticAssetsDir } from "./workspace/html-shell.js"
import { problemReviewQueueStore } from "./workspace/problem-workspace-service.js"

export function createApiApp(): Express {
  const app = express()

  const anonymousProgressStore = createFileAnonymousProgressStore({
    filePath:
      process.env.ANON_PROGRESS_FILE ??
      join(process.cwd(), ".cache-local", "anonymous-progress.json")
  })
  const accountStore = createFileAccountStore({
    filePath:
      process.env.ACCOUNT_STORE_FILE ??
      join(process.cwd(), ".cache-local", "accounts.json")
  })
  const accountProgressStore = createFileAccountProgressStore({
    filePath:
      process.env.ACCOUNT_PROGRESS_FILE ??
      join(process.cwd(), ".cache-local", "account-progress.json")
  })
  const accountSessionStore = createInMemoryAccountSessionStore()

  registerAppMiddleware({
    app,
    staticAssetsDir
  })
  registerWorkspaceRoutes(app)
  registerAuthRoutes({
    app,
    accountStore,
    accountSessionStore
  })
  registerPracticeRoutes(app)
  registerProgressRoutes({
    app,
    anonymousProgressStore,
    accountProgressStore,
    accountSessionStore
  })
  registerSchedulerRoutes({
    app,
    problemReviewQueueStore
  })
  registerProblemRoutes({
    app,
    problemReviewQueueStore
  })
  registerAnalyticsRoutes(app)
  registerFallbackHandlers(app)

  return app
}
