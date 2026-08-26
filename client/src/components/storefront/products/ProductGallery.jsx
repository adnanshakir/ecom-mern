"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ImageIcon, Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const extractUrl = (item) => {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object" && typeof item.url === "string") return item.url;
  return null;
};

export function ProductGallery({ productImages, variantImages, allVariants }) {
  const images = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addSource = (source) => {
      if (!source) return;
      const items = Array.isArray(source) ? source : [source];
      items.forEach((item) => {
        const url = extractUrl(item);
        if (url && !seen.has(url)) {
          seen.add(url);
          list.push({ url });
        }
      });
    };

    // 1. Prioritize images of the currently selected variant
    addSource(variantImages);

    // 2. Add main product images
    addSource(productImages);

    // 3. Add images from all other variants so no images are missed
    if (allVariants && Array.isArray(allVariants)) {
      allVariants.forEach((v) => {
        addSource(v?.images);
      });
    }

    return list;
  }, [productImages, variantImages, allVariants]);

  // Compute unique key for the active variant's images
  const variantKey = useMemo(() => {
    if (!variantImages) return "";
    const items = Array.isArray(variantImages) ? variantImages : [variantImages];
    return items.map(extractUrl).filter(Boolean).join(",");
  }, [variantImages]);

  const [active, setActive] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Switch active image to the selected variant's first image whenever variant changes
  useEffect(() => {
    if (variantKey) {
      setActive(0);
    }
  }, [variantKey]);

  const handlePrev = useCallback(() => {
    setActive((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setActive((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent scrolling when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isFullscreen, handlePrev, handleNext]);

  return (
    <div className="w-full">
      {/* Gallery Layout: Left Thumbnails + Main Image */}
      <div className="flex flex-col-reverse md:flex-row gap-4 items-start w-full">
        {/* Thumbnails Column (Stacked Vertically on MD+) */}
        {images.length > 1 && (
          <div className="flex md:flex-col flex-row gap-2.5 overflow-x-auto md:overflow-y-auto max-h-[480px] w-full md:w-auto shrink-0 py-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {images.map((img, i) => (
              <button
                key={img.url + i}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "relative size-16 sm:size-18 shrink-0 overflow-hidden border-2 transition-all duration-200 focus:outline-hidden",
                  active === i
                    ? "border-[#033936] ring-2 ring-[#033936]/20 shadow-xs scale-102"
                    : "border-slate-200 hover:border-slate-400 opacity-75 hover:opacity-100"
                )}
              >
                <Image
                  src={img.url}
                  alt={`Product thumbnail ${i + 1}`}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main Display Image */}
        <div className="relative flex-1 aspect-square max-w-[500px] w-full mx-auto overflow-hidden bg-muted border border-slate-200/80 shadow-xs group/main">
          {images[active] ? (
            <Image
              src={images[active].url}
              alt={`Product image ${active + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover transition-transform duration-300 group-hover/main:scale-105"
              priority
            />
          ) : (
            <ImageIcon className="size-10 text-muted-foreground" />
          )}

          {/* Fullscreen Trigger Button */}
          {images[active] && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs transition-all duration-200 hover:bg-white hover:scale-110 active:scale-95"
              title="View image full screen"
            >
              <Maximize2 className="size-4 stroke-[2.2]" />
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && images[active] && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-white p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between w-full max-w-6xl mx-auto z-10">
            <span className="text-sm font-medium tracking-wide text-slate-300">
              {active + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
              title="Close fullscreen"
            >
              <X className="size-6 stroke-[2]" />
            </button>
          </div>

          {/* Main Image View with Arrows */}
          <div className="relative flex-1 flex items-center justify-center my-4 w-full max-w-6xl mx-auto">
            {images.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 z-20 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 hover:scale-110 active:scale-95 transition-all duration-200"
                title="Previous image"
              >
                <ChevronLeft className="size-7 stroke-[2.5]" />
              </button>
            )}

            <div className="relative size-full max-h-[75vh] max-w-[85vw] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[active].url}
                alt={`Product fullscreen image ${active + 1}`}
                className="max-h-[75vh] max-w-full object-contain rounded-md shadow-2xl select-none"
              />
            </div>

            {images.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-4 z-20 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 hover:scale-110 active:scale-95 transition-all duration-200"
                title="Next image"
              >
                <ChevronRight className="size-7 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 max-w-4xl mx-auto">
              {images.map((img, i) => (
                <button
                  key={"modal-" + img.url + i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "relative size-14 shrink-0 overflow-hidden rounded-md border-2 transition-all duration-200",
                    active === i
                      ? "border-emerald-400 opacity-100 scale-105"
                      : "border-transparent opacity-50 hover:opacity-80"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Thumbnail ${i + 1}`} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
