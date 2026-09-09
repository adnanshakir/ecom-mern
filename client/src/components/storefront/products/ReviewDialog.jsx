"use client";

import { useState, useEffect } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/admin/products/ImageUploader";
import { uploadReviewImages } from "@/services/storefront/reviews";

/**
 * ReviewDialog — shadcn Dialog for writing / editing a product review.
 *
 * @param {boolean}  open
 * @param {Function} onOpenChange
 * @param {object|null} existingReview — pre-fill when editing
 * @param {Function} onSubmit  — (data) => Promise<{success, error?}>
 * @param {boolean}  submitting
 */
export function ReviewDialog({
  open,
  onOpenChange,
  existingReview = null,
  onSubmit,
  submitting = false,
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState([]);
  const [formError, setFormError] = useState(null);

  const isEditing = !!existingReview;

  // Pre-fill form when editing
  useEffect(() => {
    if (open && existingReview) {
      setRating(existingReview.rating || 0);
      setTitle(existingReview.title || "");
      setBody(existingReview.body || "");
      setImages(existingReview.images || []);
      setFormError(null);
    } else if (open && !existingReview) {
      setRating(0);
      setTitle("");
      setBody("");
      setImages([]);
      setFormError(null);
    }
  }, [open, existingReview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (rating === 0) {
      setFormError("Please select a star rating.");
      return;
    }

    const result = await onSubmit({
      rating,
      title: title.trim(),
      body: body.trim(),
      images,
    });

    if (result.success) {
      toast.success(isEditing ? "Review updated!" : "Review submitted!");
      onOpenChange(false);
    } else {
      setFormError(result.error || "Something went wrong.");
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center">
            {isEditing ? "Edit Your Review" : "Write a Review"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isEditing
              ? "Update your rating and comments below."
              : "Share your experience with this product."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5 pt-2">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Rating</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`size-8 transition-colors ${
                      star <= displayRating
                        ? "fill-red-500 text-red-500"
                        : "fill-none text-slate-300 dark:text-slate-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][displayRating]}
              </span>
            )}
          </div>

          {/* Review Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="review-title" className="text-sm font-semibold text-foreground">
                Review Title
              </label>
              <span className="text-[11px] text-muted-foreground">
                {title.length}/100
              </span>
            </div>
            <Input
              id="review-title"
              placeholder="Give your review a title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              maxLength={100}
            />
          </div>

          {/* Review Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="review-body" className="text-sm font-semibold text-foreground">
                Review Content
              </label>
              <span className="text-[11px] text-muted-foreground">
                {body.length}/2000
              </span>
            </div>
            <Textarea
              id="review-body"
              placeholder="Start writing here..."
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              maxLength={2000}
              className="min-h-24 resize-y"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-foreground">
              Picture (optional)
            </span>
            <p className="text-[11px] text-muted-foreground">
              Max 4 images, each less than 5MB
            </p>
            <ImageUploader
              images={images}
              onChange={setImages}
              maxImages={4}
              uploadOnly
              uploadService={uploadReviewImages}
              label="Review Images"
            />
          </div>

          {/* Form Error */}
          {formError && (
            <p className="text-sm text-destructive text-center font-medium">
              {formError}
            </p>
          )}

          {/* Footer Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel review
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating === 0}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold"
            >
              {submitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              {isEditing ? "Update Review" : "Submit Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
