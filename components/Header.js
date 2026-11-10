import Link from 'next/link'
import Logo from './Logo'

export const BRAND = 'Systema'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-glass backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Logo brand={BRAND} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-bold tracking-tight text-ink">{BRAND}</div>
            <div className="truncate text-xs font-medium text-muted">Meta Ads Performance</div>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-success/25 bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-live rounded-full bg-success" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live data
        </div>
      </div>
    </header>
  )
}
