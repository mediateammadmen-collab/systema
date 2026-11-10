// Display formatting. Missing values (null/undefined) render as an em dash.

const DASH = '—'

export function formatCurrency(value, currency = 'USD') {
  if (value == null || !Number.isFinite(value)) return DASH
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Small unit costs: below 0.01, show 2 significant figures instead of "$0.00". */
export function formatUnitCost(value, currency = 'USD') {
  if (value == null || !Number.isFinite(value)) return DASH
  if (value > 0 && value < 0.01) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumSignificantDigits: 2,
    }).format(value)
  }
  return formatCurrency(value, currency)
}

export function formatNumber(value) {
  if (value == null || !Number.isFinite(value)) return DASH
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function formatCompact(value) {
  if (value == null || !Number.isFinite(value)) return DASH
  if (Math.abs(value) < 10000) return formatNumber(value)
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatPercent(value, digits = 2) {
  if (value == null || !Number.isFinite(value)) return DASH
  return `${value.toFixed(digits)}%`
}

export function formatDecimal(value, digits = 2) {
  if (value == null || !Number.isFinite(value)) return DASH
  return value.toFixed(digits)
}
