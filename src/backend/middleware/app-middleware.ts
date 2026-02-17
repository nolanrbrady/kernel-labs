import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response
} from "express"

export function registerAppMiddleware(options: {
  app: Express
  staticAssetsDir: string
}): void {
  const { app, staticAssetsDir } = options

  app.disable("x-powered-by")
  app.use(express.json({ limit: "32kb" }))
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("x-content-type-options", "nosniff")
    response.setHeader("x-frame-options", "DENY")
    response.setHeader("referrer-policy", "no-referrer")
    response.setHeader("cross-origin-resource-policy", "same-origin")
    response.setHeader(
      "content-security-policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;"
    )
    next()
  })

  app.use("/static", express.static(staticAssetsDir, {
    index: false,
    maxAge: 0,
    immutable: false
  }))
}
