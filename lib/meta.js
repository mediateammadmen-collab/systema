import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { apiVersion } from './env.js'

// The ONLY module that talks to the Meta Graph API.
// - Tokens travel in the Authorization header only, never in URLs, so they
//   cannot leak into logs, error messages or cache keys.
// - Tokens are read from process.env inside each call and are never function
//   arguments of a cached function (arguments become cache keys).
// - Read-only: GET requests, plus POST /batch whose items are all GETs.

const GRAPH = 'https://graph.facebook.com'
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613])
const BACKOFF_MS = [1000, 2000, 4000, 8000]
const PAGE_LIMIT = 500
const MAX_PAGES = 20
const BATCH_SIZE = 50
const BATCH_CONCURRENCY = 4
const VIDEO_CONCURRENCY = 4

export class MetaApiError extends Error {
  constructor(message, { code = null, subcode = null, status = null, rateLimited = false, transient = false } = {}) {
    super(message)
    this.name = 'MetaApiError'
    this.code = code
    this.subcode = subcode
    this.status = status
    this.rateLimited = rateLimited
    this.transient = transient
  }
}

export function isRateLimitError(err) {
  return Boolean(err && (err.rateLimited || RATE_LIMIT_CODES.has(Number(err.code))))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function userToken() {
  return process.env.META_ACCESS_TOKEN.trim()
}

function errorFromBody(body, status) {
  const e = body?.error || {}
  const code = e.code ?? null
  const rateLimited = RATE_LIMIT_CODES.has(Number(code)) || status === 429
  const message = e.message || `Meta API request failed (HTTP ${status})`
  return new MetaApiError(message, { code, subcode: e.error_subcode ?? null, status, rateLimited })
}

/** Runs fn, retrying rate-limit (and transient batch) errors with exponential backoff. */
async function withRetry(label, fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const retryable = isRateLimitError(err) || err?.transient
      if (!retryable) throw err
      if (attempt >= BACKOFF_MS.length) {
        throw new MetaApiError(
          `Meta API rate limit was not cleared after ${BACKOFF_MS.length} retries (${label}): ${err.message}`,
          { code: err.code, status: err.status, rateLimited: true },
        )
      }
      await sleep(BACKOFF_MS[attempt])
    }
  }
}

function buildUrl(path, params) {
  const url = new URL(`${GRAPH}/${apiVersion()}/${String(path).replace(/^\//, '')}`)
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null) continue
    url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value))
  }
  return url
}

async function readJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

/** Single uncached GET with a given token. Throws MetaApiError on failure. */
async function rawGet(path, params, token) {
  const res = await fetch(buildUrl(path, params), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await readJson(res)
  if (!res.ok || !body || body.error) throw errorFromBody(body, res.status)
  return body
}

/**
 * Cached GET (5 minutes, tag "meta") with the server token.
 * Errors are thrown (and therefore not cached).
 */
export async function metaGet(path, params = {}) {
  'use cache'
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 })
  cacheTag('meta')
  return withRetry(String(path), () => rawGet(path, params, userToken()))
}

/** GET a collection, following paging via the `after` cursor (max 20 pages). */
export async function metaGetAll(path, params = {}) {
  const rows = []
  let after
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await metaGet(path, { ...params, limit: PAGE_LIMIT, ...(after ? { after } : {}) })
    rows.push(...(res.data || []))
    after = res.paging?.cursors?.after
    if (!res.paging?.next || !after) return rows
  }
  console.warn(
    `[meta] Paging cap reached: ${MAX_PAGES} pages × ${PAGE_LIMIT} rows for "${path}". Results beyond ${rows.length} rows were NOT fetched.`,
  )
  return rows
}

/** Runs async fn over items with at most `limit` in flight. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** One POST /batch of GET relative URLs. Rate-limited items fail the whole batch (so it is retried). */
async function postBatch(relativeUrls) {
  const body = new URLSearchParams({
    batch: JSON.stringify(relativeUrls.map((relative_url) => ({ method: 'GET', relative_url }))),
    include_headers: 'false',
  })
  const res = await fetch(`${GRAPH}/${apiVersion()}/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const json = await readJson(res)
  if (!res.ok || !Array.isArray(json)) throw errorFromBody(json, res.status)

  return json.map((item) => {
    if (!item) {
      // Meta returns null for items it could not complete in time
      throw new MetaApiError('A batch item timed out', { transient: true })
    }
    let parsed = null
    try {
      parsed = item.body ? JSON.parse(item.body) : null
    } catch {
      parsed = null
    }
    if (item.code === 200 && parsed && !parsed.error) return { ok: true, data: parsed }
    const err = errorFromBody(parsed, item.code)
    if (err.rateLimited) throw err
    return { ok: false, error: { message: err.message, code: err.code } }
  })
}

function relativeUrl(id, fields, extra) {
  const q = new URLSearchParams({ fields, ...(extra || {}) })
  return `${encodeURIComponent(id)}?${q.toString()}`
}

/**
 * Fetches nodes by ID via POST /batch (50 per batch, 4 batches in flight).
 * Returns { [id]: node | { __error } }. Root ?ids= lookups are deprecated in v26.
 */
export async function fetchNodes(ids, fields, extra = {}) {
  'use cache'
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 })
  cacheTag('meta')

  const unique = [...new Set(ids.filter(Boolean).map(String))]
  const chunks = []
  for (let i = 0; i < unique.length; i += BATCH_SIZE) chunks.push(unique.slice(i, i + BATCH_SIZE))

  const out = {}
  await mapLimit(chunks, BATCH_CONCURRENCY, async (chunk) => {
    const results = await withRetry('batch', () => postBatch(chunk.map((id) => relativeUrl(id, fields, extra))))
    results.forEach((r, i) => {
      out[chunk[i]] = r.ok ? r.data : { __error: r.error }
    })
  })
  return out
}

// ---------------------------------------------------------------------------
// Video playback
// A video's playable `source` is only returned to the token of the Page that
// owns it. Page tokens live ONLY in this in-memory Map: never returned from a
// cached function, never logged, never sent to the client.
// ---------------------------------------------------------------------------

const PAGE_TOKEN_TTL_MS = 60 * 60 * 1000
const PAGE_TOKEN_MISS_TTL_MS = 10 * 60 * 1000
const pageTokens = new Map() // pageId -> { token: string | null, at: number }

async function getPageToken(pageId) {
  const hit = pageTokens.get(pageId)
  if (hit && Date.now() - hit.at < (hit.token ? PAGE_TOKEN_TTL_MS : PAGE_TOKEN_MISS_TTL_MS)) return hit.token
  let token = null
  try {
    const res = await withRetry('page token', () => rawGet(pageId, { fields: 'access_token' }, userToken()))
    token = typeof res.access_token === 'string' ? res.access_token : null
  } catch (err) {
    if (isRateLimitError(err)) throw err
    token = null // no Page role / permission: fall back to the normal token
  }
  pageTokens.set(pageId, { token, at: Date.now() })
  return token
}

/** Returns only { source, picture } for a video. Cached by (videoId, pageId). */
export async function getVideoSource(videoId, pageId) {
  'use cache'
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 })
  cacheTag('meta')

  const fields = { fields: 'source,picture' }
  const pageToken = pageId ? await getPageToken(pageId) : null
  if (pageToken) {
    try {
      const v = await withRetry('video', () => rawGet(videoId, fields, pageToken))
      if (v.source) return { source: v.source, picture: v.picture ?? null }
    } catch (err) {
      if (isRateLimitError(err)) throw err
    }
  }
  try {
    const v = await withRetry('video', () => rawGet(videoId, fields, userToken()))
    return { source: v.source ?? null, picture: v.picture ?? null }
  } catch (err) {
    if (isRateLimitError(err)) throw err
    return { source: null, picture: null }
  }
}

/** Looks up sources for many videos, deduped by video ID, 4 at a time. */
export async function getVideoSources(videos) {
  const byId = new Map()
  for (const v of videos) if (v.videoId && !byId.has(v.videoId)) byId.set(v.videoId, v.pageId || null)
  const entries = [...byId.entries()]
  const results = await mapLimit(entries, VIDEO_CONCURRENCY, ([videoId, pageId]) => getVideoSource(videoId, pageId))
  return Object.fromEntries(entries.map(([videoId], i) => [videoId, results[i]]))
}
