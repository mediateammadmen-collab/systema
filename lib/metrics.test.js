import { test } from 'node:test'
import assert from 'node:assert/strict'
import { actionMap, campaignType, deriveMetrics, rawFromRow, resultFor, safeDiv, sumRaw } from './metrics.js'
import { describeRange, isValidDateString, resolveRange, todayInTimeZone } from './dates.js'
import { formatUnitCost, formatCurrency } from './format.js'

test('safeDiv guards zero and invalid denominators', () => {
  assert.equal(safeDiv(5, 0), null)
  assert.equal(safeDiv(5, undefined), null)
  assert.equal(safeDiv(5, '2'), 2.5)
})

test('actionMap sums duplicate action types', () => {
  assert.deepEqual(
    actionMap([
      { action_type: 'like', value: '2' },
      { action_type: 'like', value: '3' },
    ]),
    { like: 5 },
  )
})

test('rates are computed from summed raw counts, not averaged', () => {
  const rows = [
    { spend: '10', impressions: '1000', clicks: '10', reach: '800', actions: [{ action_type: 'post_engagement', value: '100' }] },
    { spend: '30', impressions: '9000', clicks: '9', reach: '5000', actions: [{ action_type: 'post_engagement', value: '90' }] },
  ]
  const total = sumRaw(rows.map(rawFromRow))
  assert.equal(total.reach, null, 'reach must never be summed')
  const m = deriveMetrics({ ...total, reach: 5200 })
  assert.equal(m.spend, 40)
  assert.equal(m.engagements, 190)
  assert.ok(Math.abs(m.engagementRate - 1.9) < 1e-9) // 190 / 10000 * 100, not avg(10%, 1%)
  assert.ok(Math.abs(m.ctr - 0.19) < 1e-9)
  assert.ok(Math.abs(m.cpm - 4) < 1e-9)
  assert.ok(Math.abs(m.frequency - 10000 / 5200) < 1e-9)
})

test('post interactions and interaction rate', () => {
  const m = deriveMetrics({
    spend: 1,
    impressions: 100,
    clicks: 0,
    reach: 50,
    actions: { post_reaction: 4, comment: 3, post: 2, 'onsite_conversion.post_save': 1, link_click: 7, like: 2, video_view: 9 },
  })
  assert.equal(m.interactions, 10)
  assert.equal(m.interactionRate, 20)
  assert.equal(m.cpc, null, 'zero clicks → no CPC')
  assert.equal(m.costPerEngagement, null)
  assert.equal(m.linkClicks, 7)
  assert.equal(m.pageLikes, 2)
  assert.equal(m.videoViews, 9)
  assert.equal(deriveMetrics({ spend: 0, impressions: 0, clicks: 0, reach: 0, actions: { video_view: 9 } }, { isVideo: false }).videoViews, null)
})

test('campaignType picks the earliest keyword, then objective, then Other', () => {
  assert.equal(campaignType('Systema | FB Reach | Sep', 'OUTCOME_ENGAGEMENT'), 'Reach')
  assert.equal(campaignType('Engagement then Reach', 'OUTCOME_AWARENESS'), 'Engagement')
  assert.equal(campaignType('Page Like drive | Reach', null), 'Page Like')
  assert.equal(campaignType('page visit boost', null), 'Page Visit')
  assert.equal(campaignType('Systema | FB Enagement | Video Views', 'OUTCOME_ENGAGEMENT'), 'Engagement')
  assert.equal(campaignType('Systema | Thruplay', 'OUTCOME_TRAFFIC'), 'Traffic')
  assert.equal(campaignType('Reached nobody', 'OUTCOME_SALES'), 'Other')
})

test('resultFor maps campaign type to its result metric', () => {
  const m = { reach: 1, engagements: 2, linkClicks: 3, profileVisits: 4, pageLikes: 5 }
  assert.deepEqual(
    ['Reach', 'Engagement', 'Traffic', 'Page Visit', 'Page Like', 'Other'].map((t) => resultFor(t, m)),
    [1, 2, 3, 4, 5, 2],
  )
})

test('formatUnitCost shows 2 significant figures below $0.01', () => {
  assert.equal(formatUnitCost(0.0034), '$0.0034')
  assert.equal(formatUnitCost(0.25), '$0.25')
  assert.equal(formatUnitCost(null), '—')
  assert.equal(formatCurrency(1234.5), '$1,234.50')
})

test('resolveRange presets (today = 2026-11-10)', () => {
  const today = '2026-11-10'
  const r = (p) => {
    const x = resolveRange(p, today)
    return [x.key, x.since, x.until]
  }
  assert.deepEqual(r({}), ['last_14', '2026-10-27', '2026-11-09'])
  assert.deepEqual(r({ range: 'today' }), ['today', today, today])
  assert.deepEqual(r({ range: 'yesterday' }), ['yesterday', '2026-11-09', '2026-11-09'])
  assert.deepEqual(r({ range: 'last_7' }), ['last_7', '2026-11-03', '2026-11-09'])
  assert.deepEqual(r({ range: 'last_30' }), ['last_30', '2026-10-11', '2026-11-09'])
  assert.deepEqual(r({ range: 'last_90' }), ['last_90', '2026-08-12', '2026-11-09'])
  assert.deepEqual(r({ range: 'this_month' }), ['this_month', '2026-11-01', today])
  assert.deepEqual(r({ range: 'last_month' }), ['last_month', '2026-10-01', '2026-10-31'])
  assert.equal(resolveRange({ range: 'lifetime' }, today).lifetime, true)
  assert.deepEqual(r({ range: 'bogus' }), ['last_14', '2026-10-27', '2026-11-09'])
})

test('resolveRange custom ranges', () => {
  const today = '2026-11-10'
  assert.deepEqual(
    resolveRange({ range: 'custom', start: '2026-10-01', end: '2026-10-15' }, today),
    { key: 'custom', label: 'Custom range', since: '2026-10-01', until: '2026-10-15', lifetime: false, future: false, clamped: false },
  )
  const clamped = resolveRange({ range: 'custom', start: '2026-11-01', end: '2026-12-31' }, today)
  assert.equal(clamped.until, today)
  assert.equal(clamped.clamped, true)
  assert.equal(resolveRange({ range: 'custom', start: '2026-12-01', end: '2026-12-31' }, today).future, true)
  // invalid → default
  assert.equal(resolveRange({ range: 'custom', start: '2026-10-15', end: '2026-10-01' }, today).key, 'last_14')
  assert.equal(resolveRange({ range: 'custom', start: '2026-02-30', end: '2026-03-01' }, today).key, 'last_14')
  assert.equal(resolveRange({ range: 'custom', start: 'abc' }, today).key, 'last_14')
})

test('date helpers', () => {
  assert.equal(isValidDateString('2026-02-29'), false)
  assert.equal(isValidDateString('2028-02-29'), true)
  assert.equal(todayInTimeZone('Asia/Dhaka', new Date('2026-11-09T19:30:00Z')), '2026-11-10')
  assert.equal(todayInTimeZone('America/Los_Angeles', new Date('2026-11-09T19:30:00Z')), '2026-11-09')
  assert.equal(describeRange({ since: '2026-10-27', until: '2026-11-09' }), 'Oct 27 – Nov 9, 2026')
})
