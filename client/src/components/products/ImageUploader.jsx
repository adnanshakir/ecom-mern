"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { uploadImages } from "@/services/images";

// images: array of {url, fileId}. multiple=false caps at one image (used
// for a variant's single optional image); multiple=true allows up to
// maxImages (used for the product-level gallery).
export function ImageUploader({ images, onChange, multiple = true, maxImages = 8 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const MAX_PER_REQUEST = 4;

  const handleFiles = async (fileList) => {
    const remainingSlots = multiple ? maxImages - images.length : 1;
    const files = Array.from(fileList).slice(0, remainingSlots);
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

      onChange(multiple ? [...images, ...uploaded] : uploaded);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index) => onChange(images.filter((_, i) => i !== index));
  const canAddMore = multiple ? images.length < maxImages : images.length < 1;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={img.fileId || i} className="group relative size-20 overflow-hidden rounded-md border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:bg-accent">
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="size-4" />
                <span className="text-[10px]">Upload</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
