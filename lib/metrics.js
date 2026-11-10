// Pure metric helpers. Rule: sum raw counts first, then divide. Never average
// per-row rates, and never sum reach across ads or campaigns.

export const CAMPAIGN_TYPES = ['Reach', 'Engagement', 'Traffic', 'Page Visit', 'Page Like', 'Other']

const TYPE_KEYWORDS = ['Reach', 'Engagement', 'Traffic', 'Page Visit', 'Page Like']

const OBJECTIVE_TYPES = {
  OUTCOME_AWARENESS: 'Reach',
  OUTCOME_ENGAGEMENT: 'Engagement',
  OUTCOME_TRAFFIC: 'Traffic',
}

export const RESULT_LABELS = {
  Reach: 'Reach',
  Engagement: 'Engagements',
  Traffic: 'Link clicks',
  'Page Visit': 'Profile visits',
  'Page Like': 'Page likes',
  Other: 'Engagements',
}

const RESULT_KEYS = {
  Reach: 'reach',
  Engagement: 'engagements',
  Traffic: 'linkClicks',
  'Page Visit': 'profileVisits',
  'Page Like': 'pageLikes',
  Other: 'engagements',
}

const INTERACTION_ACTIONS = ['post_reaction', 'comment', 'post', 'onsite_conversion.post_save']

export function num(value) {
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

/** Division guarded against zero/invalid denominators. Returns null when undefined. */
export function safeDiv(numerator, denominator) {
  const d = num(denominator)
  if (d <= 0) return null
  return num(numerator) / d
}

/** Turns Meta's actions array into a { action_type: count } map. */
export function actionMap(actions) {
  const map = {}
  for (const a of Array.isArray(actions) ? actions : []) {
    if (!a?.action_type) continue
    map[a.action_type] = (map[a.action_type] || 0) + num(a.value)
  }
  return map
}

/** Raw summable counts for one insights row. Reach is kept but never summed. */
export function rawFromRow(row = {}) {
  return {
    spend: num(row.spend),
    impressions: num(row.impressions),
    clicks: num(row.clicks),
    reach: num(row.reach),
    actions: actionMap(row.actions),
  }
}

/** Sums raw counts across rows. Reach is deliberately NOT summed (set to null). */
export function sumRaw(raws) {
  const total = { spend: 0, impressions: 0, clicks: 0, reach: null, actions: {} }
  for (const r of raws) {
    total.spend += num(r.spend)
    total.impressions += num(r.impressions)
    total.clicks += num(r.clicks)
    for (const [k, v] of Object.entries(r.actions || {})) {
      total.actions[k] = (total.actions[k] || 0) + num(v)
    }
  }
  return total
}

function profileVisitCount(actions) {
  let total = 0
  for (const [type, value] of Object.entries(actions)) {
    if (type.includes('profile_visit')) total += num(value)
  }
  return total
}

/**
 * Derives every displayed metric from raw counts.
 * @param {{spend:number, impressions:number, clicks:number, reach:number|null, actions:object}} raw
 * @param {{ isVideo?: boolean }} [opts]
 */
export function deriveMetrics(raw, { isVideo = true } = {}) {
  const a = raw.actions || {}
  const spend = num(raw.spend)
  const impressions = num(raw.impressions)
  const clicks = num(raw.clicks)
  const reach = raw.reach == null ? null : num(raw.reach)
  const engagements = num(a.post_engagement)
  const interactions = INTERACTION_ACTIONS.reduce((s, k) => s + num(a[k]), 0)

  return {
    spend,
    impressions,
    clicks,
    reach,
    engagements,
    interactions,
    linkClicks: num(a.link_click),
    pageLikes: num(a.like),
    postReactions: num(a.post_reaction),
    comments: num(a.comment),
    profileVisits: profileVisitCount(a),
    videoViews: isVideo ? num(a.video_view) : null,
    engagementRate: pct(safeDiv(engagements, impressions)),
    interactionRate: pct(safeDiv(interactions, reach)),
    ctr: pct(safeDiv(clicks, impressions)),
    cpm: mul(safeDiv(spend, impressions), 1000),
    cpc: safeDiv(spend, clicks),
    frequency: safeDiv(impressions, reach),
    costPerEngagement: safeDiv(spend, engagements),
  }
}

function pct(v) {
  return v == null ? null : v * 100
}
function mul(v, m) {
  return v == null ? null : v * m
}

/**
 * Campaign type: the earliest keyword (whole word, case-insensitive) in the
 * campaign name, else the objective, else Other.
 */
export function campaignType(campaignName, objective) {
  const name = String(campaignName || '')
  let best = null
  let bestIndex = Infinity
  for (const keyword of TYPE_KEYWORDS) {
    const re = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i')
    const m = re.exec(name)
    if (m && m.index < bestIndex) {
      best = keyword
      bestIndex = m.index
    }
  }
  if (best) return best
  return OBJECTIVE_TYPES[objective] || 'Other'
}

export function resultKey(type) {
  return RESULT_KEYS[type] || 'engagements'
}

export function resultFor(type, metrics) {
  return num(metrics[resultKey(type)])
}
