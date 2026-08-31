"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Heart,
  ShoppingCart,
  Zap,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  Plus,
  Minus,
  Share2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useVariantSelector } from "@/hooks/storefront/useVariantSelector";
import { useCart } from "@/hooks/storefront/useCart";
import { useWishlist } from "@/hooks/storefront/useWishlist";
import { formatPrice } from "@/lib/formatCurrency";
import DOMPurify from "isomorphic-dompurify";
import { VariantSelector } from "@/components/storefront/products/VariantSelector";
import { QuantitySelector } from "@/components/storefront/products/QuantitySelector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getDeliveryDates() {
  const now = new Date();
  const formatShortDate = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const todayStr = formatShortDate(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = formatShortDate(tomorrow);

  const startDelivery = new Date(now);
  startDelivery.setDate(now.getDate() + 4);
  const startDeliveryStr = formatShortDate(startDelivery);

  const endDelivery = new Date(now);
  endDelivery.setDate(now.getDate() + 5);
  const endDeliveryStr = formatShortDate(endDelivery);

  return {
    orderToday: todayStr,
    orderReady: `${todayStr} - ${tomorrowStr}`,
    delivered: `${startDeliveryStr} - ${endDeliveryStr}`,
  };
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-4.5 sm:size-5 stroke-[#1e293b] dark:stroke-slate-200 stroke-[1.8] stroke-linecap-round stroke-linejoin-round"
    >
      <rect x="3" y="4" width="18" height="17" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <rect x="6" y="12" width="3" height="3" fill="#ef4444" stroke="none" rx="0.5" />
      <rect x="10.5" y="12" width="3" height="3" fill="#ef4444" stroke="none" rx="0.5" />
      <rect x="15" y="12" width="3" height="3" fill="#fca5a5" stroke="none" rx="0.5" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-4.5 sm:size-5 stroke-[#1e293b] dark:stroke-slate-200 stroke-[1.8] stroke-linecap-round stroke-linejoin-round"
    >
      <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4A2 2 0 0 1 2 16.77V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" />
      <polyline points="2.32 6.16 12 11 21.68 6.16" />
      <line x1="12" y1="22.76" x2="12" y2="11" />
      <line x1="7.5" y1="8.5" x2="16.5" y2="13" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-4.5 sm:size-5 stroke-[#1e293b] dark:stroke-slate-200 stroke-[1.8] stroke-linecap-round stroke-linejoin-round"
    >
      <rect x="1" y="5" width="14" height="11" rx="1" />
      <polygon points="15 8 20 8 23 12 23 16 15 16 15 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
      <path
        d="M6 10.5l2.5 2.5L13.5 8"
        stroke="#ef4444"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function ProductInteractiveSection({ product, variantSelectorProps }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [buyNowPending, setBuyNowPending] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0); // 0 = Delivery timeline (appears first), 1 = Trust badges
  const [copiedSku, setCopiedSku] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const internalVariantSelector = useVariantSelector(product);
  const { optionTypes, selectedOptions, setOption, selectedVariant } =
    variantSelectorProps || internalVariantSelector;
  const isCustomerAuthed = useSelector((state) => state.customerAuth.status === "authenticated");

  const { addItem, isPending: isCartPending } = useCart();
  const { isWishlisted, isPending: isWishlistPending, toggle: toggleWishlist } = useWishlist(product?._id);

  const inStock = (selectedVariant?.stock || 0) > 0;
  const price = selectedVariant?.salePrice || selectedVariant?.price;
  const originalPrice = selectedVariant?.price;
  const hasSale = !!selectedVariant?.salePrice && selectedVariant.salePrice < selectedVariant.price;

  const discountPercent = hasSale ? Math.round((1 - selectedVariant.salePrice / selectedVariant.price) * 100) : null;
  const deliveryDates = getDeliveryDates();
  const sku = selectedVariant?.sku || product?.sku || selectedVariant?._id?.slice(-8).toUpperCase() || "";

  // Auto scroll feature container every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleCopySku = () => {
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    setCopiedSku(true);
    toast.success("SKU copied to clipboard!");
    setTimeout(() => setCopiedSku(false), 2000);
  };

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

  const handleShare = async () => {
    const shareData = {
      title: product?.name || "Product",
      text: `Check out ${product?.name || "this product"}!`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        toast.success("Product link copied to clipboard!");
        setTimeout(() => setCopiedShare(false), 2000);
      } catch (err) {
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <div className="grid gap-4 sm:gap-5 text-foreground w-full">
      {/* Title & Brand Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">{product.name}</h1>
        {product.brand && (
          <p className="text-sm font-medium text-muted-foreground">
            by <span className="text-[#033936] dark:text-emerald-400 font-semibold">{product.brand.name}</span>
          </p>
        )}
      </div>

      {/* SKU Display with Copy Action (Above Price) */}
      {sku && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-0.5">
          <span className="uppercase tracking-wider font-semibold text-[11px] text-slate-500 dark:text-slate-400">SKU:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
            {sku}
          </span>
          <button
            type="button"
            onClick={handleCopySku}
            title="Copy SKU"
            className="p-1 text-slate-400 hover:text-foreground transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {copiedSku ? (
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Pricing & Stock Section */}
      <div className="flex flex-wrap items-center gap-3 pt-0.5">
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

      {/* Variant Selector (Dropdown) */}
      <VariantSelector optionTypes={optionTypes} selectedOptions={selectedOptions} onSelect={setOption} />

      {/* Action Controls (Quantity + Add to Cart + Wishlist in Row 1, Buy Now in Row 2) */}
      <div className="space-y-2.5 pt-1">
        {/* Row 1: Quantity + Add To Cart + Wishlist */}
        <div className="flex items-center gap-2.5">
          {/* Quantity Selector matching button height (38px) */}
          <div className="flex h-[38px] items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-background px-1 shrink-0 shadow-2xs">
            <QuantitySelector value={quantity} onChange={setQuantity} max={selectedVariant?.stock || 1} />
          </div>

          {/* Add To Cart Button */}
          <Button
            variant="outline"
            className="flex-1 h-[38px] border-[#033936] text-[#033936] hover:bg-[#033936]/10 font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
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
              "flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-background transition-all duration-200 hover:bg-muted active:scale-95 shadow-2xs cursor-pointer",
              isWishlisted && "border-rose-500 bg-rose-50 dark:bg-rose-950/40"
            )}
          >
            <Heart
              className={cn(
                "size-4.5 stroke-[2]",
                isWishlisted ? "fill-rose-500 text-rose-500" : "text-slate-700 dark:text-slate-300"
              )}
            />
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            title="Share product"
            className="flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-background transition-all duration-200 hover:bg-muted text-slate-700 dark:text-slate-300 hover:text-foreground active:scale-95 shadow-2xs cursor-pointer"
          >
            {copiedShare ? (
              <Check className="size-4.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            ) : (
              <Share2 className="size-4.5 stroke-[2]" />
            )}
          </button>
        </div>

        {/* Row 2: Full-Width Buy Now Button matching height (38px) */}
        <Button
          className="w-full h-[38px] bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-all flex items-center justify-center gap-2 rounded-lg"
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

      {/* Payment Options SVG Banner */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1 gap-1.5 border-t border-slate-100 dark:border-slate-800/80 mt-1">
        <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Guaranteed Safe & Secure Checkout
        </span>
        <img
          src="https://fastrr-boost-ui.pickrr.com/assets/images/boost_button/upi_options.svg"
          alt="Supported UPI & Payment Methods"
          className="h-6 sm:h-7 w-auto object-contain max-w-full"
          loading="lazy"
        />
      </div>

      {/* Auto-scrolling Delivery Timeline & Guarantee Container (Compact 4s transition) */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2.5 shadow-2xs">
        <div
          className="flex transition-transform duration-500 ease-in-out w-full"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {/* Slide 1: Delivery Timeline (Appears First) */}
          <div className="w-full shrink-0 grid grid-cols-3 gap-1.5 text-center items-center">
            {/* Step 1: Order Today */}
            <div className="flex flex-col items-center">
              <div className="size-8.5 sm:size-9.5 rounded-full border border-slate-300 dark:border-slate-700 bg-[#ebf2ff] dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                <CalendarIcon />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-red-500 mt-1 leading-tight">
                {deliveryDates.orderToday}
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-tight mt-0.5">
                Order Today
              </span>
            </div>

            {/* Step 2: Order Ready */}
            <div className="flex flex-col items-center">
              <div className="size-8.5 sm:size-9.5 rounded-full border border-slate-300 dark:border-slate-700 bg-[#ebf2ff] dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                <PackageIcon />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-red-500 mt-1 leading-tight">
                {deliveryDates.orderReady}
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-tight mt-0.5">
                Order Ready
              </span>
            </div>

            {/* Step 3: Delivered */}
            <div className="flex flex-col items-center">
              <div className="size-8.5 sm:size-9.5 rounded-full border border-slate-300 dark:border-slate-700 bg-[#ebf2ff] dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                <TruckIcon />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-red-500 mt-1 leading-tight">
                {deliveryDates.delivered}
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-tight mt-0.5">
                Delivered
              </span>
            </div>
          </div>

          {/* Slide 2: Trust Badges */}
          <div className="w-full shrink-0 grid grid-cols-3 gap-1.5 text-center items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="size-8.5 sm:size-9.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="size-4.5 text-[#033936] dark:text-emerald-400" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Secure Checkout
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="size-8.5 sm:size-9.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                <RotateCcw className="size-4.5 text-[#033936] dark:text-emerald-400" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Easy Returns
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="size-8.5 sm:size-9.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="size-4.5 text-[#033936] dark:text-emerald-400" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Quality Checked
              </span>
            </div>
          </div>
        </div>

        {/* Pagination indicators */}
        <div className="flex justify-center gap-1.5 mt-1.5">
          <button
            type="button"
            onClick={() => setActiveSlide(0)}
            aria-label="Delivery timeline"
            className={cn(
              "h-1 rounded-full transition-all duration-300 cursor-pointer",
              activeSlide === 0 ? "w-4 bg-[#033936] dark:bg-emerald-400" : "w-1 bg-slate-300 dark:bg-slate-700"
            )}
          />
          <button
            type="button"
            onClick={() => setActiveSlide(1)}
            aria-label="Guarantees"
            className={cn(
              "h-1 rounded-full transition-all duration-300 cursor-pointer",
              activeSlide === 1 ? "w-4 bg-[#033936] dark:bg-emerald-400" : "w-1 bg-slate-300 dark:bg-slate-700"
            )}
          />
        </div>
      </div>

      {/* Collapsible Product Description Section (Borderless + Text with Plus/Minus Toggle) */}
      {product.description && (
        <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 mt-1">
          <button
            type="button"
            onClick={() => setIsDescriptionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 text-left font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 hover:text-[#033936] dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <span>Description</span>
            {isDescriptionOpen ? (
              <Minus className="size-4 text-slate-500" />
            ) : (
              <Plus className="size-4 text-slate-500" />
            )}
          </button>
          {isDescriptionOpen && (
            <div
              className="pt-2 pb-1 text-xs sm:text-sm text-muted-foreground leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
            />
          )}
        </div>
      )}
    </div>
  );
}



