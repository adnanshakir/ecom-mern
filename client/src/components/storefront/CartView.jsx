"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { Loader2, Trash2, ShoppingBag, Plus, Minus } from "lucide-react";

import { useCart } from "@/hooks/storefront/useCart";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function CartView() {
  const router = useRouter();
  const authStatus = useSelector((state) => state.customerAuth.status);
  const authReady = useSelector((state) => state.customerAuth.authReady);

  const { items, count, status, updateItem, removeItem, clear, isPending } = useCart();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (authReady && authStatus !== "authenticated") {
      router.replace("/login");
    }
  }, [authReady, authStatus, router]);

  // While auth is resolving, show a spinner
  if (!authReady || authStatus === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-[#033936]" />
      </div>
    );
  }

  if (authStatus !== "authenticated") return null;

  // Compute order totals
  const subtotal = items.reduce((sum, item) => {
    const unitPrice = item.variant?.salePrice ?? item.variant?.price ?? 0;
    return sum + unitPrice * item.quantity;
  }, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Cart</h1>
        {count > 0 && (
          <button
            onClick={() => clear()}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {status === "loading" && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-[#033936]" />
          Loading cart…
        </div>
      ) : items.length === 0 ? (
        /* ── Empty state ─────────────────────────────────────────────────── */
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <ShoppingBag className="size-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse products and add something you like.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Continue shopping</Link>
          </Button>
        </div>
      ) : (
        /* ── Cart layout ─────────────────────────────────────────────────── */
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Line items */}
          <div className="grid gap-0 divide-y divide-border rounded-lg border">
            {items.map((item) => {
              const variant = item.variant;
              const product = variant?.product;
              const unitPrice = variant?.salePrice ?? variant?.price;
              const hasSale = !!variant?.salePrice;
              const thumbnail = product?.images?.[0]?.url;
              const pending = isPending(variant?._id);

              return (
                <div
                  key={variant?._id}
                  className="flex gap-4 p-4 transition-opacity"
                  style={{ opacity: pending ? 0.6 : 1 }}
                >
                  {/* Thumbnail */}
                  <Link
                    href={`/product/${product?.slug || ""}`}
                    className="block shrink-0"
                  >
                    <div className="size-20 overflow-hidden rounded-md border bg-muted">
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt={product?.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground text-xs">
                          No image
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <Link
                      href={`/product/${product?.slug || ""}`}
                      className="line-clamp-1 text-sm font-medium hover:underline"
                    >
                      {product?.name || "Product"}
                    </Link>
                    <p className="text-xs text-muted-foreground">SKU: {variant?.sku}</p>

                    <div className="mt-auto flex items-center justify-between gap-4 pt-2">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 rounded-md border">
                        <button
                          className="flex size-7 items-center justify-center rounded-l-md hover:bg-muted disabled:opacity-40"
                          disabled={pending || item.quantity <= 1}
                          onClick={() => updateItem(variant._id, item.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          className="flex size-7 items-center justify-center rounded-r-md hover:bg-muted disabled:opacity-40"
                          disabled={pending || item.quantity >= (variant?.stock || 1)}
                          onClick={() => updateItem(variant._id, item.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-semibold">
                          ${(unitPrice * item.quantity).toFixed(2)}
                        </span>
                        {hasSale && (
                          <span className="text-xs text-muted-foreground line-through">
                            ${(variant.price * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                        disabled={pending}
                        onClick={() => removeItem(variant._id)}
                        title="Remove item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order summary */}
          <div className="h-fit rounded-lg border bg-card p-5 grid gap-4">
            <h2 className="font-semibold">Order summary</h2>
            <Separator />

            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal ({count} {count === 1 ? "item" : "items"})
                </span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">Calculated at checkout</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            <Button className="w-full bg-[#033936] text-white hover:bg-[#022826]" size="lg" asChild>
              <Link href="/checkout">Proceed to checkout</Link>
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/">Continue shopping</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
