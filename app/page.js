import { Suspense } from 'react'
import { CalendarClock, Globe2, Info } from 'lucide-react'
import { getCreatives, getInsights, toErrorPayload } from '@/lib/dashboard'
import DashboardShell, { PendingArea } from '@/components/DashboardShell'
import Filters from '@/components/Filters'
import { HeadlineMetrics, SecondaryMetrics } from '@/components/Metrics'
import Creatives from '@/components/Creatives'
import ErrorPanel from '@/components/ErrorPanel'
import { DashboardSkeleton } from '@/components/Skeletons'

export default function Page({ searchParams }) {
  return (
    <DashboardShell>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard searchParams={searchParams} />
        </Suspense>
      </main>
    </DashboardShell>
  )
}

async function Dashboard({ searchParams }) {
  const params = await searchParams
  let insights
  let creatives
  try {
    ;[insights, creatives] = await Promise.all([getInsights(params), getCreatives(params)])
  } catch (err) {
    const payload = toErrorPayload(err)
    return (
      <div className="space-y-6">
        <Title />
        <ErrorPanel payload={payload} />
      </div>
    )
  }

  const { account, range, summary } = insights

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Title />
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="font-semibold text-ink">{range.label}</span>
          <span className="tabular flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {range.description}
          </span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="h-4 w-4" aria-hidden="true" />
            {account.timezone}
          </span>
        </p>
      </div>

      <Filters key={`${range.key}:${range.since}:${range.until}`} range={range} />

      {range.future ? (
        <Notice>
          This range starts in the future ({range.description}), so Meta has no data for it yet. Pick a range that
          starts today or earlier.
        </Notice>
      ) : null}
      {range.clamped ? <Notice>The end date was in the future, so the range now ends today ({range.today}).</Notice> : null}

      <PendingArea className="space-y-10">
        <section aria-label="Summary metrics" className="space-y-4">
          <HeadlineMetrics metrics={summary.metrics} currency={account.currency} />
          <SecondaryMetrics items={summary.secondary} currency={account.currency} />
        </section>
        <Creatives data={creatives} />
      </PendingArea>
    </div>
  )
}

function Title() {
  return <h1 className="text-[28px] font-extrabold tracking-tight text-ink sm:text-[34px]">Performance overview</h1>
}

function Notice({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}
