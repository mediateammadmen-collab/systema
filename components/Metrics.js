import { Eye, Heart, MousePointerClick, Users, Wallet } from 'lucide-react'
import { formatCompact, formatCurrency, formatDecimal, formatNumber, formatPercent, formatUnitCost } from '@/lib/format'

export function formatValue(kind, value, currency) {
  switch (kind) {
    case 'currency':
      return formatCurrency(value, currency)
    case 'unit':
      return formatUnitCost(value, currency)
    case 'percent':
      return formatPercent(value)
    case 'decimal':
      return formatDecimal(value)
    case 'compact':
      return formatCompact(value)
    default:
      return formatNumber(value)
  }
}

function StatCard({ icon: Icon, label, value, sub, title }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card transition-transform duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>
      <div className="tabular mt-3 text-[28px] font-bold leading-none tracking-tight text-ink sm:text-[32px]" title={title}>
        {value}
      </div>
      <div className="tabular mt-2.5 text-[13px] text-muted">{sub}</div>
    </div>
  )
}

export function HeadlineMetrics({ metrics: m, currency }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="spend-card relative overflow-hidden rounded-3xl p-5 text-white shadow-pop">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white/80">Amount spent</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        </div>
        <div className="tabular relative mt-3 text-[32px] font-extrabold leading-none tracking-tight sm:text-[36px]">
          {formatCurrency(m.spend, currency)}
        </div>
        <div className="tabular relative mt-2.5 text-[13px] text-white/80">
          CPM <span className="font-semibold text-white">{formatCurrency(m.cpm, currency)}</span>
        </div>
      </div>
      <StatCard
        icon={Users}
        label="Unique reach"
        value={formatCompact(m.reach)}
        title={formatNumber(m.reach)}
        sub={
          <>
            Frequency <span className="font-semibold text-ink">{formatDecimal(m.frequency)}</span>
          </>
        }
      />
      <StatCard
        icon={Eye}
        label="Impressions"
        value={formatCompact(m.impressions)}
        title={formatNumber(m.impressions)}
        sub={
          <>
            CTR <span className="font-semibold text-ink">{formatPercent(m.ctr)}</span>
          </>
        }
      />
      <StatCard
        icon={Heart}
        label="Engagements"
        value={formatCompact(m.engagements)}
        title={formatNumber(m.engagements)}
        sub={
          <>
            Cost / engagement <span className="font-semibold text-ink">{formatUnitCost(m.costPerEngagement, currency)}</span>
          </>
        }
      />
    </div>
  )
}

export function SecondaryMetrics({ items, currency }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {items.map((s) => (
        <div key={s.key} className="rounded-2xl border border-line bg-surface/80 px-4 py-3.5 shadow-card backdrop-blur">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            {s.key === 'linkClicks' || s.key === 'ctr' ? <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {s.label}
          </div>
          <div className="tabular mt-1.5 text-xl font-bold tracking-tight text-ink">{formatValue(s.kind, s.value, currency)}</div>
        </div>
      ))}
    </div>
  )
}
