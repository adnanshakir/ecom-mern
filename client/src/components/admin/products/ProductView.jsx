"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ImageIcon,
  Star,
  Package,
  Layers,
  Tag,
  Globe,
  Hash,
  Barcode,
  Scale,
  Coins,
  Plus,
  Minus,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/products/StatusBadge";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/formatCurrency";
import DOMPurify from "isomorphic-dompurify";

export function ProductView({ product }) {
  const variants = product.variants || [];
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const selectedVariant = variants[selectedVariantIndex] || variants[0];

  const galleryImages = useMemo(() => {
    const productImages = product.images || [];
    const variantImages = (selectedVariant?.images || []).map((img) => ({
      url: img.url,
      isVariantImage: true,
    }));
    return [...variantImages, ...productImages];
  }, [product.images, selectedVariant]);

  useEffect(() => {
    setActiveImage(0);
  }, [selectedVariantIndex]);

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

  const brandName = typeof product.brand === "object" ? product.brand?.name : null;
  const categoryName = typeof product.category === "object" ? product.category?.name : null;

  // Price calculation & discount logic
  const isDiscounted =
    selectedVariant &&
    typeof selectedVariant.salePrice === "number" &&
    selectedVariant.salePrice < selectedVariant.price;

  const discountPercent =
    isDiscounted && selectedVariant.price > 0
      ? Math.round(((selectedVariant.price - selectedVariant.salePrice) / selectedVariant.price) * 100)
      : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[440px_1fr]">
      {/* Left Column: Image Gallery */}
      <div className="grid gap-3">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-muted/40 shadow-sm">
          {galleryImages[activeImage] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={galleryImages[activeImage].url}
              alt={product.name}
              className="size-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="size-12 stroke-[1.5]" />
              <span className="text-xs">No image available</span>
            </div>
          )}

          {product.featured && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-amber-500 shadow-sm border border-amber-500/20">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              <span>Featured</span>
            </div>
          )}

          {galleryImages.length > 1 && (
            <div className="absolute bottom-3 right-3 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
              {activeImage + 1} / {galleryImages.length}
            </div>
          )}
        </div>

        {galleryImages.length > 1 && (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {galleryImages.map((img, i) => (
              <button
                key={img.fileId || img.url || i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  "relative size-16 overflow-hidden rounded-lg border-2 transition-all",
                  activeImage === i
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Product & Variant Details */}
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="grid gap-2">
          {(brandName || categoryName) && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              {brandName && <span className="text-foreground/80">{brandName}</span>}
              {brandName && categoryName && <span>·</span>}
              {categoryName && <span>{categoryName}</span>}
            </div>
          )}

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {product.name}
          </h1>

          {/* Quick Metrics Bar */}
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <StatusBadge status={product.status} />

            <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <Package className="size-3.5" />
              <span>
                {variants.length} {variants.length === 1 ? "Variant" : "Variants"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <Layers className="size-3.5" />
              <span>{totalStock} Total Stock</span>
            </div>
          </div>
        </div>

        {/* Collapsible Product Description */}
        {product.description && (
          <div className="grid gap-2 border-t border-border/40 pt-4">
            <button
              type="button"
              onClick={() => setIsDescriptionOpen((prev) => !prev)}
              className="flex items-center justify-between py-1 text-left font-semibold uppercase tracking-wider text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Description</span>
              {isDescriptionOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
            </button>
            {isDescriptionOpen && (
              <div
                className="text-sm leading-relaxed text-muted-foreground [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
              />
            )}
          </div>
        )}

        {/* Variant Selector */}
        {variants.length > 0 && (
          <div className="grid gap-2.5 border-t border-border/40 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Variant
            </span>
            <div className="flex flex-wrap gap-2">
              {variants.map((v, i) => {
                const label = v.options?.length
                  ? v.options.map((o) => o.value).join(" / ")
                  : v.sku;
                const isSelected = i === selectedVariantIndex;

                return (
                  <button
                    key={v._id}
                    onClick={() => setSelectedVariantIndex(i)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/30"
                        : "border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    {v.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.images[0].url}
                        alt=""
                        className="size-4 rounded object-cover"
                      />
                    )}
                    <span>{label}</span>
                    {v.stock === 0 && (
                      <span className="text-[10px] text-destructive">(Sold out)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Variant Highlight Details */}
        {selectedVariant && (
          <div className="grid gap-5 border-t border-border/40 pt-4">
            {/* Price & Availability Row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-baseline gap-4">
                {selectedVariant.salePrice &&
                selectedVariant.salePrice > 0 &&
                selectedVariant.salePrice !== selectedVariant.price ? (
                  (() => {
                    const regularPrice = Math.max(selectedVariant.price, selectedVariant.salePrice);
                    const salePrice = Math.min(selectedVariant.price, selectedVariant.salePrice);
                    const discountPercent =
                      regularPrice > 0 ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) : 0;

                    return (
                      <div className="flex flex-wrap items-baseline gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Sale Price
                          </span>
                          <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                            {formatPrice(salePrice)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Regular Price
                          </span>
                          <span className="text-xl font-medium text-muted-foreground line-through">
                            {formatPrice(regularPrice)}
                          </span>
                        </div>
                        {discountPercent > 0 && (
                          <span className="self-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Regular Price
                    </span>
                    <span className="text-3xl font-extrabold tracking-tight text-foreground">
                      {formatPrice(selectedVariant.price)}
                    </span>
                  </div>
                )}
              </div>

              {/* Stock Status Pill */}
              <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    selectedVariant.stock > 0 ? "bg-emerald-500" : "bg-destructive"
                  )}
                />
                <span
                  className={
                    selectedVariant.stock > 0
                      ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-destructive font-semibold"
                  }
                >
                  {selectedVariant.stock === 0
                    ? "Out of stock"
                    : `${selectedVariant.stock} in stock`}
                </span>
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/40 bg-muted/20 p-4 sm:grid-cols-4">
              <div className="grid gap-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Seller wholesale cost per item">
                  <Coins className="size-3.5 text-amber-500" />
                  <span>Cost per item</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {selectedVariant.costPrice ? formatPrice(selectedVariant.costPrice) : "—"}
                </span>
              </div>

              <div className="grid gap-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="size-3.5" />
                  <span>SKU</span>
                </div>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {selectedVariant.sku}
                </span>
              </div>

              <div className="grid gap-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Barcode className="size-3.5" />
                  <span>Barcode</span>
                </div>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {selectedVariant.barcode || "—"}
                </span>
              </div>

              <div className="grid gap-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Scale className="size-3.5" />
                  <span>Weight</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {selectedVariant.weight?.value
                    ? `${selectedVariant.weight.value} ${selectedVariant.weight.unit || "g"}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Product Attributes & Options */}
        {product.optionTypes?.length > 0 && (
          <div className="grid gap-2 border-t border-border/40 pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="size-3.5" />
              Configured Options
            </span>
            <div className="flex flex-wrap gap-3">
              {product.optionTypes.map((opt, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-background px-3 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">{opt.name}:</span>
                  <span className="text-muted-foreground">
                    {Array.isArray(opt.values) ? opt.values.join(", ") : opt.values}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product & SEO Metadata */}
        <div className="grid gap-2 border-t border-border/40 pt-4 text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Globe className="size-3.5" />
            SEO & Metadata
          </span>
          <div className="grid gap-2 text-muted-foreground">
            {product.slug && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Canonical Slug:</span>
                <span className="font-mono text-muted-foreground">/product/{product.slug}</span>
              </div>
            )}

            {product.seo?.metaTitle && (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">Custom Meta Title:</span>
                <span className="text-muted-foreground">{product.seo.metaTitle}</span>
              </div>
            )}

            {product.seo?.metaDescription && (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">Custom Meta Description:</span>
                <span className="text-muted-foreground">{product.seo.metaDescription}</span>
              </div>
            )}

            {product.seo?.keywords?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="font-medium text-foreground">Keywords:</span>
                {product.seo.keywords.map((kw, i) => (
                  <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

