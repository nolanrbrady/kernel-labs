import assert from "node:assert/strict"
import test from "node:test"

import {
  AccountAuthenticationError,
  AccountRegistrationError,
  createAccountService,
  verifyPasswordHash
} from "../src/auth/account-service.js"
import {
  type AccountDirectorySnapshot,
  createInitialAccountDirectorySnapshot
} from "../src/auth/account-store.js"

function cloneSnapshot(snapshot: AccountDirectorySnapshot): AccountDirectorySnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as AccountDirectorySnapshot
}

function createMemoryAccountStore(
  initialSnapshot = createInitialAccountDirectorySnapshot()
) {
  let snapshot = cloneSnapshot(initialSnapshot)

  return {
    async loadDirectory() {
      return cloneSnapshot(snapshot)
    },
    async saveDirectory(nextSnapshot: AccountDirectorySnapshot) {
      snapshot = cloneSnapshot(nextSnapshot)
    },
    readSnapshot() {
      return cloneSnapshot(snapshot)
    }
  }
}

test("account service creates account with normalized email and hashed password", async () => {
  const accountStore = createMemoryAccountStore()
  const service = createAccountService({
    accountStore,
    idProvider: () => "acct_fixed_001",
    nowProvider: () => "2026-02-17T00:00:00.000Z"
  })

  const account = await service.createAccount({
    email: "  USER@example.com ",
    password: "strong-password-123",
    displayName: "  Ada  "
  })

  assert.equal(account.accountId, "acct_fixed_001")
  assert.equal(account.email, "user@example.com")
  assert.equal(account.displayName, "Ada")
  assert.equal(account.optional, false)

  const snapshot = accountStore.readSnapshot()
  assert.equal(snapshot.accounts.length, 1)
  assert.equal(snapshot.accounts[0].email, "user@example.com")
  assert.equal(snapshot.accounts[0].passwordHash.includes("strong-password-123"), false)
  assert.equal(
    verifyPasswordHash("strong-password-123", snapshot.accounts[0].passwordHash),
    true
  )
  assert.equal(
    verifyPasswordHash("wrong-password", snapshot.accounts[0].passwordHash),
    false
  )
})

test("account service rejects duplicate emails case-insensitively", async () => {
  const accountStore = createMemoryAccountStore()
  const service = createAccountService({
    accountStore,
    idProvider: (() => {
      let index = 0
      return () => {
        index += 1
        return `acct_fixed_${index}`
      }
    })(),
    nowProvider: () => "2026-02-17T00:00:00.000Z"
  })

  await service.createAccount({
    email: "owner@example.com",
    password: "strong-password-123"
  })

  await assert.rejects(
    async () => {
      await service.createAccount({
        email: "OWNER@example.com",
        password: "another-strong-password-123"
      })
    },
    (error) => {
      assert.equal(error instanceof AccountRegistrationError, true)
      const registrationError = error as AccountRegistrationError
      assert.equal(registrationError.code, "EMAIL_TAKEN")
      assert.equal(registrationError.statusCode, 409)
      return true
    }
  )
})

test("account service authenticates existing accounts with matching password", async () => {
  const accountStore = createMemoryAccountStore()
  const service = createAccountService({
    accountStore,
    idProvider: () => "acct_fixed_auth",
    nowProvider: () => "2026-02-17T00:00:00.000Z"
  })

  await service.createAccount({
    email: "auth-user@example.com",
    password: "strong-password-123",
    displayName: "Auth User"
  })

  const account = await service.authenticateAccount({
    email: "AUTH-USER@example.com",
    password: "strong-password-123"
  })

  assert.equal(account.accountId, "acct_fixed_auth")
  assert.equal(account.email, "auth-user@example.com")
})

test("account service rejects authentication with invalid password", async () => {
  const accountStore = createMemoryAccountStore()
  const service = createAccountService({
    accountStore,
    idProvider: () => "acct_fixed_auth_fail",
    nowProvider: () => "2026-02-17T00:00:00.000Z"
  })

  await service.createAccount({
    email: "auth-fail@example.com",
    password: "strong-password-123"
  })

  await assert.rejects(
    async () => {
      await service.authenticateAccount({
        email: "auth-fail@example.com",
        password: "wrong-password"
      })
    },
    (error) => {
      assert.equal(error instanceof AccountAuthenticationError, true)
      assert.equal((error as AccountAuthenticationError).code, "INVALID_CREDENTIALS")
      return true
    }
  )
})
