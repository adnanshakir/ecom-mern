"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Loader2,
  Save,
  Undo2,
  ShieldAlert,
  Sparkles,
  LayoutTemplate,
  AlignLeft,
  AlignRight,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

import { getAdminBanners, updateAdminBanner } from "@/services/admin/banners";
import { ImageUploader } from "@/components/admin/products/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";

const BANNER_CONFIGS = [
  { key: "hero", name: "Hero Banner", description: "Main homepage hero section at top" },
  { key: "secondary-left", name: "Category Banner (Left)", description: "Left promotional banner card" },
  { key: "secondary-right", name: "Category Banner (Right)", description: "Right promotional banner card" },
  { key: "bottom", name: "Bottom Banner", description: "Bulk buying call-to-action section" },
];

const PRESET_COLORS = [
  { label: "Deep Teal", value: "#033936" },
  { label: "Dark Slate", value: "#0f172a" },
  { label: "Midnight Navy", value: "#0284c7" },
  { label: "Royal Purple", value: "#3b0764" },
  { label: "Crimson Red", value: "#881337" },
  { label: "Emerald Green", value: "#14532d" },
];

export default function AdminBannersPage() {
  const user = useSelector((state) => state.auth.user);
  const canWrite = ["super_admin", "admin"].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedBanners, setSavedBanners] = useState({});
  const [banners, setBanners] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getAdminBanners();
      const loaded = data.data || {};
      setSavedBanners(loaded);
      setBanners(JSON.parse(JSON.stringify(loaded)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load storefront banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleChange = (key, field, value) => {
    setBanners((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleUndo = (key) => {
    if (savedBanners[key]) {
      setBanners((prev) => ({
        ...prev,
        [key]: JSON.parse(JSON.stringify(savedBanners[key])),
      }));
      toast.info(`Undid unsaved changes for ${BAN_NAME(key)}`);
    }
  };

  const handleSave = async (key) => {
    if (!canWrite) {
      toast.error("Permission denied. Only Admins and Super Admins can update banners.");
      return;
    }

    try {
      setSavingKey(key);
      const bannerData = banners[key];
      const { data } = await updateAdminBanner(key, bannerData);
      
      const updatedBanner = data.data || bannerData;
      setSavedBanners((prev) => ({
        ...prev,
        [key]: updatedBanner,
      }));
      setBanners((prev) => ({
        ...prev,
        [key]: JSON.parse(JSON.stringify(updatedBanner)),
      }));

      toast.success(`${BAN_NAME(key)} updated successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to update ${BAN_NAME(key)}`);
    } finally {
      setSavingKey(null);
    }
  };

  const BAN_NAME = (key) => BANNER_CONFIGS.find((b) => b.key === key)?.name || key;

  const isDirty = (key) => {
    if (!banners[key] || !savedBanners[key]) return false;
    return JSON.stringify(banners[key]) !== JSON.stringify(savedBanners[key]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading banner configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Storefront Banners</h1>
          <p className="text-sm text-muted-foreground">
            Manage main promotional images, titles, subtitles, links, colors, and content placement.
          </p>
        </div>

        {!canWrite && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-4 shrink-0" />
            <span>Read-only Mode (Admin required for editing)</span>
          </div>
        )}
      </div>

      <ApiErrorSummary message={error} />

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="flex w-full overflow-x-auto justify-start sm:grid sm:grid-cols-4 h-auto p-1 gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BANNER_CONFIGS.map((cfg) => (
            <TabsTrigger key={cfg.key} value={cfg.key} className="shrink-0 text-xs sm:text-sm py-2 px-3">
              {cfg.name} {isDirty(cfg.key) && <span className="ml-1.5 size-1.5 rounded-full bg-amber-500 inline-block" />}
            </TabsTrigger>
          ))}
        </TabsList>

        {BANNER_CONFIGS.map((cfg) => {
          const banner = banners[cfg.key] || {};
          const isSaving = savingKey === cfg.key;
          const dirty = isDirty(cfg.key);

          const isHero = cfg.key === "hero";
          const isSecondary = cfg.key === "secondary-left" || cfg.key === "secondary-right";
          const isBottom = cfg.key === "bottom";

          return (
            <TabsContent key={cfg.key} value={cfg.key} className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="size-5 text-primary" />
                      {cfg.name}
                    </div>
                    {dirty && (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>{cfg.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Banner Image Uploader */}
                  <ImageUploader
                    value={banner.image}
                    onChange={(img) => handleChange(cfg.key, "image", img)}
                    maxImages={1}
                    singleImage
                    label="Banner Image (ImageKit or Direct URL)"
                  />

                  {/* Title & Subtitle */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Heading Title
                      </label>
                      <Input
                        value={banner.title || ""}
                        onChange={(e) => handleChange(cfg.key, "title", e.target.value)}
                        placeholder="e.g. TRUSTED BY MILLIONS"
                        disabled={!canWrite}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Button Label / CTA Text
                      </label>
                      <Input
                        value={banner.ctaText || ""}
                        onChange={(e) => handleChange(cfg.key, "ctaText", e.target.value)}
                        placeholder="e.g. Shop Now"
                        disabled={!canWrite}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Subtitle / Description
                    </label>
                    <Textarea
                      value={banner.subtitle || ""}
                      onChange={(e) => handleChange(cfg.key, "subtitle", e.target.value)}
                      placeholder="Enter subtitle text..."
                      rows={2}
                      disabled={!canWrite}
                    />
                  </div>

                  {/* Link (Href) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Link (Href)
                    </label>
                    <Input
                      value={banner.href || ""}
                      onChange={(e) => handleChange(cfg.key, "href", e.target.value)}
                      placeholder="e.g. /catalog/jewellery"
                      disabled={!canWrite}
                    />
                  </div>

                  {/* Hero & Secondary Banner Specific Controls */}
                  {!isBottom && (
                    <div className="space-y-4 rounded-xl border p-4 bg-muted/20">
                      {/* Gradient Overlay Toggle (Hero & Secondary) */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Sparkles className="size-4 text-amber-500" />
                            Enable Gradient Overlay
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Applies overlay effect over the image for text contrast.
                          </p>
                        </div>
                        <Switch
                          checked={banner.showGradient ?? true}
                          onCheckedChange={(checked) => handleChange(cfg.key, "showGradient", checked)}
                          disabled={!canWrite}
                        />
                      </div>

                      {/* Color Selection (Hero & Secondary Banners) */}
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Palette className="size-3.5 text-primary" />
                          Overlay Color
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {isSecondary && (
                            <button
                              type="button"
                              onClick={() => handleChange(cfg.key, "overlayColor", "background")}
                              disabled={!canWrite}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all ${
                                (!banner.overlayColor || banner.overlayColor === "background")
                                  ? "border-primary bg-primary/10 font-bold ring-2 ring-primary/40"
                                  : "border-border hover:bg-accent"
                              }`}
                            >
                              <span className="size-3.5 rounded-full border border-black/20 bg-muted" />
                              <span>Theme Auto</span>
                            </button>
                          )}

                          {PRESET_COLORS.map((col) => (
                            <button
                              key={col.value}
                              type="button"
                              onClick={() => handleChange(cfg.key, "overlayColor", col.value)}
                              disabled={!canWrite}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all ${
                                banner.overlayColor === col.value
                                  ? "border-primary bg-primary/10 font-bold ring-2 ring-primary/40"
                                  : "border-border hover:bg-accent"
                              }`}
                            >
                              <span
                                className="size-3.5 rounded-full border border-black/20"
                                style={{ backgroundColor: col.value }}
                              />
                              <span>{col.label}</span>
                            </button>
                          ))}

                          {/* Custom Color input */}
                          <div className="flex items-center gap-2 ml-auto">
                            <label className="text-xs font-medium text-muted-foreground">Custom:</label>
                            <input
                              type="color"
                              value={banner.overlayColor && banner.overlayColor.startsWith("#") ? banner.overlayColor : "#033936"}
                              onChange={(e) => handleChange(cfg.key, "overlayColor", e.target.value)}
                              disabled={!canWrite}
                              className="size-8 cursor-pointer rounded border p-0.5 bg-background"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Secondary Banner Placement (Left vs Right) */}
                      {isSecondary && (
                        <div className="border-t pt-4 space-y-3">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Content Position (Left vs Right)
                          </label>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => handleChange(cfg.key, "placement", "left")}
                              disabled={!canWrite}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-semibold transition-all ${
                                (banner.placement || "left") === "left"
                                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/40"
                                  : "border-border bg-background hover:bg-accent text-muted-foreground"
                              }`}
                            >
                              <AlignLeft className="size-4" />
                              <span>Left Side</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChange(cfg.key, "placement", "right")}
                              disabled={!canWrite}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-semibold transition-all ${
                                banner.placement === "right"
                                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/40"
                                  : "border-border bg-background hover:bg-accent text-muted-foreground"
                              }`}
                            >
                              <AlignRight className="size-4" />
                              <span>Right Side</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t p-4 sm:px-6 sm:py-4">
                  <span className="text-xs text-muted-foreground">
                    Key: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{cfg.key}</code>
                  </span>

                  <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                    {/* Undo Changes Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUndo(cfg.key)}
                      disabled={!dirty || !canWrite || isSaving}
                      className="gap-1.5 text-xs"
                    >
                      <Undo2 className="size-3.5 text-amber-500" />
                      Undo Changes
                    </Button>

                    {/* Save Button */}
                    <Button
                      type="button"
                      onClick={() => handleSave(cfg.key)}
                      disabled={!canWrite || isSaving}
                      className="gap-2"
                    >
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save {cfg.name}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
