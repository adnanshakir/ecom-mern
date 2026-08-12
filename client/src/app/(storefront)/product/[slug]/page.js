"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, ImageIcon, Heart, ShoppingCart } from "lucide-react";

import { usePublicProduct } from "@/hooks/storefront/usePublicProduct";
import { useVariantSelector } from "@/hooks/storefront/useVariantSelector";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { VariantSelector } from "@/components/storefront/VariantSelector";
import { QuantitySelector } from "@/components/storefront/QuantitySelector";
import { RelatedProducts } from "@/components/storefront/RelatedProducts";
import { Breadcrumbs } from "@/components/storefront/Breadcrumbs";
import { Button } from "@/components/ui/button";

export default function ProductPage() {
  const { slug } = useParams();
  const { product, loading, error } = usePublicProduct(slug);
  const [quantity, setQuantity] = useState(1);

  const { optionTypes, selectedOptions, setOption, selectedVariant } =
    useVariantSelector(product);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading...
      </div>
    );
  }

  if (error || !product) {
    return <p className="py-20 text-center text-sm text-destructive">{error || "Not found"}</p>;
  }

  const inStock = (selectedVariant?.stock || 0) > 0;
  const price = selectedVariant?.salePrice || selectedVariant?.price;
  const hasSale = !!selectedVariant?.salePrice;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: product.category?.name, href: `/category/${product.category?._id || ""}` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[440px_1fr]">
        <ProductGallery
          productImages={product.images}
          variantImages={selectedVariant?.images}
        />

        <div className="grid gap-5">
          <div>
            <h1 className="text-xl font-semibold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">{product.brand?.name}</p>
          </div>

          <div className="flex items-baseline gap-2">
            {hasSale ? (
              <>
                <span className="text-2xl font-semibold">${price}</span>
                <span className="text-sm text-muted-foreground line-through">
                  ${selectedVariant.price}
                </span>
              </>
            ) : (
              <span className="text-2xl font-semibold">{price != null ? `$${price}` : "—"}</span>
            )}
          </div>

          <span
            className={
              inStock
                ? "w-fit rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500"
                : "w-fit rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500"
            }
          >
            {inStock ? `${selectedVariant.stock} in stock` : "Out of stock"}
          </span>

          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}

          <VariantSelector
            optionTypes={optionTypes}
            selectedOptions={selectedOptions}
            onSelect={setOption}
          />

          <div className="grid gap-2">
            <span className="text-sm font-medium">Quantity</span>
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              max={selectedVariant?.stock || 1}
            />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" disabled={!inStock} title="Cart isn't wired up yet">
              <ShoppingCart className="size-4" />
              Add to cart
            </Button>
            <Button variant="outline" size="icon" title="Wishlist isn't wired up yet">
              <Heart className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <RelatedProducts categoryId={product.category?._id} excludeProductId={product._id} />
    </div>
  );
}