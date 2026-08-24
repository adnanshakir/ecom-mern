"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, AlertCircle, AlertTriangle, ExternalLink, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LowStockList({ items = [], threshold = 5 }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((variant) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const productName = variant.product?.name?.toLowerCase() || "";
    const sku = variant.sku?.toLowerCase() || "";
    return productName.includes(query) || sku.includes(query);
  });

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
        <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <AlertCircle className="size-5" />
        </div>
        <p className="text-sm font-medium text-foreground">Inventory In Good Shape</p>
        <p className="text-xs">No products below threshold ({threshold}).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2.5 overflow-hidden">
      {/* Search bar — always visible when there are items */}
      {items.length > 3 && (
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Filter by SKU or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/30 focus-visible:bg-background"
          />
        </div>
      )}

      {/* Scrollable list — fills remaining card height */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground py-6">No items match &quot;{search}&quot;.</p>
        ) : (
          filteredItems.map((variant) => {
            const isOut = variant.stock === 0;
            return (
              <button
                key={variant._id}
                type="button"
                onClick={() => setSelected(variant)}
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-left text-xs transition-all hover:bg-accent/60 hover:border-border"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-[12px]">
                    {variant.product?.name || "Product"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {variant.sku}
                  </p>
                </div>

                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                    isOut
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  )}
                >
                  {isOut ? (
                    <>
                      <PackageX className="size-2.5" />
                      Out
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-2.5" />
                      {variant.stock} left
                    </>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Item Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <span>{selected.product?.name || "Inventory Item Detail"}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 text-xs sm:text-sm py-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">SKU Code</span>
                  <span className="font-mono font-medium">{selected.sku}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Stock Status</span>
                  <span
                    className={cn(
                      "font-semibold px-2 py-0.5 rounded text-xs",
                      selected.stock === 0 ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                    )}
                  >
                    {selected.stock === 0 ? "Out of stock (0)" : `${selected.stock} units remaining`}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Alert Threshold</span>
                  <span className="font-medium">{threshold} units</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  Close
                </Button>
                {selected.product?._id && (
                  <Button size="sm" asChild>
                    <Link href={`/admin/products?search=${encodeURIComponent(selected.sku)}`}>
                      Manage Product <ExternalLink className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}