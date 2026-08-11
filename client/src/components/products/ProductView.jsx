"use client";

import { useState, useMemo, useEffect } from "react";
import { ImageIcon, Star } from "lucide-react";
import { StatusBadge } from "@/components/products/StatusBadge";
import { cn } from "@/lib/utils";


export function ProductView({ product }) {
  const variants = product.variants || [];
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  const selectedVariant = variants[selectedVariantIndex];

  const galleryImages = useMemo(() => {
    const productImages = product.images || [];
    const variantImages = (selectedVariant?.images || []).map((img) => ({ url: img.url, isVariantImage: true }));
    return [...variantImages, ...productImages];
  }, [product.images, selectedVariant]);

  useEffect(() => {
    setActiveImage(0);
  }, [selectedVariantIndex]);

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <div className="grid gap-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
          {galleryImages[activeImage] ? (
            <img src={galleryImages[activeImage].url} alt={product.name} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-10 text-muted-foreground" />
          )}
        </div>

        {galleryImages.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {galleryImages.map((img, i) => (
              <button
                key={img.fileId || img.url || i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "size-14 overflow-hidden rounded-md border-2",
                  activeImage === i ? "border-primary" : "border-transparent"
                )}
              >
                <img src={img.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-semibold">{product.name}</h1>
            {product.featured && <Star className="size-5 shrink-0 fill-amber-500 text-amber-500" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {product.brand?.name} · {product.category?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={product.status} />
        </div>

        {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}

        {variants.length > 0 && (
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Variant</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v, i) => (
                <button
                  key={v._id}
                  onClick={() => setSelectedVariantIndex(i)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                    i === selectedVariantIndex ? "border-primary bg-accent" : "hover:bg-accent"
                  )}
                >
                  {v.images?.[0] && (
                    <img src={v.images[0].url} alt="" className="size-5 rounded object-cover" />
                  )}
                  <span>{v.options?.length ? v.options.map((o) => o.value).join(" / ") : v.sku}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedVariant && (
          <div className="grid gap-2 rounded-lg border p-4">
            <div className="flex items-baseline gap-2">
              {selectedVariant.salePrice ? (
                <>
                  <span className="text-lg font-semibold">${selectedVariant.salePrice}</span>
                  <span className="text-sm text-muted-foreground line-through">${selectedVariant.price}</span>
                </>
              ) : (
                <span className="text-lg font-semibold">${selectedVariant.price}</span>
              )}
            </div>

            <span
              className={cn(
                "w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                selectedVariant.stock === 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
              )}
            >
              {selectedVariant.stock === 0 ? "Out of stock" : `${selectedVariant.stock} in stock`}
            </span>

            <div className="mt-1 grid gap-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>SKU</span>
                <span className="font-mono text-xs">{selectedVariant.sku}</span>
              </div>
              {selectedVariant.barcode && (
                <div className="flex justify-between">
                  <span>Barcode</span>
                  <span className="font-mono text-xs">{selectedVariant.barcode}</span>
                </div>
              )}
              {selectedVariant.weight?.value && (
                <div className="flex justify-between">
                  <span>Weight</span>
                  <span>
                    {selectedVariant.weight.value} {selectedVariant.weight.unit}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-1 rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Seller info</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total variants</span>
            <span>{variants.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total stock (all variants)</span>
            <span className={totalStock === 0 ? "text-red-500" : ""}>{totalStock}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
