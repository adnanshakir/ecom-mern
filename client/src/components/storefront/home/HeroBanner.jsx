"use client";

import Link from "next/link";
import { ArrowRight, Tag, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicBanners } from "@/hooks/storefront/usePublicBanners";

export function HeroBanner() {
  const { banners } = usePublicBanners();
  const hero = banners.hero || {};

  const rawImageUrl = hero.image?.url || "/hero-banner.webp";
  const imageUrl = rawImageUrl.endsWith(".png") ? rawImageUrl.replace(/\.png$/, ".webp") : rawImageUrl;
  const title = hero.title || "TRUSTED BY MILLIONS";
  const subtitle = hero.subtitle || "Discover trending products, limited-time offers, and everyday essentials at unbeatable wholesale prices.";
  const href = hero.href || "/category/all";
  const ctaText = hero.ctaText || "Shop Now";
  const showGradient = hero.showGradient ?? true;
  const overlayColor = hero.overlayColor || "#033936";

  return (
    <section
      className="relative w-full overflow-hidden mx-auto max-w-[1800px] text-white"
      style={{ backgroundColor: overlayColor }}
    >
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          decoding="async"
          className="size-full object-cover object-center opacity-90"
        />
        {/* Conditional Gradient overlay */}
        {showGradient && (
          <div
            className="absolute inset-0 transition-opacity"
            style={{
              background: `linear-gradient(to right, ${overlayColor}B3, ${overlayColor}66, ${overlayColor}B3)`,
            }}
          />
        )}
      </div>

      {/* Content Container */}
      <div className="relative z-10 mx-auto flex min-h-105 max-w-400 flex-col items-center justify-center px-4 py-12 text-center sm:min-h-120 sm:px-6 md:py-20 lg:px-8">
        {/* Main Heading */}
        <h1 className="mb-4 text-3xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl uppercase drop-shadow-md">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="mb-8 max-w-2xl text-sm font-normal text-slate-200 sm:text-base md:text-lg">
          {subtitle}
        </p>

        {/* CTA Button */}
        <div className="mb-10">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full bg-white px-8 text-base font-bold text-[#033936] shadow-lg transition-all duration-200 hover:bg-slate-100 hover:scale-105 active:scale-95"
          >
            <Link href={href} className="flex items-center gap-2">
              {ctaText}
              <div className="flex size-6 items-center justify-center rounded-full bg-[#033936] text-white">
                <ArrowRight className="size-3.5" />
              </div>
            </Link>
          </Button>
        </div>

        {/* Value Propositions / Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/30 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm border border-white/10">
            <div className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-white/20 text-amber-300">
              <Tag className="size-3 sm:size-3.5" />
            </div>
            <span className="font-medium text-slate-100">Lowest Wholesale Prices</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/30 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm border border-white/10">
            <div className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-white/20 text-teal-300">
              <Package className="size-3 sm:size-3.5" />
            </div>
            <span className="font-medium text-slate-100">Bulk Order Discounts</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/30 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm border border-white/10">
            <div className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-white/20 text-emerald-300">
              <Truck className="size-3 sm:size-3.5" />
            </div>
            <span className="font-medium text-slate-100">Fast & Safe Delivery</span>
          </div>
        </div>
      </div>
    </section>
  );
}
