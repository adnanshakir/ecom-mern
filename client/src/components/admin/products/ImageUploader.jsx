"use client";

import { useState } from "react";
import { Loader2, Plus, Upload, Link as LinkIcon, X, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadImages } from "@/services/admin/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];

export function ImageUploader({
  images = [],
  value,
  onChange,
  maxImages = 4,
  singleImage = false,
  label = "Images",
  clean = false,
}) {
  const [mode, setMode] = useState("file"); // "file" or "url"
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [urlInput, setUrlInput] = useState("");

  // Normalize incoming value: if singleImage mode or object passed in `value` or `images`
  const rawValue = value !== undefined ? value : images;
  const currentImages = Array.isArray(rawValue)
    ? rawValue.map((img) => (typeof img === "string" ? { url: img, fileId: "" } : img))
    : rawValue?.url
    ? [rawValue]
    : typeof rawValue === "string" && rawValue
    ? [{ url: rawValue, fileId: "" }]
    : [];

  const effectiveMax = singleImage ? 1 : maxImages;

  const emitChange = (newImages) => {
    if (!onChange) return;
    if (singleImage) {
      onChange(newImages[0] || { url: "", fileId: "" });
    } else {
      onChange(newImages);
    }
  };

  const MAX_PER_REQUEST = 4;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const remainingSlots = effectiveMax - currentImages.length;
    if (files.length > remainingSlots) {
      setError(
        `You can upload up to ${effectiveMax} image${effectiveMax > 1 ? "s" : ""} — ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`
      );
      return;
    }

    // Validate size and format for all selected files before making request
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setError(
          `Image "${file.name}" is ${sizeMB}MB, which exceeds the 5MB limit. Please upload an image smaller than 5MB or compress it to .WEBP.`
        );
        return;
      }
      if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) && !file.type.startsWith("image/")) {
        setError(`File "${file.name}" is not a supported image format. Please upload JPEG, PNG, or WebP.`);
        return;
      }
    }

    setUploading(true);
    setError(null);

    try {
      const batches = [];
      for (let i = 0; i < files.length; i += MAX_PER_REQUEST) {
        batches.push(files.slice(i, i + MAX_PER_REQUEST));
      }

      const uploaded = [];
      for (const batch of batches) {
        const { data } = await uploadImages(batch);
        uploaded.push(...data.data.map((img) => ({ url: img.url, fileId: img.fileId })));
      }

      emitChange([...currentImages, ...uploaded]);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to upload image. Please verify file size is under 5MB and try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = (e) => {
    if (e) e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (currentImages.length >= effectiveMax) {
      setError(`Maximum limit of ${effectiveMax} image${effectiveMax > 1 ? "s" : ""} reached.`);
      return;
    }

    setError(null);
    emitChange([...currentImages, { url: trimmed, fileId: "" }]);
    setUrlInput("");
  };

  const handleRemove = (index) => {
    setError(null);
    emitChange(currentImages.filter((_, i) => i !== index));
  };

  const canAddMore = currentImages.length < effectiveMax;

  return (
    <div className="w-full space-y-2 rounded-lg border p-3 bg-muted/20 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label} ({currentImages.length}/{effectiveMax})
        </label>

        {canAddMore && (
          <div className="flex items-center gap-1 bg-background border rounded-md p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                mode === "file"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="size-3 shrink-0" />
              <span>Upload (ImageKit)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("url")}
              className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                mode === "url"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="size-3 shrink-0" />
              <span>URL</span>
            </button>
          </div>
        )}
      </div>

      {/* Image Preview Cards */}
      {currentImages.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-1">
          {currentImages.map((img, i) => {
            const isSingle = singleImage || effectiveMax === 1;
            const rawUrl = typeof img === "string" ? img : img?.url || "";
            const displayUrl =
              typeof rawUrl === "string" && (rawUrl.startsWith("/") || !rawUrl.startsWith("http"))
                ? rawUrl.replace(/\.(png|webp)$/i, ".webp")
                : rawUrl;

            return (
              <div
                key={img.fileId || img.url || i}
                className={
                  isSingle
                    ? "group relative w-full max-w-lg h-48 sm:h-60 overflow-hidden rounded-lg border bg-muted/30 shrink-0 flex items-center justify-center"
                    : "group relative size-20 overflow-hidden rounded-md border bg-background shrink-0"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl}
                  alt=""
                  className={isSingle ? "size-full object-contain" : "size-full object-cover"}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className={
                    isSingle
                      ? "absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-xs font-medium text-white shadow-md transition-opacity hover:bg-destructive"
                      : "absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  }
                  title="Remove image"
                >
                  <X className="size-3.5" />
                  {isSingle && <span>Remove</span>}
                </button>
                {img.fileId && (
                  <span className="absolute bottom-2.5 left-2.5 rounded bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                    ImageKit
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Input Area (Upload or URL) */}
      {canAddMore && (
        <div className="pt-1">
          {mode === "file" ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-4 text-center bg-background">
              {uploading ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Uploading to ImageKit...
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 w-full">
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Click to upload file(s)</span>
                  <span className="text-[10px] text-muted-foreground">
                    PNG, JPG, WEBP up to 5MB ({effectiveMax - currentImages.length} slot{effectiveMax - currentImages.length === 1 ? "" : "s"} remaining)
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    💡 Tip: Upload .WEBP images for 90%+ faster loading & smaller size
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple={!singleImage && effectiveMax > 1}
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <Input
                placeholder="https://example.com/image.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUrl(e);
                  }
                }}
                className="text-xs flex-1"
              />
              <Button
                type="button"
                onClick={handleAddUrl}
                size="sm"
                variant="secondary"
                className="h-9 px-3 text-xs shrink-0"
              >
                <Plus className="size-3.5" />
                Add URL
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-destructive/70 hover:text-destructive shrink-0"
            title="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
