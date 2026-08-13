"use client";

import { useState, useEffect, useMemo } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const extractUrl = (item) => {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object" && typeof item.url === "string") return item.url;
  return null;
};

export function ProductGallery({ productImages, variantImages }) {
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

    addSource(variantImages);
    addSource(productImages);
    return list;
  }, [productImages, variantImages]);

  const [active, setActive] = useState(0);

  // Jump back to the lead image whenever the variant's own images change
  // (i.e. the person picked a different variant with a different photo).
  useEffect(() => {
    setActive(0);
  }, [variantImages]);

  return (
    <div className="grid gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        {images[active] ? (
          <Image
            src={images[active].url}
            alt={`Product image ${active + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <ImageIcon className="size-10 text-muted-foreground" />
        )}
      </div>

      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setActive(i)}
              className={cn(
                "relative size-16 overflow-hidden rounded-md border-2",
                active === i ? "border-primary" : "border-transparent"
              )}
            >
              <Image
                src={img.url}
                alt={`Product thumbnail ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}