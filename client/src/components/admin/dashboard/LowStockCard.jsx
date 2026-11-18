"use client";

import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";
import SectionCard from "@/components/admin/dashboard/SectionCard";
import { cn } from "@/lib/utils";

export function LowStockCard({ items = [], count = 0 }) {
  const sortedItems = [...(items || [])]
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 5);

  const displayCount = count ?? items?.length ?? 0;

  return (
    <SectionCard
      title={`Low stock · ${displayCount}`}
      icon={TriangleAlert}
      action={
        <Link
          href="/admin/inventory"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>
      }
    >
      {sortedItems.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <TriangleAlert className="h-4 w-4" strokeWidth={1.75} />
          <span>No low stock items</span>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sortedItems.map((item) => (
            <div
              key={item._id || item.sku}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5"
            >
              <div className="min-w-0 pr-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.product?.name || "Product"}
                </p>
                <p className="truncate text-xs text-muted-foreground font-mono">
                  {item.sku}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                  item.stock === 0
                    ? "bg-red-500/10 text-red-400"
                    : "bg-amber-500/10 text-amber-400"
                )}
              >
                {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
