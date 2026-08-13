"use client";

import Link from "next/link";
import { ImageIcon, Heart, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { getDisplayPrice, isInStock } from "@/lib/productPrice";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/hooks/storefront/useWishlist";

export function ProductCard({ product }) {
  const thumbnail = product.images?.[0]?.url;
  const price = getDisplayPrice(product.variants);
  const inStock = isInStock(product.variants);

  const isCustomerAuthed = useSelector(
    (state) => state.customerAuth.status === "authenticated"
  );

  const { isWishlisted, isPending, toggle } = useWishlist(product._id);

  // Show a discount badge only when at least one variant actually has a
  // salePrice below its price — otherwise there's nothing real to show.
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

  return (
    <div className="group relative flex flex-col border">
      <Link href={`/product/${product.slug}`} className="relative block">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={product.name} className={cn("size-full object-cover", !inStock && "opacity-50")} />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" />
          )}

          {discountPercent && (
            <span className="absolute right-2 top-2 bg-red-600 px-2 py-1 text-xs font-semibold text-white">
              {discountPercent}% OFF
            </span>
          )}

          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-950/60 dark:text-red-400">
                Out of stock
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-1 p-3">
          <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
          {product.description && <p className="line-clamp-1 text-xs text-muted-foreground">{product.description}</p>}

          <div className="mt-1 flex items-baseline gap-2">
            {discountedVariant ? (
              <>
                <span className="text-base font-bold text-red-600">${discountedVariant.salePrice}</span>
                <span className="text-xs text-muted-foreground line-through">${discountedVariant.price}</span>
              </>
            ) : (
              <span className="text-base font-bold">{price != null ? `$${price}` : "—"}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Wishlist heart — visible on hover (and always when wishlisted) */}
      <button
        title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        disabled={isPending}
        className={cn(
          "absolute right-2 top-2 flex size-7 items-center justify-center bg-background/90 shadow-sm transition-opacity",
          isWishlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={handleWishlist}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Heart
            className={cn("size-4", isWishlisted && "fill-current text-rose-500")}
          />
        )}
      </button>
    </div>
  );
}
