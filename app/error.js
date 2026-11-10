'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

// Unexpected errors only. Expected ones (missing env, Meta API errors) are
// rendered as UI by the page, because production hides server error messages.
export default function Error({ error, retry }) {
  const digest = error instanceof Error ? error.digest : undefined
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-16 sm:px-6">
      <div role="alert" className="rounded-3xl border border-danger/25 bg-surface p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">The dashboard failed to load</h1>
        <p className="mt-2 text-sm text-muted">An unexpected error occurred. Try again in a moment.</p>
        {digest ? <p className="mt-1 text-xs text-faint">Reference: {digest}</p> : null}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </main>
  )
}
