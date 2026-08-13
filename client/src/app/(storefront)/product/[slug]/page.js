"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Heart, ShoppingCart } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { usePublicProduct } from "@/hooks/storefront/usePublicProduct";
import { useVariantSelector } from "@/hooks/storefront/useVariantSelector";
import { useCart } from "@/hooks/storefront/useCart";
import { useWishlist } from "@/hooks/storefront/useWishlist";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { VariantSelector } from "@/components/storefront/VariantSelector";
import { QuantitySelector } from "@/components/storefront/QuantitySelector";
import { RelatedProducts } from "@/components/storefront/RelatedProducts";
import { Breadcrumbs } from "@/components/storefront/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProductPage() {
  const { slug } = useParams();
  const { product, loading, error } = usePublicProduct(slug);
  const [quantity, setQuantity] = useState(1);

  const { optionTypes, selectedOptions, setOption, selectedVariant } = useVariantSelector(product);

  // Auth guard — only dispatch cart/wishlist actions when logged in
  const isCustomerAuthed = useSelector(
    (state) => state.customerAuth.status === "authenticated"
  );

  const { addItem, isPending: isCartPending } = useCart();
  const { isWishlisted, isPending: isWishlistPending, toggle: toggleWishlist } = useWishlist(
    product?._id
  );

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

  const handleAddToCart = async () => {
    if (!isCustomerAuthed) {
      toast.error("Please log in to add items to your cart.");
      return;
    }
    if (!selectedVariant?._id) return;
    const result = await addItem(selectedVariant._id, quantity);
    if (result?.payload?.message) {
      // Backend clamped the quantity — surface it
      toast.warning(result.payload.message);
    } else if (!result?.error) {
      toast.success("Added to cart!");
    }
  };

  const handleToggleWishlist = () => {
    if (!isCustomerAuthed) {
      toast.error("Please log in to save items to your wishlist.");
      return;
    }
    toggleWishlist();
  };

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
        <ProductGallery productImages={product.images} variantImages={selectedVariant?.images} />

        <div className="grid gap-5">
          <div>
            <h1 className="text-xl font-semibold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">{product.brand?.name}</p>
          </div>

          <div className="flex items-baseline gap-2">
            {hasSale ? (
              <>
                <span className="text-2xl font-semibold">${price}</span>
                <span className="text-sm text-muted-foreground line-through">${selectedVariant.price}</span>
              </>
            ) : (
              <span className="text-2xl font-semibold">{price != null ? `$${price}` : "—"}</span>
            )}
          </div>

          <span
            className={cn(
              "w-fit h-fit rounded-full px-3 py-1 text-xs font-medium",
              inStock
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
            )}
          >
            {inStock ? "In stock" : "Out of stock"}
          </span>

          {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}

          <VariantSelector optionTypes={optionTypes} selectedOptions={selectedOptions} onSelect={setOption} />

          <div className="grid gap-2">
            <span className="text-sm font-medium">Quantity</span>
            <QuantitySelector value={quantity} onChange={setQuantity} max={selectedVariant?.stock || 1} />
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={!inStock || isCartPending(selectedVariant?._id)}
              onClick={handleAddToCart}
            >
              {isCartPending(selectedVariant?._id) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShoppingCart className="size-4" />
              )}
              Add to cart
            </Button>

            <Button
              variant="outline"
              size="icon"
              disabled={isWishlistPending}
              onClick={handleToggleWishlist}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={cn("size-4", isWishlisted && "fill-current text-rose-500")}
              />
            </Button>
          </div>
        </div>
      </div>

      <RelatedProducts categoryId={product.category?._id} excludeProductId={product._id} />
    </div>
  );
}
