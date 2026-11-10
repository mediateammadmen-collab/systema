// Date range resolution. All dates are calendar dates ("yyyy-MM-dd") in the
// ad account's timezone. `today` is passed in so this stays pure and testable.
import { addDays, endOfMonth, format, isValid, parseISO, startOfMonth, subDays, subMonths } from 'date-fns'

export const DEFAULT_RANGE = 'last_14'

export const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_7', label: 'Last 7 days', days: 7 },
  { key: 'last_14', label: 'Last 14 days', days: 14 },
  { key: 'last_30', label: 'Last 30 days', days: 30 },
  { key: 'last_90', label: 'Last 90 days', days: 90 },
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'lifetime', label: 'Lifetime' },
]

const PRESET_BY_KEY = Object.fromEntries(PRESETS.map((p) => [p.key, p]))
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const fmt = (d) => format(d, 'yyyy-MM-dd')

/** Today's calendar date in an IANA timezone. */
export function todayInTimeZone(timeZone, now = new Date()) {
  try {
    // en-CA formats as yyyy-MM-dd
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

export function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const d = parseISO(value)
  return isValid(d) && fmt(d) === value
}

function first(value) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * @param {{range?: string, start?: string, end?: string}} params URL search params
 * @param {string} today yyyy-MM-dd in the account timezone
 */
export function resolveRange(params, today) {
  const key = first(params?.range)
  const start = first(params?.start)
  const end = first(params?.end)
  const t = parseISO(today)

  if (key === 'custom' && isValidDateString(start) && isValidDateString(end) && start <= end) {
    if (start > today) {
      return build('custom', 'Custom range', start, end, { future: true })
    }
    const clamped = end > today
    return build('custom', 'Custom range', start, clamped ? today : end, { clamped })
  }

  const preset = PRESET_BY_KEY[key] ? key : DEFAULT_RANGE
  const label = PRESET_BY_KEY[preset].label

  switch (preset) {
    case 'today':
      return build(preset, label, today, today)
    case 'yesterday': {
      const y = fmt(subDays(t, 1))
      return build(preset, label, y, y)
    }
    case 'this_month':
      return build(preset, label, fmt(startOfMonth(t)), today)
    case 'last_month': {
      const lm = subMonths(startOfMonth(t), 1)
      return build(preset, label, fmt(lm), fmt(endOfMonth(lm)))
    }
    case 'lifetime':
      return { key: preset, label, since: null, until: null, lifetime: true, future: false, clamped: false }
    default: {
      // "Last N days" ends yesterday, matching Ads Manager
      const days = PRESET_BY_KEY[preset].days
      return build(preset, label, fmt(subDays(t, days)), fmt(subDays(t, 1)))
    }
  }
}

function build(key, label, since, until, { future = false, clamped = false } = {}) {
  return { key, label, since, until, lifetime: false, future, clamped }
}

/** Human-readable range, e.g. "Oct 27 – Nov 9, 2026". */
export function describeRange(range) {
  if (range.lifetime) return 'All available data'
  const s = parseISO(range.since)
  const u = parseISO(range.until)
  if (range.since === range.until) return format(s, 'EEE, MMM d, yyyy')
  if (s.getFullYear() === u.getFullYear()) return `${format(s, 'MMM d')} – ${format(u, 'MMM d, yyyy')}`
  return `${format(s, 'MMM d, yyyy')} – ${format(u, 'MMM d, yyyy')}`
}

export { addDays }
