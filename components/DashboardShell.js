'use client'

import { createContext, useCallback, useContext, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { refreshMetaData } from '@/app/actions'

const PendingContext = createContext({ isPending: false, navigate: () => {}, refresh: () => {} })

export function usePending() {
  return useContext(PendingContext)
}

/**
 * One shared transition for filter changes and Refresh, so the whole page
 * shows a single loading state: a top progress bar plus dimmed content.
 */
export default function DashboardShell({ children }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback(
    (params) => {
      const qs = new URLSearchParams(params).toString()
      startTransition(() => {
        router.replace(qs ? `/?${qs}` : '/', { scroll: false })
      })
    },
    [router],
  )

  const refresh = useCallback(() => {
    startTransition(async () => {
      await refreshMetaData()
    })
  }, [])

  const value = useMemo(() => ({ isPending, navigate, refresh }), [isPending, navigate, refresh])

  return (
    <PendingContext.Provider value={value}>
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden transition-opacity duration-300 ${isPending ? 'opacity-100' : 'opacity-0'}`}
        role="progressbar"
        aria-hidden={!isPending}
        aria-label="Loading"
      >
        <div className="h-full w-full origin-left animate-progress bg-gradient-to-r from-accent via-accent-2 to-accent" />
      </div>
      {children}
    </PendingContext.Provider>
  )
}

/** Content that dims while the shared transition is pending. */
export function PendingArea({ children, className = '' }) {
  const { isPending } = usePending()
  return (
    <div
      aria-busy={isPending}
      className={`transition-[opacity,filter] duration-300 ${isPending ? 'pointer-events-none opacity-50 saturate-50' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
