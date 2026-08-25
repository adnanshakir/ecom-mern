"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Heart, ShoppingCart, Zap } from "lucide-react";
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
  const hasSale = !!selectedVariant?.salePrice;

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
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-sm text-muted-foreground">{product.brand?.name}</p>
      </div>

      <div className="flex items-baseline gap-2">
        {hasSale ? (
          <>
            <span className="text-2xl font-semibold">{formatPrice(price)}</span>
            <span className="text-sm text-muted-foreground line-through">{formatPrice(selectedVariant.price)}</span>
          </>
        ) : (
          <span className="text-2xl font-semibold">{formatPrice(price)}</span>
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

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button
          variant="outline"
          className="flex-1 border-[#033936] text-[#033936] hover:bg-[#033936]/10"
          disabled={!inStock || isCartPending(selectedVariant?._id) || buyNowPending}
          onClick={handleAddToCart}
        >
          {isCartPending(selectedVariant?._id) && !buyNowPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShoppingCart className="size-4" />
          )}
          Add to cart
        </Button>

        <Button
          className="flex-1 bg-[#033936] text-white hover:bg-[#022826]"
          disabled={!inStock || isCartPending(selectedVariant?._id) || buyNowPending}
          onClick={handleBuyNow}
        >
          {buyNowPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Zap className="size-4" />
          )}
          Buy Now
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={isWishlistPending}
          onClick={handleToggleWishlist}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={cn("size-4", isWishlisted && "fill-current text-rose-500")} />
        </Button>
      </div>
    </div>
  );
}

