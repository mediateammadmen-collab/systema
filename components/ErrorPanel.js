import { AlertTriangle, KeyRound, Timer } from 'lucide-react'

/** Expected errors (missing env, Meta API errors) rendered as UI, not thrown. */
export default function ErrorPanel({ payload }) {
  const Icon = payload.kind === 'env' ? KeyRound : payload.rateLimited ? Timer : AlertTriangle
  const title =
    payload.kind === 'env'
      ? 'Configuration needed'
      : payload.rateLimited
        ? 'Meta API rate limit reached'
        : payload.kind === 'meta'
          ? 'Meta API returned an error'
          : 'Something went wrong'

  return (
    <div role="alert" className="rounded-3xl border border-danger/25 bg-surface p-6 shadow-card sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-2">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {payload.kind === 'env' ? (
            <>
              <p className="text-sm text-muted">
                Set the following server-only environment variable{payload.missing.length > 1 ? 's' : ''} in{' '}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">.env.local</code> (or your Netlify site settings), then restart:
              </p>
              <ul className="flex flex-wrap gap-2">
                {payload.missing.map((name) => (
                  <li key={name}>
                    <code className="rounded-lg bg-danger-soft px-2 py-1 text-[13px] font-semibold text-danger">{name}</code>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="break-words text-sm text-muted">{payload.error}</p>
              {payload.code != null ? <p className="text-xs text-faint">Meta error code {payload.code}</p> : null}
              <p className="text-sm text-muted">
                {payload.rateLimited
                  ? 'Requests were retried with backoff but the limit did not clear. Wait a few minutes, then press Refresh.'
                  : 'Check the access token, its permissions and the ad account ID, then press Refresh.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
