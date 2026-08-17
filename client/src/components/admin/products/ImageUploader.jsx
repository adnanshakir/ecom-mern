"use client";

import { useState } from "react";
import { Loader2, Plus, Upload, Link as LinkIcon, X, CheckCircle2 } from "lucide-react";
import { uploadImages } from "@/services/admin/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImageUploader({
  images = [],
  value,
  onChange,
  maxImages = 4,
  singleImage = false,
  label = "Images",
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
    const remainingSlots = effectiveMax - currentImages.length;

    if (files.length > remainingSlots) {
      setError(
        `You can upload up to ${effectiveMax} image${effectiveMax > 1 ? "s" : ""} — ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`
      );
      return;
    }
    if (files.length === 0) return;

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
      setError(err.response?.data?.message || "Failed to upload image to ImageKit");
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
        <div className="flex flex-wrap gap-2 pt-1">
          {currentImages.map((img, i) => (
            <div
              key={img.fileId || img.url || i}
              className="group relative size-20 overflow-hidden rounded-md border bg-background shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Remove image"
              >
                <X className="size-3" />
              </button>
              {img.fileId && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">
                  IK
                </span>
              )}
            </div>
          ))}
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
            <form onSubmit={handleAddUrl} className="flex gap-2 items-center">
              <Input
                placeholder="https://example.com/image.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="text-xs flex-1"
              />
              <Button type="submit" size="sm" variant="secondary" className="h-9 px-3 text-xs shrink-0">
                <Plus className="size-3.5" />
                Add URL
              </Button>
            </form>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
