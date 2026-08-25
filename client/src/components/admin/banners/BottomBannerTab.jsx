"use client";

import { LayoutTemplate, Loader2, Save, Undo2, Link2 } from "lucide-react";
import { ImageUploader } from "@/components/admin/products/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export function BottomBannerTab({
  banners,
  savedBanners,
  canWrite,
  savingKey,
  setBanners,
  onSave,
  onUndo,
}) {
  const bottom = banners.bottom || {};

  const handleBottomChange = (field, value) => {
    setBanners((prev) => ({
      ...prev,
      bottom: {
        ...prev.bottom,
        [field]: value,
      },
    }));
  };

  const isDirty = () => {
    if (!banners.bottom || !savedBanners.bottom) return false;
    return JSON.stringify(banners.bottom) !== JSON.stringify(savedBanners.bottom);
  };

  const dirty = isDirty();
  const isSaving = savingKey === "bottom";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="size-5 text-primary" />
            Bottom Banner
          </div>
          {dirty && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
              Unsaved Changes
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Configure the wholesale bulk purchasing promotional banner card at the bottom of the home page.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold">Enable Bottom Banner</div>
            <p className="text-xs text-muted-foreground">
              Display or hide the bottom promotional banner on the storefront.
            </p>
          </div>
          <Switch
            checked={bottom.isActive !== false}
            onCheckedChange={(checked) => handleBottomChange("isActive", checked)}
            disabled={!canWrite}
          />
        </div>

        <ImageUploader
          value={bottom.image}
          onChange={(img) => handleBottomChange("image", img)}
          maxImages={1}
          singleImage
          clean
          label="Bottom Banner Image"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Heading Title
            </label>
            <Input
              value={bottom.title || ""}
              onChange={(e) => handleBottomChange("title", e.target.value)}
              placeholder="e.g. Buying in Bulk?"
              disabled={!canWrite}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Button CTA Text
            </label>
            <Input
              value={bottom.ctaText || ""}
              onChange={(e) => handleBottomChange("ctaText", e.target.value)}
              placeholder="e.g. Request a Quote"
              disabled={!canWrite}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subtitle / Description
          </label>
          <Textarea
            value={bottom.subtitle || ""}
            onChange={(e) => handleBottomChange("subtitle", e.target.value)}
            placeholder="Enter banner description..."
            rows={2}
            disabled={!canWrite}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Link2 className="size-3.5 text-primary" />
            Target Redirect Link (Href)
          </label>
          <Input
            value={bottom.href || ""}
            onChange={(e) => handleBottomChange("href", e.target.value)}
            placeholder="e.g. /contact-us"
            disabled={!canWrite}
          />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t p-4 sm:px-6">
        <span className="text-xs text-muted-foreground">
          Key: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">bottom</code>
        </span>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUndo("bottom")}
            disabled={!dirty || !canWrite || isSaving}
            className="gap-1.5 text-xs"
          >
            <Undo2 className="size-3.5 text-amber-500" />
            Undo Changes
          </Button>

          <Button
            type="button"
            onClick={() => onSave("bottom")}
            disabled={!canWrite || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Bottom Banner
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
