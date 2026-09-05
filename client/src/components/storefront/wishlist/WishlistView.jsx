"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import Link from "next/link";
import { Loader2, Heart, Trash2 } from "lucide-react";

import { removeFromWishlist, selectWishlistPending } from "@/redux/slices/wishlistSlice";
import { getDisplayPrice, isInStock } from "@/lib/productPrice";
import { formatPrice } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addToCart } from "@/redux/slices/cartSlice";
import { selectCartPendingVariants } from "@/redux/slices/cartSlice";
import { toast } from "sonner";

export function WishlistView() {
  const router = useRouter();
  const dispatch = useDispatch();

  const authStatus = useSelector((state) => state.customerAuth.status);
  const authReady = useSelector((state) => state.customerAuth.authReady);
  const products = useSelector((state) => state.wishlist.products);
  const wishlistStatus = useSelector((state) => state.wishlist.status);
  const pendingWishlist = useSelector(selectWishlistPending);
  const pendingCart = useSelector(selectCartPendingVariants);

  useEffect(() => {
    if (authReady && authStatus !== "authenticated") {
      router.replace("/login");
    }
  }, [authReady, authStatus, router]);

  if (!authReady || authStatus === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-[#033936]" />
      </div>
    );
  }

  if (authStatus !== "authenticated") return null;

  const handleAddToCart = async (product) => {
    const variants = product.variants || [];
    const candidate = variants.find((v) => v.stock > 0);
    if (!candidate?._id) {
      toast.error("No in-stock variant available.");
      return;
    }
    const result = await dispatch(addToCart({ variantId: candidate._id, quantity: 1 }));
    if (result?.payload?.message) {
      toast.warning(result.payload.message);
    } else if (!result?.error) {
      toast.success("Added to cart!");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold">Your Wishlist</h1>

      {wishlistStatus === "loading" && products.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-[#033936]" />
          Loading wishlist…
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <Heart className="size-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium">Your wishlist is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save products you love and find them here anytime.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => {
            const thumbnail = product.images?.[0]?.url;
            const price = getDisplayPrice(product.variants);
            const inStock = isInStock(product.variants);
            const discountedVariant = product.variants?.find(
              (v) => v.salePrice && v.salePrice < v.price
            );
            const isRemovePending = pendingWishlist.includes(product._id?.toString());
            const inStockVariant = product.variants?.find((v) => v.stock > 0);
            const isCartPending = inStockVariant && pendingCart.includes(inStockVariant._id?.toString());

            return (
              <div
                key={product._id}
                className="group relative flex flex-col rounded-lg border overflow-hidden transition-opacity"
                style={{ opacity: isRemovePending ? 0.5 : 1 }}
              >
                <Link href={`/product/${product.slug}`} className="relative block">
                  <div className="relative flex aspect-square items-center justify-center bg-muted overflow-hidden">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt={product.name}
                        className={cn("size-full object-cover", !inStock && "opacity-50")}
                      />
                    ) : (
                      <Heart className="size-8 text-muted-foreground/30" />
                    )}

                    {!inStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-950/60 dark:text-red-400">
                          Out of stock
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <Link href={`/product/${product.slug}`} className="line-clamp-1 text-sm font-medium hover:underline">
                    {product.name}
                  </Link>
                  <div className="flex items-baseline gap-1.5">
                    {discountedVariant ? (
                      <>
                        <span className="text-sm font-bold text-red-600">
                          {formatPrice(discountedVariant.salePrice)}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(discountedVariant.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold">
                        {formatPrice(price)}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-[#033936] text-white hover:bg-[#022826]"
                      disabled={!inStock || isCartPending}
                      onClick={() => handleAddToCart(product)}
                    >
                      {isCartPending ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Add to cart"
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 px-2"
                      disabled={isRemovePending}
                      onClick={() => dispatch(removeFromWishlist(product._id?.toString()))}
                      title="Remove from wishlist"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
