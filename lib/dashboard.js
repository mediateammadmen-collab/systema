import 'server-only'
import { connection } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import { adAccountId, EnvError, missingEnv } from './env.js'
import { fetchNodes, getVideoSources, isRateLimitError, metaGet, metaGetAll, MetaApiError } from './meta.js'
import { CAMPAIGN_TYPES, RESULT_LABELS, campaignType, deriveMetrics, rawFromRow, resultFor, sumRaw } from './metrics.js'
import { describeRange, resolveRange, todayInTimeZone } from './dates.js'
import { parseAdName } from './adName.js'

const SUMMARY_FIELDS = 'spend,impressions,reach,clicks,actions'
const AD_FIELDS =
  'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,objective,spend,impressions,reach,clicks,actions'
const AD_DETAIL_FIELDS =
  'name,effective_status,adset{name,start_time,end_time},creative{id,object_type,video_id,thumbnail_url,image_url,effective_object_story_id,object_story_spec,asset_feed_spec}'

function timeParams(range) {
  return range.lifetime ? { date_preset: 'maximum' } : { time_range: { since: range.since, until: range.until } }
}

function insightsParams(range, extra) {
  return { ...timeParams(range), use_unified_attribution_setting: 'true', ...extra }
}

// ---------------------------------------------------------------------------
// Shared context: env check, account, "today" in account timezone, range
// ---------------------------------------------------------------------------

async function getAccount() {
  const a = await metaGet(adAccountId(), { fields: 'name,currency,timezone_name' })
  return { id: a.id, name: a.name, currency: a.currency || 'USD', timezone: a.timezone_name || 'UTC' }
}

async function context(params) {
  const missing = missingEnv()
  if (missing.length) throw new EnvError(missing)
  const account = await getAccount()
  await connection() // must precede new Date(), or prerendering fails
  const today = todayInTimeZone(account.timezone)
  const range = resolveRange(params, today)
  return {
    account,
    today,
    range: { ...range, description: describeRange(range), timezone: account.timezone, today },
  }
}

/** Converts thrown errors into renderable/serialisable error objects. */
export function toErrorPayload(err) {
  // Let Next.js handle its own control-flow errors (e.g. prerender aborts)
  unstable_rethrow(err)
  if (err instanceof EnvError || err?.name === 'EnvError') {
    return { kind: 'env', status: 500, error: err.message, missing: err.missing || [] }
  }
  if (err instanceof MetaApiError || err?.name === 'MetaApiError') {
    const rateLimited = isRateLimitError(err)
    return {
      kind: 'meta',
      status: rateLimited ? 429 : 502,
      error: err.message,
      code: err.code ?? null,
      rateLimited,
    }
  }
  console.error('[dashboard] Unexpected error:', err?.message || err)
  return { kind: 'unknown', status: 500, error: 'Unexpected server error while loading Meta data.' }
}

// ---------------------------------------------------------------------------
// Insights (summary)
// ---------------------------------------------------------------------------

function buildSummary(row) {
  const m = deriveMetrics(rawFromRow(row || {}))
  const secondary = [
    { key: 'frequency', label: 'Frequency', value: m.frequency, kind: 'decimal', always: true },
    { key: 'engagementRate', label: 'Engagement rate', value: m.engagementRate, kind: 'percent', always: true },
    { key: 'interactions', label: 'Post interactions', value: m.interactions, kind: 'number', always: true },
    { key: 'interactionRate', label: 'Interaction rate', value: m.interactionRate, kind: 'percent', always: true },
    { key: 'linkClicks', label: 'Link clicks', value: m.linkClicks, kind: 'number', always: true },
    { key: 'ctr', label: 'CTR', value: m.ctr, kind: 'percent', always: true },
    { key: 'cpm', label: 'CPM', value: m.cpm, kind: 'currency', always: true },
    { key: 'pageLikes', label: 'Page likes', value: m.pageLikes, kind: 'number' },
    { key: 'postReactions', label: 'Post reactions', value: m.postReactions, kind: 'number' },
    { key: 'comments', label: 'Comments', value: m.comments, kind: 'number' },
    { key: 'profileVisits', label: 'Profile visits', value: m.profileVisits, kind: 'number' },
  ].filter((s) => s.always || s.value > 0)
  return { metrics: m, secondary }
}

export async function getInsights(params) {
  const { account, range } = await context(params)
  if (range.future) return { account, range, summary: buildSummary(null) }
  const res = await metaGet(`${adAccountId()}/insights`, insightsParams(range, { level: 'account', fields: SUMMARY_FIELDS }))
  return { account, range, summary: buildSummary(res.data?.[0]) }
}

// ---------------------------------------------------------------------------
// Creatives
// ---------------------------------------------------------------------------

function videoIdOf(creative) {
  return (
    creative?.video_id ||
    creative?.object_story_spec?.video_data?.video_id ||
    creative?.asset_feed_spec?.videos?.[0]?.video_id ||
    null
  )
}

function creativeFormat(creative, isVideo) {
  if (isVideo) return 'Video'
  if (creative?.object_story_spec?.link_data?.child_attachments?.length) return 'Carousel'
  return 'Image'
}

function storyLink(creative) {
  const id = creative?.effective_object_story_id
  return id ? `https://www.facebook.com/${id}` : null
}

function emptyCreatives(account, range) {
  return {
    account,
    range,
    ads: [],
    tabs: [
      { key: 'all', label: 'All', count: 0 },
      { key: 'top', label: 'Top Content', count: 0 },
    ],
    groups: [],
    topContent: [],
    totals: { spend: 0, count: 0 },
  }
}

export async function getCreatives(params) {
  const { account, range } = await context(params)
  if (range.future) return emptyCreatives(account, range)

  // 1) Date-ranged ad insights — the ONLY source of ad IDs we fetch details for.
  const rows = await metaGetAll(`${adAccountId()}/insights`, insightsParams(range, { level: 'ad', fields: AD_FIELDS }))
  if (!rows.length) return emptyCreatives(account, range)

  const adIds = rows.map((r) => r.ad_id)
  const details = await fetchNodes(adIds, AD_DETAIL_FIELDS)

  // 2) Hi-res creative thumbnails (nested thumbnail_url is only 64x64)
  const creativeIds = Object.values(details)
    .map((d) => d?.creative?.id)
    .filter(Boolean)
  const thumbs = creativeIds.length
    ? await fetchNodes(creativeIds, 'thumbnail_url', { thumbnail_width: '1200', thumbnail_height: '1200' })
    : {}

  // 3) Videos: owner Page + permalink, then playable source via the Page token
  const videoIds = Object.values(details).map((d) => videoIdOf(d?.creative)).filter(Boolean)
  const videoNodes = videoIds.length ? await fetchNodes(videoIds, 'picture,from,permalink_url') : {}
  const videoRefs = Object.values(details)
    .map((d) => {
      const videoId = videoIdOf(d?.creative)
      if (!videoId) return null
      const pageId = videoNodes[videoId]?.from?.id || d?.creative?.object_story_spec?.page_id || null
      return { videoId, pageId }
    })
    .filter(Boolean)
  const sources = videoRefs.length ? await getVideoSources(videoRefs) : {}

  // 4) Build ad objects
  const ads = rows.map((row) => {
    const d = details[row.ad_id] && !details[row.ad_id].__error ? details[row.ad_id] : {}
    const creative = d.creative || {}
    const videoId = videoIdOf(creative)
    const isVideo = Boolean(videoId) || creative.object_type === 'VIDEO'
    const type = campaignType(row.campaign_name, row.objective)
    const metrics = deriveMetrics(rawFromRow(row), { isVideo })
    const { title, format } = parseAdName(row.ad_name || d.name)
    const vNode = videoId ? videoNodes[videoId] : null
    const vSrc = videoId ? sources[videoId] : null
    const hiRes = thumbs[creative.id]?.thumbnail_url
    const image = hiRes || creative.image_url || vNode?.picture || creative.thumbnail_url || null
    const videoPermalink = vNode?.permalink_url
      ? `https://www.facebook.com${vNode.permalink_url.startsWith('/') ? '' : '/'}${vNode.permalink_url}`
      : null

    return {
      id: row.ad_id,
      name: row.ad_name || d.name || '',
      title,
      format: format || creativeFormat(creative, isVideo),
      status: d.effective_status || 'UNKNOWN',
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      campaignType: type,
      objective: row.objective || null,
      adsetName: row.adset_name || d.adset?.name || null,
      startTime: d.adset?.start_time || null,
      endTime: d.adset?.end_time || null,
      isVideo,
      image,
      video: isVideo
        ? { source: vSrc?.source || null, poster: hiRes || vSrc?.picture || vNode?.picture || image, permalink: videoPermalink }
        : null,
      permalink: videoPermalink || storyLink(creative),
      metrics,
      result: { label: RESULT_LABELS[type], value: resultFor(type, metrics) },
    }
  })
  ads.sort((a, b) => b.metrics.spend - a.metrics.spend)

  // 5) Groups per campaign type. Reach is NEVER summed: Reach groups get one
  //    account-level, de-duplicated call filtered to their campaign IDs.
  const groups = []
  for (const type of CAMPAIGN_TYPES) {
    const groupAds = ads.filter((a) => a.campaignType === type)
    if (!groupAds.length) continue
    const raw = sumRaw(groupAds.map((a) => a.metrics))
    let results
    if (type === 'Reach') {
      const campaignIds = [...new Set(groupAds.map((a) => a.campaignId))]
      const res = await metaGet(
        `${adAccountId()}/insights`,
        insightsParams(range, {
          level: 'account',
          fields: 'reach',
          filtering: [{ field: 'campaign.id', operator: 'IN', value: campaignIds }],
        }),
      )
      results = Number(res.data?.[0]?.reach || 0)
    } else {
      results = groupAds.reduce((s, a) => s + a.result.value, 0)
    }
    groups.push({
      type,
      count: groupAds.length,
      spend: raw.spend,
      results,
      resultLabel: type === 'Reach' ? 'Unique reach' : RESULT_LABELS[type],
      adIds: groupAds.map((a) => a.id),
    })
  }

  // Top Content: 3 Engagement ads with the lowest cost per engagement
  const topContent = ads
    .filter((a) => a.campaignType === 'Engagement' && a.metrics.costPerEngagement != null)
    .sort((a, b) => a.metrics.costPerEngagement - b.metrics.costPerEngagement)
    .slice(0, 3)
    .map((a) => a.id)

  const tabs = [
    { key: 'all', label: 'All', count: ads.length },
    { key: 'top', label: 'Top Content', count: topContent.length },
    ...groups.map((g) => ({ key: g.type, label: g.type, count: g.count })),
  ]

  return {
    account,
    range,
    ads,
    tabs,
    groups,
    topContent,
    totals: { spend: ads.reduce((s, a) => s + a.metrics.spend, 0), count: ads.length },
  }
}
