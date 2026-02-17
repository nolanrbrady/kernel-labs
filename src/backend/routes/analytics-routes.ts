import type {
  Express,
  Request,
  Response
} from "express"

import { buildSupportiveAnalyticsSummaries } from "../../analytics/supportive-analytics-summaries.js"

export function registerAnalyticsRoutes(app: Express): void {
  app.post("/api/analytics/summaries", (request: Request, response: Response) => {
    const rawBody = request.body as {
      categoryMetrics?: unknown
    }

    if (!Array.isArray(rawBody.categoryMetrics)) {
      response.status(400).json({
        status: "failure",
        errorCode: "INVALID_REQUEST",
        message: "Analytics summaries require a categoryMetrics array."
      })
      return
    }

    response.status(200).json(
      buildSupportiveAnalyticsSummaries({
        categoryMetrics: rawBody.categoryMetrics as Array<{
          category: string
          averageHintTierUsed: number
          averageTimeSpentMinutes: number
          resurfacingFrequencyPerWeek: number
        }>
      })
    )
  })
}
