import type {
  Express,
  Request,
  Response
} from "express"

import {
  AccountAuthenticationError,
  AccountRegistrationError,
  createAccountService
} from "../../auth/account-service.js"
import type { AccountStore } from "../../auth/account-store.js"
import type { AccountSessionStore } from "../../auth/account-session-store.js"

type CreateAccountRequestBody = {
  email?: unknown
  password?: unknown
  displayName?: unknown
}
type SignInRequestBody = {
  email?: unknown
  password?: unknown
}

export function registerAuthRoutes(options: {
  app: Express
  accountStore: AccountStore
  accountSessionStore: AccountSessionStore
}): void {
  const { app, accountStore, accountSessionStore } = options
  const accountService = createAccountService({
    accountStore
  })

  app.post(
    "/api/auth/create-account",
    async (
      request: Request<unknown, unknown, CreateAccountRequestBody>,
      response: Response
    ) => {
      const rawBody = request.body

      if (
        typeof rawBody.email !== "string" ||
        typeof rawBody.password !== "string" ||
        (rawBody.displayName !== undefined &&
          typeof rawBody.displayName !== "string")
      ) {
        response.status(400).json({
          status: "failure",
          errorCode: "INVALID_REQUEST",
          message:
            "Create-account request requires email and password strings. displayName must be a string when provided."
        })
        return
      }

      try {
        const account = await accountService.createAccount({
          email: rawBody.email,
          password: rawBody.password,
          displayName: rawBody.displayName
        })
        const session = accountSessionStore.createSession({
          accountId: account.accountId,
          email: account.email,
          displayName: account.displayName,
          createdAt: account.createdAt
        })

        response.status(201).json({
          status: "success",
          account,
          session,
          message:
            "Account created. You can keep solving right away."
        })
      } catch (error) {
        if (error instanceof AccountRegistrationError) {
          response.status(error.statusCode).json({
            status: "failure",
            errorCode: error.code,
            message: error.message
          })
          return
        }

        response.status(500).json({
          status: "failure",
          errorCode: "INTERNAL_ERROR",
          message: "Unable to create account right now. Please try again."
        })
      }
    }
  )

  app.post(
    "/api/auth/sign-in",
    async (
      request: Request<unknown, unknown, SignInRequestBody>,
      response: Response
    ) => {
      const rawBody = request.body

      if (
        typeof rawBody.email !== "string" ||
        typeof rawBody.password !== "string"
      ) {
        response.status(400).json({
          status: "failure",
          errorCode: "INVALID_REQUEST",
          message: "Sign-in request requires email and password strings."
        })
        return
      }

      try {
        const account = await accountService.authenticateAccount({
          email: rawBody.email,
          password: rawBody.password
        })
        const session = accountSessionStore.createSession({
          accountId: account.accountId,
          email: account.email,
          displayName: account.displayName,
          createdAt: account.createdAt
        })

        response.status(200).json({
          status: "success",
          account,
          session,
          message: "Signed in successfully."
        })
      } catch (error) {
        if (error instanceof AccountAuthenticationError) {
          response.status(error.statusCode).json({
            status: "failure",
            errorCode: error.code,
            message: error.message
          })
          return
        }
        if (error instanceof AccountRegistrationError) {
          response.status(error.statusCode).json({
            status: "failure",
            errorCode: error.code,
            message: error.message
          })
          return
        }

        response.status(500).json({
          status: "failure",
          errorCode: "INTERNAL_ERROR",
          message: "Unable to sign in right now. Please try again."
        })
      }
    }
  )
}
