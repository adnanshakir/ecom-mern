"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LowStockList({ items, threshold }) {
  const [selected, setSelected] = useState(null);

  if (!items?.length) {
    return <p className="text-sm text-muted-foreground">No low stock items.</p>;
  }

  return (
    <>
      <ul className="grid gap-1">
        {items.map((variant) => {
          const isOut = variant.stock === 0;
          return (
            <li key={variant._id}>
              <button
                type="button"
                onClick={() => setSelected(variant)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <div className="min-w-0 truncate">
                  {variant.product?.name || "—"}
                  <span className="text-muted-foreground"> · {variant.sku}</span>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    isOut ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                  )}
                >
                  {isOut ? "Out of stock" : `${variant.stock} left`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.product?.name || "Variant"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">SKU</span>
                  <span className="font-mono text-xs">{selected.sku}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current stock</span>
                  <span className={selected.stock === 0 ? "text-red-500" : "text-amber-500"}>
                    {selected.stock}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Low stock threshold</span>
                  <span>{threshold}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}