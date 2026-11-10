'use client'

import { useMemo, useState } from 'react'
import { Dialog, Tabs } from 'radix-ui'
import { Award, CalendarDays, ExternalLink, LayoutGrid, Sparkles, X } from 'lucide-react'
import { formatCurrency, formatDecimal, formatNumber, formatPercent, formatUnitCost } from '@/lib/format'
import AdMedia from './AdMedia'

const STATUS_STYLES = {
  ACTIVE: 'bg-success-soft text-success',
  PAUSED: 'bg-warning-soft text-warning',
  CAMPAIGN_PAUSED: 'bg-warning-soft text-warning',
  ADSET_PAUSED: 'bg-warning-soft text-warning',
  IN_PROCESS: 'bg-info-soft text-info',
  PENDING_REVIEW: 'bg-info-soft text-info',
  PREAPPROVED: 'bg-info-soft text-info',
  PENDING_BILLING_INFO: 'bg-warning-soft text-warning',
  DISAPPROVED: 'bg-danger-soft text-danger',
  WITH_ISSUES: 'bg-danger-soft text-danger',
  ARCHIVED: 'bg-neutral-soft text-muted',
  DELETED: 'bg-neutral-soft text-muted',
}

// Dots for badges shown over media, where a pale tint would lose contrast
const STATUS_DOTS = {
  ACTIVE: 'bg-emerald-400',
  PAUSED: 'bg-amber-400',
  CAMPAIGN_PAUSED: 'bg-amber-400',
  ADSET_PAUSED: 'bg-amber-400',
  PENDING_BILLING_INFO: 'bg-amber-400',
  IN_PROCESS: 'bg-indigo-300',
  PENDING_REVIEW: 'bg-indigo-300',
  PREAPPROVED: 'bg-indigo-300',
  DISAPPROVED: 'bg-red-400',
  WITH_ISSUES: 'bg-red-400',
}

const OBJECTIVE_LABELS = {
  OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_ENGAGEMENT: 'Engagement',
  OUTCOME_TRAFFIC: 'Traffic',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Sales',
  OUTCOME_APP_PROMOTION: 'App promotion',
}

const statusLabel = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
const objectiveLabel = (o) => (o ? OBJECTIVE_LABELS[o] || statusLabel(o) : '—')

function formatDate(iso, timeZone) {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function dateSpan(ad, tz) {
  const start = formatDate(ad.startTime, tz) || '—'
  const end = formatDate(ad.endTime, tz) || 'Ongoing'
  return `${start} → ${end}`
}

function resultText(ad) {
  return formatNumber(ad.result.value)
}

function cardMetrics(ad, currency) {
  const m = ad.metrics
  const list = [
    { label: 'Impressions', value: formatNumber(m.impressions) },
    { label: 'Spend', value: formatCurrency(m.spend, currency) },
    { label: 'Clicks', value: formatNumber(m.clicks) },
    { label: 'CTR', value: formatPercent(m.ctr) },
    ad.campaignType === 'Reach'
      ? { label: 'Frequency', value: formatDecimal(m.frequency) }
      : { label: 'CPC', value: formatUnitCost(m.cpc, currency) },
  ]
  if (ad.isVideo) list.push({ label: '3s views', value: formatNumber(m.videoViews) })
  return list
}

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${className}`}>
      {children}
    </span>
  )
}

function AdCard({ ad, rank, currency, timezone, onOpen }) {
  const open = () => onOpen(ad)
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${ad.title}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card outline-none transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-pop focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative">
        <AdMedia ad={ad} />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="gap-1.5 bg-black/65 text-white backdrop-blur">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[ad.status] || 'bg-slate-300'}`} aria-hidden="true" />
              {statusLabel(ad.status)}
            </Badge>
            <Badge className="bg-black/60 text-white backdrop-blur">{ad.format}</Badge>
          </div>
          {rank ? (
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-2 text-sm font-extrabold text-amber-950 shadow-pop">
              #{rank}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-bengali text-[15px] font-semibold leading-snug text-ink" title={ad.name}>
          {ad.title}
        </h3>

        <div className="flex items-center justify-between rounded-2xl bg-accent-soft px-3 py-2.5">
          <span className="text-xs font-semibold text-accent-strong">{ad.result.label}</span>
          <span className="tabular text-lg font-extrabold text-accent-strong">{resultText(ad)}</span>
        </div>

        <dl className="grid grid-cols-3 gap-x-3 gap-y-2.5">
          {cardMetrics(ad, currency).map((m) => (
            <div key={m.label} className="min-w-0">
              <dt className="truncate text-[11px] font-medium text-faint">{m.label}</dt>
              <dd className="tabular truncate text-[13px] font-bold text-ink">{m.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3 text-[11px] text-muted">
          <span className="font-semibold">{objectiveLabel(ad.objective)}</span>
          <span className="tabular flex items-center gap-1">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            {dateSpan(ad, timezone)}
          </span>
        </div>
      </div>
    </article>
  )
}

function GroupHeader({ group, currency }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-ink">{group.type}</h3>
        <p className="text-[13px] text-muted">
          {group.count} {group.count === 1 ? 'ad' : 'ads'}
        </p>
      </div>
      <div className="flex gap-2">
        <div className="rounded-2xl border border-line bg-surface px-3.5 py-2 shadow-card">
          <div className="text-[11px] font-semibold text-faint">Spend</div>
          <div className="tabular text-sm font-bold text-ink">{formatCurrency(group.spend, currency)}</div>
        </div>
        <div className="rounded-2xl border border-accent/25 bg-accent-soft px-3.5 py-2">
          <div className="text-[11px] font-semibold text-accent-strong">{group.resultLabel}</div>
          <div className="tabular text-sm font-bold text-accent-strong">{formatNumber(group.results)}</div>
        </div>
      </div>
    </div>
  )
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{children}</div>
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className="tabular min-w-0 break-words text-right text-[13px] font-semibold text-ink">{children}</dd>
    </div>
  )
}

function AdDialog({ ad, currency, timezone, onClose }) {
  const m = ad?.metrics
  return (
    <Dialog.Root open={Boolean(ad)} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-3 top-[4dvh] bottom-[4dvh] z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-surface text-ink shadow-pop outline-none md:inset-x-6">
          {ad ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <Badge className={STATUS_STYLES[ad.status] || 'bg-neutral-soft text-muted'}>{statusLabel(ad.status)}</Badge>
                    <Badge className="bg-surface-2 text-ink">{ad.format}</Badge>
                    <Badge className="bg-accent-soft text-accent-strong">{ad.campaignType}</Badge>
                  </div>
                  <Dialog.Title className="font-bengali text-lg font-bold leading-snug">{ad.title}</Dialog.Title>
                  <Dialog.Description className="mt-0.5 truncate text-xs text-muted">{ad.name}</Dialog.Description>
                </div>
                <Dialog.Close className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>
              <div className="grid flex-1 gap-0 overflow-y-auto md:grid-cols-[1.1fr_1fr]">
                <div className="flex items-center justify-center bg-black/90 md:sticky md:top-0 md:max-h-full">
                  <AdMedia ad={ad} large />
                </div>
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between rounded-2xl bg-accent-soft px-4 py-3">
                    <span className="text-sm font-semibold text-accent-strong">{ad.result.label}</span>
                    <span className="tabular text-2xl font-extrabold text-accent-strong">{formatNumber(ad.result.value)}</span>
                  </div>
                  <dl>
                    <DetailRow label="Spend">{formatCurrency(m.spend, currency)}</DetailRow>
                    <DetailRow label="Impressions">{formatNumber(m.impressions)}</DetailRow>
                    <DetailRow label="Reach">{formatNumber(m.reach)}</DetailRow>
                    <DetailRow label="Frequency">{formatDecimal(m.frequency)}</DetailRow>
                    <DetailRow label="Clicks (all)">{formatNumber(m.clicks)}</DetailRow>
                    <DetailRow label="CTR">{formatPercent(m.ctr)}</DetailRow>
                    <DetailRow label="CPC">{formatUnitCost(m.cpc, currency)}</DetailRow>
                    <DetailRow label="CPM">{formatCurrency(m.cpm, currency)}</DetailRow>
                    <DetailRow label="Engagements">{formatNumber(m.engagements)}</DetailRow>
                    <DetailRow label="Engagement rate">{formatPercent(m.engagementRate)}</DetailRow>
                    <DetailRow label="Cost / engagement">{formatUnitCost(m.costPerEngagement, currency)}</DetailRow>
                    <DetailRow label="Post interactions">{formatNumber(m.interactions)}</DetailRow>
                    <DetailRow label="Interaction rate">{formatPercent(m.interactionRate)}</DetailRow>
                    <DetailRow label="Link clicks">{formatNumber(m.linkClicks)}</DetailRow>
                    {m.pageLikes > 0 ? <DetailRow label="Page likes">{formatNumber(m.pageLikes)}</DetailRow> : null}
                    {m.profileVisits > 0 ? <DetailRow label="Profile visits">{formatNumber(m.profileVisits)}</DetailRow> : null}
                    {ad.isVideo ? <DetailRow label="3s video views">{formatNumber(m.videoViews)}</DetailRow> : null}
                  </dl>
                  <dl className="mt-5 rounded-2xl bg-surface-2 px-4 py-1">
                    <DetailRow label="Campaign">{ad.campaignName}</DetailRow>
                    <DetailRow label="Ad set">{ad.adsetName || '—'}</DetailRow>
                    <DetailRow label="Objective">{objectiveLabel(ad.objective)}</DetailRow>
                    <DetailRow label="Dates">{dateSpan(ad, timezone)}</DetailRow>
                    <DetailRow label="Ad ID">{ad.id}</DetailRow>
                  </dl>
                  {ad.permalink ? (
                    <a
                      href={ad.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
                    >
                      View on Facebook <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function Creatives({ data }) {
  const { ads, tabs, groups, topContent, account, range } = data
  const currency = account.currency
  const timezone = account.timezone
  const [selected, setSelected] = useState(null)
  const byId = useMemo(() => new Map(ads.map((a) => [a.id, a])), [ads])
  const pick = (ids) => ids.map((id) => byId.get(id)).filter(Boolean)

  const card = (ad, rank) => (
    <AdCard key={ad.id} ad={ad} rank={rank} currency={currency} timezone={timezone} onOpen={setSelected} />
  )

  return (
    <section aria-labelledby="creatives-heading" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="creatives-heading" className="text-xl font-bold tracking-tight text-ink">
            Ad creatives
          </h2>
          <p className="text-[13px] text-muted">Sorted by spend · click a card for full details</p>
        </div>
      </div>

      {ads.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={range.future ? 'This range has not started yet' : 'No ads delivered in this range'}
          body={
            range.future
              ? 'Pick a range that starts today or earlier to see ad results.'
              : 'No ads spent or delivered impressions between these dates. Try a wider range.'
          }
        />
      ) : (
        <Tabs.Root defaultValue="all" className="space-y-6">
          <Tabs.List
            aria-label="Filter creatives"
            className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            {tabs.map((t) => (
              <Tabs.Trigger
                key={t.key}
                value={t.key}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-muted shadow-card outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent data-[state=active]:border-transparent data-[state=active]:bg-ink data-[state=active]:text-bg"
              >
                {t.key === 'top' ? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {t.label}
                <span className="tabular rounded-full bg-surface-2 px-1.5 py-px text-[11px] text-muted">{t.count}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="all" className="space-y-10 outline-none">
            {groups.map((g) => (
              <div key={g.type} className="space-y-4">
                <GroupHeader group={g} currency={currency} />
                <Grid>{pick(g.adIds).map((a) => card(a))}</Grid>
              </div>
            ))}
          </Tabs.Content>

          <Tabs.Content value="top" className="space-y-4 outline-none">
            {topContent.length ? (
              <>
                <p className="text-[13px] text-muted">
                  The {topContent.length === 1 ? 'Engagement ad' : `${topContent.length} Engagement ads`} with the lowest cost per engagement.
                </p>
                <Grid>{pick(topContent).map((a, i) => card(a, i + 1))}</Grid>
              </>
            ) : (
              <EmptyState
                icon={Award}
                title="No top content yet"
                body="Top Content ranks Engagement campaign ads by cost per engagement. None delivered engagements in this range."
              />
            )}
          </Tabs.Content>

          {groups.map((g) => (
            <Tabs.Content key={g.type} value={g.type} className="space-y-4 outline-none">
              <GroupHeader group={g} currency={currency} />
              <Grid>{pick(g.adIds).map((a) => card(a))}</Grid>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}

      <AdDialog ad={selected} currency={currency} timezone={timezone} onClose={() => setSelected(null)} />
    </section>
  )
}
