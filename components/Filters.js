'use client'

import { useState } from 'react'
import { Popover } from 'radix-ui'
import { DayPicker } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { CalendarRange, RefreshCw } from 'lucide-react'
import { PRESETS } from '@/lib/dates'
import { usePending } from './DashboardShell'

function toDate(s) {
  return s ? parseISO(s) : undefined
}

export default function Filters({ range }) {
  const { isPending, navigate, refresh } = usePending()
  const today = parseISO(range.today)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(
    range.key === 'custom' ? { from: toDate(range.since), to: toDate(range.until) } : undefined,
  )

  const applyCustom = () => {
    if (!selected?.from) return
    const start = format(selected.from, 'yyyy-MM-dd')
    const end = format(selected.to || selected.from, 'yyyy-MM-dd')
    setOpen(false)
    navigate({ range: 'custom', start, end })
  }

  const pill = (active) =>
    `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent ${
      active
        ? 'bg-ink text-bg shadow-card'
        : 'text-muted hover:bg-surface-2 hover:text-ink'
    }`

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1 rounded-full border border-line bg-surface/80 p-1 shadow-card backdrop-blur">
        <div className="no-scrollbar flex gap-1 overflow-x-auto" role="group" aria-label="Date range presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={range.key === p.key}
              className={pill(range.key === p.key)}
              onClick={() => navigate({ range: p.key })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold shadow-card transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent lg:flex-none ${
                range.key === 'custom'
                  ? 'border-accent/40 bg-accent-soft text-accent-strong'
                  : 'border-line bg-surface text-ink hover:bg-surface-2'
              }`}
            >
              <CalendarRange className="h-4 w-4" aria-hidden="true" />
              {range.key === 'custom' ? 'Custom range' : 'Custom'}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              collisionPadding={16}
              className="z-50 max-h-[80dvh] w-[min(92vw,640px)] overflow-y-auto rounded-2xl border border-line bg-surface p-4 text-ink shadow-pop"
            >
              <div className="mb-2 text-sm font-semibold">Choose a date range</div>
              <DayPicker
                mode="range"
                numberOfMonths={2}
                selected={selected}
                onSelect={setSelected}
                disabled={{ after: today }}
                endMonth={today}
                defaultMonth={selected?.from || new Date(today.getFullYear(), today.getMonth() - 1, 1)}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="tabular text-xs text-muted">
                  {selected?.from
                    ? `${format(selected.from, 'MMM d, yyyy')} – ${format(selected.to || selected.from, 'MMM d, yyyy')}`
                    : 'Select a start and end date'}
                </span>
                <div className="flex gap-2">
                  <Popover.Close asChild>
                    <button type="button" className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted hover:bg-surface-2">
                      Cancel
                    </button>
                  </Popover.Close>
                  <button
                    type="button"
                    disabled={!selected?.from}
                    onClick={applyCustom}
                    className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-semibold text-accent-contrast disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink shadow-card transition-colors hover:bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>
    </div>
  )
}
