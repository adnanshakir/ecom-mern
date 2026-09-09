"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageSquarePlus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useReviews } from "@/hooks/storefront/useReviews";
import { ReviewDialog } from "@/components/storefront/products/ReviewDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─────────────────────── Helpers ───────────────────────

function StarRating({ rating, size = "sm", className = "" }) {
  const sizes = { xs: "size-3", sm: "size-3.5", md: "size-4", lg: "size-5" };
  const starSize = sizes[size] || sizes.sm;
  const fraction = rating - Math.floor(rating);
  const fullStars = Math.floor(rating) + (fraction >= 0.75 ? 1 : 0);
  const hasHalf = fraction >= 0.25 && fraction < 0.75;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-px", className)}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className={cn(starSize, "fill-red-500 text-red-500")} />
      ))}
      {hasHalf && (
        <div className="relative">
          <Star className={cn(starSize, "text-slate-300 dark:text-slate-600")} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={cn(starSize, "fill-red-500 text-red-500")} />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className={cn(starSize, "fill-none text-slate-300 dark:text-slate-600")} />
      ))}
    </div>
  );
}

function formatReviewDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─────────────────────── Main Component ───────────────────────

export function ProductReviewSection({ productId }) {
  const isAuthenticated = useSelector((s) => s.customerAuth.status === "authenticated");

  const {
    reviews,
    summary,
    myReview,
    loading,
    page,
    sort,
    pagination,
    submitting,
    changePage,
    changeSort,
    submitReview,
    editReview,
    removeReview,
  } = useReviews(productId, isAuthenticated);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      toast.error("Please log in to write a review.");
      return;
    }
    // If customer already has a review, open in edit mode
    if (myReview) {
      setEditingReview(myReview);
    } else {
      setEditingReview(null);
    }
    setDialogOpen(true);
  };

  const handleEditReview = () => {
    if (myReview) {
      setEditingReview(myReview);
      setDialogOpen(true);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview?._id) return;
    setDeletingId(myReview._id);
    const result = await removeReview(myReview._id);
    if (result.success) {
      toast.success("Review deleted.");
    } else {
      toast.error(result.error);
    }
    setDeletingId(null);
  };

  const handleDialogSubmit = async (data) => {
    if (editingReview?._id) {
      return await editReview(editingReview._id, data);
    }
    return await submitReview(data);
  };

  const { averageRating, totalReviews, distribution } = summary;
  const maxDistribution = Math.max(...Object.values(distribution), 1);

  if (loading) {
    return (
      <section className="space-y-6 py-8 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground">
          Customer Reviews
        </h2>
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading reviews...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 py-8 border-t border-slate-200 dark:border-slate-800">
      {/* Section Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground">
        Customer Reviews
      </h2>

      {/* ─── Summary Row ─── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-center">
        {/* Left: Average Rating */}
        <div className="flex flex-col items-center gap-1.5">
          <StarRating rating={averageRating} size="lg" />
          <p className="text-lg font-bold text-foreground">
            {averageRating > 0 ? averageRating.toFixed(2) : "0"}{" "}
            <span className="text-sm font-normal text-muted-foreground">out of 5</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Based on {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Center: Distribution Bars — separated by subtle vertical dividers on md+ */}
        <div className="hidden md:block w-px h-24 bg-slate-200 dark:bg-slate-700" />
        <div className="md:hidden h-px w-full bg-slate-200 dark:bg-slate-700" />

        <div className="flex flex-col sm:flex-row md:flex-col items-center sm:items-start md:items-center gap-4">
          {/* Bars */}
          <div className="flex flex-col gap-1 w-full max-w-xs">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-0.5 w-16 shrink-0 justify-end">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-2.5",
                        i < star ? "fill-red-500 text-red-500" : "fill-none text-slate-300 dark:text-slate-600"
                      )}
                    />
                  ))}
                </div>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{
                      width: totalReviews > 0 ? `${(distribution[star] / maxDistribution) * 100}%` : "0%",
                    }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground font-medium tabular-nums">
                  {distribution[star]}
                </span>
              </div>
            ))}
          </div>

          {/* Write a Review CTA */}
          <Button
            onClick={handleWriteReview}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 h-10 text-sm shadow-sm shrink-0 w-full sm:w-auto"
          >
            {myReview ? "Edit Your Review" : "Write a Review"}
          </Button>
        </div>
      </div>

      {/* ─── Empty State ─── */}
      {totalReviews === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <MessageSquarePlus className="size-7 text-slate-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-semibold text-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Be the first to share your thoughts about this product. Your review helps others make better decisions!
            </p>
          </div>
          <Button
            onClick={handleWriteReview}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 h-10"
          >
            Write the First Review
          </Button>
        </div>
      )}

      {/* ─── Reviews List ─── */}
      {totalReviews > 0 && (
        <>
          {/* See All Reviews toggle + Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {!showAllReviews ? (
              <button
                type="button"
                onClick={() => setShowAllReviews(true)}
                className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                See All Reviews
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <label htmlFor="review-sort" className="text-xs font-semibold text-muted-foreground">
                  Sort:
                </label>
                <select
                  id="review-sort"
                  value={sort}
                  onChange={(e) => changeSort(e.target.value)}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 cursor-pointer"
                >
                  <option value="most_recent">Most Recent</option>
                  <option value="highest_rated">Highest Rated</option>
                  <option value="lowest_rated">Lowest Rated</option>
                </select>
              </div>
            )}

            {showAllReviews && (
              <button
                type="button"
                onClick={() => setShowAllReviews(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Collapse
              </button>
            )}
          </div>

          {/* Review Cards */}
          {showAllReviews && (
            <div className="space-y-0 divide-y divide-slate-200 dark:divide-slate-800">
              {reviews.map((review) => {
                const isOwn = myReview?._id === review._id;
                return (
                  <div key={review._id} className="py-5 first:pt-0 last:pb-0 space-y-2.5">
                    {/* Stars + Date */}
                    <div className="flex items-center justify-between gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-[11px] text-muted-foreground">
                        {formatReviewDate(review.createdAt)}
                      </span>
                    </div>

                    {/* Customer Name + Edited Badge */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="size-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-[10px] font-bold uppercase">
                          {review.customerName?.charAt(0) || "?"}
                        </div>
                        <span className="text-sm font-semibold text-red-500">
                          {review.customerName}
                        </span>
                      </div>
                      {review.isEdited && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          edited
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    {review.title && (
                      <p className="font-bold text-sm text-foreground">{review.title}</p>
                    )}

                    {/* Body */}
                    {review.body && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.body}
                      </p>
                    )}

                    {/* Images */}
                    {review.images?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {review.images.map((img, idx) => (
                          <button
                            key={img.fileId || img.url || idx}
                            type="button"
                            onClick={() => setLightboxImg(img.url)}
                            className="relative size-16 sm:size-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-red-500/50 transition-all cursor-pointer group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt=""
                              className="size-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Own review actions */}
                    {isOwn && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={handleEditReview}
                        >
                          <Pencil className="size-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleDeleteReview}
                          disabled={deletingId === review._id}
                        >
                          {deletingId === review._id ? (
                            <Loader2 className="size-3 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="size-3 mr-1" />
                          )}
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {showAllReviews && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-4">
              <button
                type="button"
                onClick={() => changePage(1)}
                disabled={page === 1}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="First page"
              >
                <ChevronsLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>

              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter((p) => {
                  // Show at most 5 page numbers around current page
                  if (pagination.pages <= 5) return true;
                  if (p === 1 || p === pagination.pages) return true;
                  return Math.abs(p - page) <= 1;
                })
                .reduce((acc, p, i, arr) => {
                  // Insert ellipsis markers
                  if (i > 0 && p - arr[i - 1] > 1) {
                    acc.push({ type: "ellipsis", key: `e-${p}` });
                  }
                  acc.push({ type: "page", key: p, value: p });
                  return acc;
                }, [])
                .map((item) =>
                  item.type === "ellipsis" ? (
                    <span key={item.key} className="px-1 text-xs text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => changePage(item.value)}
                      className={cn(
                        "min-w-[28px] h-7 rounded text-xs font-semibold transition-colors cursor-pointer",
                        item.value === page
                          ? "bg-red-500 text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {item.value}
                    </button>
                  )
                )}

              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page === pagination.pages}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => changePage(pagination.pages)}
                disabled={page === pagination.pages}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Last page"
              >
                <ChevronsRight className="size-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ─── Review Dialog ─── */}
      <ReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingReview={editingReview}
        onSubmit={handleDialogSubmit}
        submitting={submitting}
      />

      {/* ─── Image Lightbox ─── */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImg}
            alt=""
            className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
