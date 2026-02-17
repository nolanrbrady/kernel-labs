import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

import type {
  AccountStore,
  StoredAccount
} from "./account-store.js"

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 256
const DISPLAY_NAME_MAX_LENGTH = 80
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HASH_PREFIX = "scrypt"

export type AccountErrorCode =
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "INVALID_DISPLAY_NAME"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"

export class AccountRegistrationError extends Error {
  readonly code: AccountErrorCode
  readonly statusCode: number

  constructor(options: {
    code: AccountErrorCode
    statusCode: number
    message: string
  }) {
    super(options.message)
    this.code = options.code
    this.statusCode = options.statusCode
  }
}

export class AccountAuthenticationError extends Error {
  readonly code: AccountErrorCode
  readonly statusCode: number

  constructor(options: {
    code: AccountErrorCode
    statusCode: number
    message: string
  }) {
    super(options.message)
    this.code = options.code
    this.statusCode = options.statusCode
  }
}

export type CreatedAccount = {
  accountId: string
  email: string
  displayName: string | null
  createdAt: string
  optional: false
}

export function normalizeAccountEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase()
}

function normalizeDisplayName(rawDisplayName: string | undefined): string | null {
  if (typeof rawDisplayName !== "string") {
    return null
  }

  const trimmed = rawDisplayName.trim()
  if (trimmed.length === 0) {
    return null
  }

  return trimmed
}

function assertValidEmail(rawEmail: string): string {
  const email = normalizeAccountEmail(rawEmail)
  if (!EMAIL_PATTERN.test(email)) {
    throw new AccountRegistrationError({
      code: "INVALID_EMAIL",
      statusCode: 400,
      message: "Enter a valid email address."
    })
  }

  return email
}

function assertValidPassword(rawPassword: string): void {
  if (
    rawPassword.length < MIN_PASSWORD_LENGTH ||
    rawPassword.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AccountRegistrationError({
      code: "WEAK_PASSWORD",
      statusCode: 400,
      message: `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`
    })
  }
}

function assertValidDisplayName(displayName: string | null): void {
  if (displayName && displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new AccountRegistrationError({
      code: "INVALID_DISPLAY_NAME",
      statusCode: 400,
      message: `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or less.`
    })
  }
}

export function hashPassword(rawPassword: string): string {
  const salt = randomBytes(16)
  const digest = scryptSync(rawPassword, salt, 64)
  return `${HASH_PREFIX}$${salt.toString("base64")}$${digest.toString("base64")}`
}

export function verifyPasswordHash(
  rawPassword: string,
  encodedHash: string
): boolean {
  const [algorithm, saltBase64, digestBase64] = encodedHash.split("$")
  if (
    algorithm !== HASH_PREFIX ||
    typeof saltBase64 !== "string" ||
    typeof digestBase64 !== "string"
  ) {
    return false
  }

  try {
    const salt = Buffer.from(saltBase64, "base64")
    const expectedDigest = Buffer.from(digestBase64, "base64")
    const nextDigest = scryptSync(rawPassword, salt, expectedDigest.length)

    return timingSafeEqual(nextDigest, expectedDigest)
  } catch (_error) {
    return false
  }
}

function sanitizeAccount(account: StoredAccount): CreatedAccount {
  return {
    accountId: account.accountId,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
    optional: false
  }
}

export function createAccountService(options: {
  accountStore: AccountStore
  idProvider?: () => string
  nowProvider?: () => string
}) {
  const {
    accountStore,
    idProvider = () => {
      const entropy = randomBytes(6).toString("hex")
      return `acct_${entropy}`
    },
    nowProvider = () => new Date().toISOString()
  } = options

  return {
    async createAccount(input: {
      email: string
      password: string
      displayName?: string
    }): Promise<CreatedAccount> {
      const email = assertValidEmail(input.email)
      assertValidPassword(input.password)
      const displayName = normalizeDisplayName(input.displayName)
      assertValidDisplayName(displayName)

      const directory = await accountStore.loadDirectory()
      const hasDuplicateEmail = directory.accounts.some((account) => {
        return normalizeAccountEmail(account.email) === email
      })

      if (hasDuplicateEmail) {
        throw new AccountRegistrationError({
          code: "EMAIL_TAKEN",
          statusCode: 409,
          message: "An account with this email already exists."
        })
      }

      const createdAt = nowProvider()
      const nextAccount: StoredAccount = {
        accountId: idProvider(),
        email,
        displayName,
        passwordHash: hashPassword(input.password),
        createdAt
      }
      const nextDirectory = {
        ...directory,
        updatedAt: createdAt,
        accounts: [...directory.accounts, nextAccount]
      }
      await accountStore.saveDirectory(nextDirectory)

      return sanitizeAccount(nextAccount)
    },
    async authenticateAccount(input: {
      email: string
      password: string
    }): Promise<CreatedAccount> {
      const email = assertValidEmail(input.email)
      const directory = await accountStore.loadDirectory()
      const matchingAccount = directory.accounts.find((account) => {
        return normalizeAccountEmail(account.email) === email
      })

      if (
        !matchingAccount ||
        verifyPasswordHash(input.password, matchingAccount.passwordHash) === false
      ) {
        throw new AccountAuthenticationError({
          code: "INVALID_CREDENTIALS",
          statusCode: 401,
          message: "Email or password is incorrect."
        })
      }

      return sanitizeAccount(matchingAccount)
    }
  }
}
