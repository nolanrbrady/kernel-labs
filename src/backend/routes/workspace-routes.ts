import type {
  Express,
  Request,
  Response
} from "express"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  ProblemWorkspaceScreen,
  createEditorFirstLandingRoute
} from "../../frontend/problem-workspace-route.js"
import { renderHtmlDocument } from "../workspace/html-shell.js"
import { resolveWorkspaceProblem } from "../workspace/problem-workspace-service.js"

export function registerWorkspaceRoutes(app: Express): void {
  app.get("/", (request: Request, response: Response) => {
    const rawProblemId = request.query.problemId
    const problemId =
      typeof rawProblemId === "string" && rawProblemId.length > 0
        ? rawProblemId
        : null
    const route = createEditorFirstLandingRoute(resolveWorkspaceProblem(problemId))
    const markup = renderToStaticMarkup(
      createElement(ProblemWorkspaceScreen, { route })
    )

    response
      .status(200)
      .type("html")
      .send(renderHtmlDocument(markup, { includeClientScript: true }))
  })

  app.get("/health", (_request: Request, response: Response) => {
    response.status(200).json({ ok: true })
  })

  app.get("/auth/create-account", (_request: Request, response: Response) => {
    response.status(200).type("html").send(
      renderHtmlDocument(
        `<main><h1>Create Optional Account</h1><p>Account creation is optional and never blocks solving.</p></main>`
      )
    )
  })
}
