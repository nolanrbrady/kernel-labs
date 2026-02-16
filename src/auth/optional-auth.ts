let optionalAccountCounter = 0

export type OptionalAccount = {
  accountId: string
  displayName: string | null
  createdAt: string
  optional: true
}

export function createOptionalAccount(options?: {
  displayName?: string
  createdAt?: string
}): OptionalAccount {
  optionalAccountCounter += 1

  return {
    accountId: `acct_${String(optionalAccountCounter).padStart(4, "0")}`,
    displayName:
      typeof options?.displayName === "string" && options.displayName.trim() !== ""
        ? options.displayName.trim()
        : null,
    createdAt: options?.createdAt ?? new Date().toISOString(),
    optional: true
  }
}
