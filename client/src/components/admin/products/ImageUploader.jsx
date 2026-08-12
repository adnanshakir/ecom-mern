"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { uploadImages } from "@/services/admin/images";
import Image from "next/image";

// images: array of {url, fileId}. multiple=false caps at one image (used
// for a variant's single optional image); multiple=true allows up to
// maxImages (used for the product-level gallery).
export function ImageUploader({ images, onChange, multiple = true, maxImages = 8 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const MAX_PER_REQUEST = 4;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    const remainingSlots = maxImages - images.length;

    if (files.length > remainingSlots) {
      setError(
        `You can upload up to ${maxImages} image${maxImages > 1 ? "s" : ""} here — ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`
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

      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={img.fileId || img || i} className="group relative size-20 overflow-hidden rounded-md border">
            <Image src={img.url || img} alt="" fill className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
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
              multiple
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
