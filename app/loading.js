import { DashboardSkeleton } from '@/components/Skeletons'

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <DashboardSkeleton />
    </main>
  )
}
