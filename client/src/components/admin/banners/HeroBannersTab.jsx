"use client";

import { useRef } from "react";
import { Plus, Loader2, Save, Undo2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { HeroSlideCard } from "./HeroSlideCard";

export function HeroBannersTab({
  banners,
  savedBanners,
  canWrite,
  savingKey,
  setBanners,
  onSave,
  onUndo,
}) {
  const slidesEndRef = useRef(null);
  const heroSlides = banners.hero?.slides || [];

  const handleHeroSlideChange = (index, field, value) => {
    setBanners((prev) => {
      const hero = prev.hero || { key: "hero", slides: [] };
      const newSlides = [...(hero.slides || [])];
      newSlides[index] = {
        ...newSlides[index],
        [field]: value,
      };
      return {
        ...prev,
        hero: {
          ...hero,
          slides: newSlides,
        },
      };
    });
  };

  const handleAddHeroSlide = () => {
    setBanners((prev) => {
      const hero = prev.hero || { key: "hero", slides: [] };
      const currentSlides = hero.slides || [];
      if (currentSlides.length >= 5) {
        toast.error("Top banner holder can only contain up to 5 banners.");
        return prev;
      }

      const newSlide = {
        image: { url: "", fileId: "" },
        href: "/category/all",
        order: currentSlides.length + 1,
        isActive: true,
      };

      return {
        ...prev,
        hero: {
          ...hero,
          slides: [...currentSlides, newSlide],
        },
      };
    });

    setTimeout(() => {
      slidesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 150);
  };

  const handleDeleteHeroSlide = (index) => {
    setBanners((prev) => {
      const hero = prev.hero || { key: "hero", slides: [] };
      const currentSlides = hero.slides || [];
      if (currentSlides.length <= 1) {
        toast.error("Top banner holder must contain at least 1 banner slide.");
        return prev;
      }

      const newSlides = currentSlides.filter((_, i) => i !== index);
      const reorderedSlides = newSlides.map((s, i) => ({ ...s, order: i + 1 }));

      return {
        ...prev,
        hero: {
          ...hero,
          slides: reorderedSlides,
        },
      };
    });
  };

  const handleMoveHeroSlide = (index, direction) => {
    setBanners((prev) => {
      const hero = prev.hero || { key: "hero", slides: [] };
      const slides = [...(hero.slides || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= slides.length) return prev;

      const temp = slides[index];
      slides[index] = slides[targetIndex];
      slides[targetIndex] = temp;

      const reorderedSlides = slides.map((s, i) => ({ ...s, order: i + 1 }));

      return {
        ...prev,
        hero: {
          ...hero,
          slides: reorderedSlides,
        },
      };
    });
  };

  const isDirty = () => {
    if (!banners.hero || !savedBanners.hero) return false;
    return JSON.stringify(banners.hero) !== JSON.stringify(savedBanners.hero);
  };

  const dirty = isDirty();
  const isSaving = savingKey === "hero";

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutTemplate className="size-5 text-primary" />
            Top Hero Carousel Banners ({heroSlides.length}/5)
            {dirty && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full ml-2">
                Unsaved Changes
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Configure up to 5 top hero images. Banners automatically scroll every 5.5 seconds.
          </CardDescription>
        </div>

        <Button
          type="button"
          onClick={handleAddHeroSlide}
          disabled={!canWrite || heroSlides.length >= 5}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="size-4" />
          Add Banner Slide
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {heroSlides.map((slide, index) => (
          <HeroSlideCard
            key={slide._id || index}
            slide={slide}
            index={index}
            totalSlides={heroSlides.length}
            canWrite={canWrite}
            onChange={handleHeroSlideChange}
            onMove={handleMoveHeroSlide}
            onDelete={handleDeleteHeroSlide}
          />
        ))}
        <div ref={slidesEndRef} />
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t p-4 sm:px-6">
        <span className="text-xs text-muted-foreground">
          Key: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">hero</code>
        </span>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUndo("hero")}
            disabled={!dirty || !canWrite || isSaving}
            className="gap-1.5 text-xs"
          >
            <Undo2 className="size-3.5 text-amber-500" />
            Undo Changes
          </Button>

          <Button
            type="button"
            onClick={() => onSave("hero")}
            disabled={!canWrite || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Top Banners
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
