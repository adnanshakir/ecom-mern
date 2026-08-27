"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton({ showCartOnHover = false }) {
  return (
    <div className="group relative flex flex-col border rounded-sm overflow-hidden bg-card shadow-2xs">
      {/* Image Skeleton */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted/60">
        <Skeleton className="size-full rounded-none" />
      </div>

      {/* Info Skeleton */}
      <div className="grid gap-1.5 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="mt-1 flex items-center gap-1.5">
          <Skeleton className="h-5 w-20" />
        </div>
      </div>

      {/* Always-visible button skeleton if not hover-only */}
      {!showCartOnHover && (
        <div className="px-3 pb-3 pt-0">
          <Skeleton className="h-8 w-full rounded-xs" />
        </div>
      )}
    </div>
  );
}
