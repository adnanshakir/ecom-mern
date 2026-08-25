"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Heart,
  ShoppingCart,
  Zap,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useVariantSelector } from "@/hooks/storefront/useVariantSelector";
import { useCart } from "@/hooks/storefront/useCart";
import { useWishlist } from "@/hooks/storefront/useWishlist";
import { formatPrice } from "@/lib/formatCurrency";
import { VariantSelector } from "@/components/storefront/products/VariantSelector";
import { QuantitySelector } from "@/components/storefront/products/QuantitySelector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductInteractiveSection({ product }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [buyNowPending, setBuyNowPending] = useState(false);

  const { optionTypes, selectedOptions, setOption, selectedVariant } = useVariantSelector(product);
  const isCustomerAuthed = useSelector((state) => state.customerAuth.status === "authenticated");

  const { addItem, isPending: isCartPending } = useCart();
  const { isWishlisted, isPending: isWishlistPending, toggle: toggleWishlist } = useWishlist(product?._id);

  const inStock = (selectedVariant?.stock || 0) > 0;
  const price = selectedVariant?.salePrice || selectedVariant?.price;
  const originalPrice = selectedVariant?.price;
  const hasSale = !!selectedVariant?.salePrice && selectedVariant.salePrice < selectedVariant.price;

  const discountPercent = hasSale ? Math.round((1 - selectedVariant.salePrice / selectedVariant.price) * 100) : null;

  const handleAddToCart = async () => {
    if (!isCustomerAuthed) {
      toast.error("Please log in to add items to your cart.");
      return;
    }
    if (!selectedVariant?._id) return;
    const result = await addItem(selectedVariant._id, quantity);
    if (result?.payload?.message) {
      toast.warning(result.payload.message);
    } else if (!result?.error) {
      toast.success("Added to cart!");
    }
  };

  const handleBuyNow = async () => {
    if (!isCustomerAuthed) {
      toast.error("Please log in to purchase items.");
      return;
    }
    if (!selectedVariant?._id) return;
    setBuyNowPending(true);
    try {
      const result = await addItem(selectedVariant._id, quantity);
      if (result?.payload?.message) {
        toast.warning(result.payload.message);
      } else if (!result?.error) {
        toast.success("Redirecting to cart...");
        router.push("/cart");
      }
    } finally {
      setBuyNowPending(false);
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
    <div className="grid gap-5 text-foreground w-full">
      {/* Title & Brand Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">{product.name}</h1>
        {product.brand && (
          <p className="text-sm font-medium text-muted-foreground">
            by <span className="text-[#033936] dark:text-emerald-400 font-semibold">{product.brand.name}</span>
          </p>
        )}
      </div>

      {/* Pricing & Stock Section */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {hasSale ? (
          <>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {formatPrice(price)}
            </span>
            <span className="text-base text-muted-foreground line-through decoration-slate-400">
              MRP {formatPrice(originalPrice)}
            </span>
            {discountPercent && (
              <span className="rounded-md bg-red-500 px-1.5 py-1 text-xs font-bold text-white uppercase tracking-wider shadow-xs">
                {discountPercent}% OFF
              </span>
            )}
          </>
        ) : (
          <span className="text-2xl sm:text-3xl font-bold tracking-tight">{formatPrice(price)}</span>
        )}

        <span
          className={cn(
            "ml-auto rounded-full px-3 py-1 text-xs font-semibold tracking-wide border",
            inStock
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800"
          )}
        >
          {inStock ? "In stock" : "Out of stock"}
        </span>
      </div>

      {/* Product Description snippet */}
      {product.description && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{product.description}</p>
      )}

      {/* Variant Selector */}
      <VariantSelector optionTypes={optionTypes} selectedOptions={selectedOptions} onSelect={setOption} />

      {/* Action Controls (Quantity + Add to Cart + Wishlist in Row 1, Buy Now in Row 2) */}
      <div className="space-y-3 pt-2">
        {/* Row 1: Quantity + Add To Cart + Wishlist */}
        <div className="flex items-center gap-3">
          {/* Quantity Selector matching height */}
          <div className="flex h-11 items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-background px-1 shrink-0">
            <QuantitySelector value={quantity} onChange={setQuantity} max={selectedVariant?.stock || 1} />
          </div>

          {/* Add To Cart Button */}
          <Button
            variant="outline"
            className="flex-1 h-11 border-[#033936] text-[#033936] hover:bg-[#033936]/10 font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
            disabled={!inStock || isCartPending(selectedVariant?._id) || buyNowPending}
            onClick={handleAddToCart}
          >
            {isCartPending(selectedVariant?._id) && !buyNowPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingCart className="size-4 mr-1.5" />
            )}
            ADD TO CART
          </Button>

          {/* Wishlist Button */}
          <button
            type="button"
            disabled={isWishlistPending}
            onClick={handleToggleWishlist}
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-background transition-all duration-200 hover:bg-muted active:scale-95",
              isWishlisted && "border-rose-500 bg-rose-50 dark:bg-rose-950/40"
            )}
          >
            <Heart
              className={cn(
                "size-5 stroke-[2]",
                isWishlisted ? "fill-rose-500 text-rose-500" : "text-slate-700 dark:text-slate-300"
              )}
            />
          </button>
        </div>

        {/* Row 2: Full-Width Buy Now Button matching height */}
        <Button
          className="w-full h-11 bg-[#033936] hover:bg-[#022826] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 rounded-lg"
          disabled={!inStock || isCartPending(selectedVariant?._id) || buyNowPending}
          onClick={handleBuyNow}
        >
          {buyNowPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Zap className="size-4 fill-current" />
              <span>BUY NOW</span>
            </>
          )}
        </Button>
      </div>

      {/* Value Proposition Badges */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3.5 border border-slate-200/80 dark:border-slate-800 text-center">
        <div className="flex flex-col items-center gap-1">
          <ShieldCheck className="size-5 text-[#033936] dark:text-emerald-400" />
          <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200">
            Secure Checkout
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 border-x border-slate-200 dark:border-slate-800 px-1">
          <RotateCcw className="size-5 text-[#033936] dark:text-emerald-400" />
          <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200">Easy Returns</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CheckCircle2 className="size-5 text-[#033936] dark:text-emerald-400" />
          <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200">
            Quality Checked
          </span>
        </div>
      </div>
    </div>
  );
}
