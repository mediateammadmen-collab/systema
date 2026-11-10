import 'server-only'

// Server-only configuration. Never prefix these with NEXT_PUBLIC_.
export const REQUIRED_ENV = ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID', 'META_API_VERSION']

/** Names (never values) of required variables that are missing or blank. */
export function missingEnv() {
  return REQUIRED_ENV.filter((name) => !process.env[name]?.trim())
}

export class EnvError extends Error {
  constructor(missing) {
    super(`Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`)
    this.name = 'EnvError'
    this.missing = missing
  }
}

export function assertEnv() {
  const missing = missingEnv()
  if (missing.length) throw new EnvError(missing)
}

/** Ad account ID normalised to the "act_<id>" form. */
export function adAccountId() {
  const id = process.env.META_AD_ACCOUNT_ID.trim()
  return id.startsWith('act_') ? id : `act_${id}`
}

export function apiVersion() {
  const v = process.env.META_API_VERSION.trim()
  return v.startsWith('v') ? v : `v${v}`
}
