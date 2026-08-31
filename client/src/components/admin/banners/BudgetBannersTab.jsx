"use client";

import { useRef } from "react";
import { Plus, Loader2, Save, Undo2, BadgeIndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { HeroSlideCard } from "./HeroSlideCard";

export function BudgetBannersTab({
  banners,
  savedBanners,
  canWrite,
  savingKey,
  setBanners,
  onSave,
  onUndo,
}) {
  const slidesEndRef = useRef(null);
  const budgetSlides = banners.budget?.slides || [];

  const handleBudgetSlideChange = (index, field, value) => {
    setBanners((prev) => {
      const budget = prev.budget || { key: "budget", slides: [] };
      const newSlides = [...(budget.slides || [])];
      newSlides[index] = {
        ...newSlides[index],
        [field]: value,
      };
      return {
        ...prev,
        budget: {
          ...budget,
          slides: newSlides,
        },
      };
    });
  };

  const handleAddBudgetSlide = () => {
    setBanners((prev) => {
      const budget = prev.budget || { key: "budget", slides: [] };
      const currentSlides = budget.slides || [];

      const newSlide = {
        name: "",
        image: { url: "", fileId: "" },
        href: "/category/all?maxPrice=500",
        order: currentSlides.length + 1,
        isActive: true,
      };

      return {
        ...prev,
        budget: {
          ...budget,
          slides: [...currentSlides, newSlide],
        },
      };
    });

    setTimeout(() => {
      slidesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 150);
  };

  const handleDeleteBudgetSlide = (index) => {
    setBanners((prev) => {
      const budget = prev.budget || { key: "budget", slides: [] };
      const currentSlides = budget.slides || [];
      if (currentSlides.length <= 1) {
        toast.error("Budget section must contain at least 1 banner card.");
        return prev;
      }

      const newSlides = currentSlides.filter((_, i) => i !== index);
      const reorderedSlides = newSlides.map((s, i) => ({ ...s, order: i + 1 }));

      return {
        ...prev,
        budget: {
          ...budget,
          slides: reorderedSlides,
        },
      };
    });
  };

  const handleMoveBudgetSlide = (index, direction) => {
    setBanners((prev) => {
      const budget = prev.budget || { key: "budget", slides: [] };
      const slides = [...(budget.slides || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= slides.length) return prev;

      const temp = slides[index];
      slides[index] = slides[targetIndex];
      slides[targetIndex] = temp;

      const reorderedSlides = slides.map((s, i) => ({ ...s, order: i + 1 }));

      return {
        ...prev,
        budget: {
          ...budget,
          slides: reorderedSlides,
        },
      };
    });
  };

  const isDirty = () => {
    if (!banners.budget || !savedBanners.budget) return false;
    return JSON.stringify(banners.budget) !== JSON.stringify(savedBanners.budget);
  };

  const dirty = isDirty();
  const isSaving = savingKey === "budget";

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BadgeIndianRupee className="size-5 text-primary" />
            Shop By Budget Banners ({budgetSlides.length} Banners)
            {dirty && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full ml-2">
                Unsaved Changes
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Configure price banner cards for the storefront &apos;Shop By Budget&apos; section.
          </CardDescription>
        </div>

        <Button
          type="button"
          onClick={handleAddBudgetSlide}
          disabled={!canWrite}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="size-4" />
          Add Budget Banner
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {budgetSlides.map((slide, index) => (
          <HeroSlideCard
            key={slide._id || index}
            slide={slide}
            index={index}
            totalSlides={budgetSlides.length}
            canWrite={canWrite}
            onChange={handleBudgetSlideChange}
            onMove={handleMoveBudgetSlide}
            onDelete={handleDeleteBudgetSlide}
          />
        ))}
        <div ref={slidesEndRef} />
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t p-4 sm:px-6">
        <span className="text-xs text-muted-foreground">
          Key: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">budget</code>
        </span>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUndo("budget")}
            disabled={!dirty || !canWrite || isSaving}
            className="gap-1.5 text-xs"
          >
            <Undo2 className="size-3.5 text-amber-500" />
            Undo Changes
          </Button>

          <Button
            type="button"
            onClick={() => onSave("budget")}
            disabled={!canWrite || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Budget Banners
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
