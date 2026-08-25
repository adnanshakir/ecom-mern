"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { LowStockList } from "@/components/admin/dashboard/LowStockList";

export function LowStockCard({ items = [], threshold = 5, count = 0 }) {
  return (
    <Card className="flex flex-col border-border/80 shadow-xs h-[460px] sm:h-[500px] overflow-hidden w-full min-w-0 py-0 gap-0">
      <CardHeader className="shrink-0 border-b px-4 py-3 gap-0 [.border-b]:pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Low Stock Inventory</span>
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-[11px] mt-0.5">
              Below {threshold} units
            </CardDescription>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold ${
              count > 0
                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-500"
            }`}
          >
            {count}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-3 overflow-hidden">
        <LowStockList items={items} threshold={threshold} />
      </CardContent>
      <CardFooter className="shrink-0 border-t px-4 py-2.5 [.border-t]:pt-2.5">
        <Link
          href="/admin/products"
          className="text-[11px] font-medium text-muted-foreground hover:text-primary flex items-center gap-1 ml-auto transition-colors"
        >
          All products <ArrowUpRight className="size-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}
