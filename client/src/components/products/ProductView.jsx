"use client";

import { useState } from "react";
import { ImageIcon, Star } from "lucide-react";
import { StatusBadge } from "@/components/products/StatusBadge";
import { cn } from "@/lib/utils";

export function ProductView({ product }) {
  const [activeImage, setActiveImage] = useState(0);
  const images = product.images || [];
  const variants = product.variants || [];
  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="grid gap-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
          {images[activeImage] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[activeImage].url}
              alt={product.name}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-10 text-muted-foreground" />
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((img, i) => (
              <button
                key={img.fileId || i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "size-14 overflow-hidden rounded-md border-2",
                  activeImage === i ? "border-primary" : "border-transparent"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold">{product.name}</h2>
            {product.featured && (
              <Star className="size-4 shrink-0 fill-amber-500 text-amber-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {product.brand?.name} · {product.category?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={product.status} />
        </div>

        {product.description && (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        )}

        {/* Seller-only info, clearly separated from customer-facing content above */}
        <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Seller info
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Variants</span>
            <span>{variants.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total stock</span>
            <span className={totalStock === 0 ? "text-red-500" : ""}>{totalStock}</span>
          </div>
        </div>

        <div className="grid gap-2">
          {variants.map((v) => (
            <div
              key={v._id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs text-muted-foreground">{v.sku}</span>
              <span>${v.salePrice ?? v.price}</span>
              <span className={v.stock === 0 ? "text-red-500" : "text-muted-foreground"}>
                {v.stock === 0 ? "Out of stock" : `${v.stock} in stock`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}