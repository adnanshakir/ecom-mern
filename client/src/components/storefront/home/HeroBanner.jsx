"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePublicBanners } from "@/hooks/storefront/usePublicBanners";

export function HeroBanner() {
  const { banners } = usePublicBanners();
  const rawSlides = banners.hero?.slides || [];

  // Filter active slides and sort by order
  const slides = rawSlides
    .filter((slide) => slide.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5500);

    return () => clearInterval(interval);
  }, [slides.length, isPaused, nextSlide]);

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];
  const rawImageUrl = currentSlide.image?.url || "/banner-1.webp";
  const imageUrl =
    typeof rawImageUrl === "string" && (rawImageUrl.startsWith("/") || !rawImageUrl.startsWith("http"))
      ? rawImageUrl.replace(/\.(png|webp)$/i, ".webp")
      : rawImageUrl;
  const href = currentSlide.href || "/category/all";

  return (
    <section
      className="relative w-full overflow-hidden mx-auto max-w-[1800px] group bg-muted/10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Banner Slide Content - Optimized height to prevent corner cropping */}
      <div className="relative border-4 w-full aspect-[2.4/1] sm:aspect-[2.8/1] max-h-[380px] sm:max-h-[430px] flex items-center justify-center">
        <Link href={href} className="block w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={imageUrl}
            src={imageUrl}
            alt="Hero Banner"
            decoding="async"
            className="w-full h-full object-contain sm:object-cover object-center transition-all duration-700 ease-in-out"
          />
        </Link>
      </div>

      {/* Manual Back & Forward Arrow Navigation */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Banner"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex size-9 sm:size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all hover:bg-black/70 hover:scale-110 focus:outline-none opacity-80 sm:opacity-0 sm:group-hover:opacity-100 shadow-md"
          >
            <ChevronLeft className="size-5 sm:size-6" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Banner"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex size-9 sm:size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all hover:bg-black/70 hover:scale-110 focus:outline-none opacity-80 sm:opacity-0 sm:group-hover:opacity-100 shadow-md"
          >
            <ChevronRight className="size-5 sm:size-6" />
          </button>
        </>
      )}
    </section>
  );
}
