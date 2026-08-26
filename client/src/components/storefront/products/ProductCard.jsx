"use client";

import Link from "next/link";
import { ImageIcon, Heart, Loader2, ShoppingCart, Check } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { getDisplayPrice, isInStock } from "@/lib/productPrice";
import { formatPrice } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/hooks/storefront/useWishlist";
import { useCart } from "@/hooks/storefront/useCart";

/**
 * ProductCard
 *
 * @param {object}  product          – Product object with variants, images, etc.
 * @param {boolean} showCartOnHover  – When true the Add-to-Cart button only
 *                                     appears on hover (catalog / search pages).
 *                                     When false it is always visible (homepage).
 */
export function ProductCard({ product, showCartOnHover = false }) {
  const thumbnail = product.images?.[0]?.url;
  const price = getDisplayPrice(product.variants);
  const inStock = isInStock(product.variants);

  // ----- Wishlist -----
  const isCustomerAuthed = useSelector((state) => state.customerAuth.status === "authenticated");
  const { isWishlisted, isPending: isWishlistPending, toggle } = useWishlist(product._id);

  // ----- Cart -----
  const { items, addItem, isPending: isCartPending } = useCart();

  // Pick the first in-stock variant (cheapest effective price)
  const defaultVariant =
    product.variants
      ?.filter((v) => v.stock > 0)
      .sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price))[0] || product.variants?.[0];

  const variantId = defaultVariant?._id;
  const isAddingToCart = variantId ? isCartPending(variantId) : false;
  const isAlreadyInCart = variantId
    ? items.some((item) => item.variant === variantId || item.variant?._id === variantId)
    : false;

  // Discount badge
  const discountedVariant = product.variants?.find((v) => v.salePrice && v.salePrice < v.price);
  const discountPercent = discountedVariant
    ? Math.round((1 - discountedVariant.salePrice / discountedVariant.price) * 100)
    : null;

  const handleWishlist = (e) => {
    e.preventDefault();
    if (!isCustomerAuthed) {
      toast.error("Please log in to save items to your wishlist.");
      return;
    }
    toggle();
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCustomerAuthed) {
      toast.error("Please log in to add items to your cart.");
      return;
    }
    if (!inStock || !variantId) {
      toast.error("This product is currently out of stock.");
      return;
    }
    if (isAlreadyInCart) {
      toast.info("Already in your cart.");
      return;
    }
    addItem(variantId, 1);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="group relative flex flex-col border rounded-sm overflow-hidden bg-card transition-shadow duration-200 hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="relative block">
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className={cn(
                "absolute inset-0 w-full p-2 h-full object-cover transition-transform duration-300 group-hover:scale-105",
                !inStock && "opacity-50"
              )}
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground" />
            </div>
          )}

          {/* Discount badge */}
          {discountPercent && (
            <span className="absolute left-2 top-2 rounded-sm bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              -{discountPercent}%
            </span>
          )}

          {/* Out of stock overlay */}
          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-950/60 dark:text-red-400">
                Out of stock
              </span>
            </div>
          )}

          {/* Hover-only Add to Cart button (catalog / search pages) */}
          {showCartOnHover && inStock && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className={cn(
                "absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-200",
                "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
                isAlreadyInCart ? "bg-emerald-600 text-white" : "bg-red-500 text-white hover:bg-red-600"
              )}
            >
              {isAddingToCart ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isAlreadyInCart ? (
                <>
                  <Check className="size-3.5" />
                  <span>In Cart</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="size-3.5" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Product info */}
        <div className="grid gap-1 p-3">
          <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
          {product.description && <p className="line-clamp-1 text-xs text-muted-foreground">{product.description}</p>}

          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            {discountedVariant ? (
              <>
                <span className="text-base font-bold text-red-600">{formatPrice(discountedVariant.salePrice)}</span>
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(discountedVariant.price)}
                </span>
                <span className="rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/60 dark:text-red-400">
                  {discountPercent}% OFF
                </span>
              </>
            ) : (
              <span className="text-base font-bold">{formatPrice(price)}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Always-visible Add to Cart button (homepage / non-hover mode) */}
      {!showCartOnHover && inStock && (
        <div className="px-3 pb-3 pt-0">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors duration-200",
              isAlreadyInCart ? "bg-emerald-700 text-white" : "bg-red-500 text-white hover:bg-red-600"
            )}
          >
            {isAddingToCart ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isAlreadyInCart ? (
              <>
                <Check className="size-3.5" />
                <span>In Cart</span>
              </>
            ) : (
              <>
                <ShoppingCart className="size-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Wishlist button */}
      <button
        title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        disabled={isWishlistPending}
        className={cn(
          "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 shadow-sm transition-opacity",
          isWishlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={handleWishlist}
      >
        {isWishlistPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Heart className={cn("size-4", isWishlisted && "fill-current text-rose-500")} />
        )}
      </button>
    </div>
  );
}
