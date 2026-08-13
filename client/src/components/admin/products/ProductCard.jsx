"use client";

import Link from "next/link";
import { ImageIcon, Star, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/admin/products/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  categoryName,
  brandName,
  canWrite,
  onDelete,
  selectable,
  selected,
  onToggleSelect,
}) {
  const thumbnail = product.images?.[0]?.url;

  return (
    <Card className="group relative overflow-hidden p-0 transition-all">
      {selectable && (
        <div
          className="absolute left-2 top-2 z-10 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(product._id)}
            className="size-4.5 cursor-pointer rounded border-primary text-primary accent-primary focus:ring-primary"
          />
        </div>
      )}

      <Link href={`/admin/products/${product._id}`} className="block">
        <div className="relative aspect-square bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={product.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground" />
            </div>
          )}

          <div className="absolute bottom-2 right-2">
            <StatusBadge status={product.status} className="bg-background/90 shadow-sm" />
          </div>

          {product.featured && (
            <div className={cn("absolute top-2 rounded-full bg-background/90 p-1 shadow-sm", selectable ? "left-8" : "left-2")}>
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="line-clamp-1 text-sm font-medium" title={product.name}>
            {product.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {brandName} · {categoryName}
          </p>
        </div>
      </Link>

      {canWrite && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 size-7 bg-background/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            onDelete(product);
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </Card>
  );
}