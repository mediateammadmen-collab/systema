export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="space-y-3">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="skeleton h-11 w-full rounded-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-[134px] rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-[74px] rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-line bg-surface">
            <div className="skeleton aspect-[4/5] rounded-none" />
            <div className="space-y-3 p-4">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-10 w-full rounded-2xl" />
              <div className="skeleton h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  )
}
