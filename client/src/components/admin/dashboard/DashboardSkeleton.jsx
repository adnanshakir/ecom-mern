"use client";

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5 pb-8 w-full max-w-full overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-28 rounded-md bg-muted/70" />
          <div className="size-2 rounded-full bg-muted/60" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-8 w-28 rounded-md bg-muted/50" />
          <div className="h-8 w-8 rounded-md bg-muted/50" />
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="surface p-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-muted/60" />
              <div className="h-3 w-16 rounded bg-muted/50" />
            </div>
            <div className="mt-2 h-7 w-20 rounded bg-muted/70" />
            <div className="mt-2 h-3 w-28 rounded bg-muted/40" />
          </div>
        ))}
      </div>

      {/* Recent Orders Skeleton */}
      <div className="surface p-5">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-muted/60" />
            <div className="h-4 w-28 rounded bg-muted/70" />
          </div>
          <div className="h-3 w-14 rounded bg-muted/40" />
        </div>
        <div className="space-y-2 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-full rounded-lg bg-muted/30" />
          ))}
        </div>
      </div>

      {/* Low Stock & Activity Cards Skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="surface p-5">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-muted/60" />
                <div className="h-4 w-24 rounded bg-muted/70" />
              </div>
              <div className="h-3 w-12 rounded bg-muted/40" />
            </div>
            <div className="space-y-2 pt-2">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-9 w-full rounded-lg bg-muted/30" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
