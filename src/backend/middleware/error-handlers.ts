import type {
  Express,
  NextFunction,
  Request,
  Response
} from "express"

export function registerFallbackHandlers(app: Express): void {
  app.use((_request: Request, response: Response) => {
    response.status(404).json({
      status: "failure",
      errorCode: "NOT_FOUND",
      message: "Requested route was not found."
    })
  })

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction
    ) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error as { type?: string }).type === "entity.too.large"
      ) {
        response.status(413).json({
          status: "failure",
          errorCode: "PAYLOAD_TOO_LARGE",
          message: "Request payload exceeds the allowed size limit."
        })
        return
      }

      response.status(500).json({
        status: "failure",
        errorCode: "INTERNAL_ERROR",
        message: "An unexpected server error occurred."
      })
    }
  )
}
