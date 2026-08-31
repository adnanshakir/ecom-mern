"use client";

import { ArrowUp, ArrowDown, Trash2, Link2, Tag } from "lucide-react";
import { ImageUploader } from "@/components/admin/products/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function HeroSlideCard({
  slide,
  index,
  totalSlides,
  canWrite,
  onChange,
  onMove,
  onDelete,
}) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4 transition-all">
      {/* Slide Header */}
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <span className="text-sm font-semibold truncate max-w-[220px] sm:max-w-[350px]">
            Banner Slide #{index + 1} {slide.name ? `- ${slide.name}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onMove(index, -1)}
              disabled={!canWrite || index === 0}
              title="Move Up"
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onMove(index, 1)}
              disabled={!canWrite || index === totalSlides - 1}
              title="Move Down"
            >
              <ArrowDown className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 border-l pl-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">Active</span>
            <Switch
              checked={slide.isActive !== false}
              onCheckedChange={(checked) => onChange(index, "isActive", checked)}
              disabled={!canWrite}
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(index)}
            disabled={!canWrite || totalSlides <= 1}
            title="Delete Slide"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Main Slide Content - Clean layout without extra nested boxes */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        <div className="md:col-span-6">
          <ImageUploader
            value={slide.image}
            onChange={(img) => onChange(index, "image", img)}
            maxImages={1}
            singleImage
            clean
            label={`Banner Image #${index + 1}`}
          />
        </div>

        <div className="md:col-span-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="size-3.5 text-primary" />
              Banner Name
            </label>
            <Input
              value={slide.name || ""}
              onChange={(e) => onChange(index, "name", e.target.value)}
              placeholder="e.g. Festive Offer, Hero Slide 1, Under 99 Store"
              disabled={!canWrite}
            />
            <p className="text-[11px] text-muted-foreground">
              Internal name identifier for this banner card.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Link2 className="size-3.5 text-primary" />
              Click Redirect Link (Href)
            </label>
            <Input
              value={slide.href || ""}
              onChange={(e) => onChange(index, "href", e.target.value)}
              placeholder="e.g. /category/jewellery or /product/my-item"
              disabled={!canWrite}
            />
            <p className="text-[11px] text-muted-foreground">
              URL to open when the user clicks on this banner slide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
