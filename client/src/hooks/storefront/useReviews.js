"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getProductReviews,
  getReviewSummary,
  getMyReview,
  createReview as createReviewApi,
  updateReview as updateReviewApi,
  deleteReview as deleteReviewApi,
} from "@/services/storefront/reviews";

/**
 * useReviews — manages review data, summary stats, pagination, sorting,
 * and authenticated CRUD operations for a given product.
 *
 * @param {string} productId
 * @param {boolean} isAuthenticated — whether the customer is logged in
 */
export function useReviews(productId, isAuthenticated = false) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [myReview, setMyReview] = useState(null); // the current customer's review (or null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("most_recent");
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [submitting, setSubmitting] = useState(false);

  const limit = 10;

  // ─── Fetch reviews list ─────────────────────────────────────────────

  const fetchReviews = useCallback(
    async (fetchPage = 1, fetchSort = sort) => {
      if (!productId) return;
      try {
        const { data } = await getProductReviews(productId, {
          page: fetchPage,
          limit,
          sort: fetchSort,
        });
        setReviews(data.data);
        setPagination(data.pagination);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load reviews");
      }
    },
    [productId, sort]
  );

  // ─── Fetch summary ─────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    if (!productId) return;
    try {
      const { data } = await getReviewSummary(productId);
      setSummary(data.data);
    } catch {
      // Non-critical — summary will stay at defaults
    }
  }, [productId]);

  // ─── Fetch my review (if authenticated) ─────────────────────────────

  const fetchMyReview = useCallback(async () => {
    if (!productId || !isAuthenticated) {
      setMyReview(null);
      return;
    }
    try {
      const { data } = await getMyReview(productId);
      setMyReview(data.data || null);
    } catch {
      setMyReview(null);
    }
  }, [productId, isAuthenticated]);

  // ─── Refetch when productId or isAuthenticated changes ──────────────

  const fetchKey = `${productId}_${isAuthenticated}`;
  const lastFetchKey = useRef(null);

  useEffect(() => {
    if (!productId || fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;

    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      setPage(1);
      setSort("most_recent");
      await Promise.all([fetchReviews(1, "most_recent"), fetchSummary(), fetchMyReview()]);
      if (!cancelled) setLoading(false);
    };
    loadAll();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, productId, fetchReviews, fetchSummary, fetchMyReview]);

  // ─── Refetch when page or sort changes (user-driven) ────────────────

  const changePage = useCallback(
    (newPage) => {
      setPage(newPage);
      fetchReviews(newPage, sort);
    },
    [fetchReviews, sort]
  );

  const changeSort = useCallback(
    (newSort) => {
      setSort(newSort);
      setPage(1);
      fetchReviews(1, newSort);
    },
    [fetchReviews]
  );

  // ─── Mutations ──────────────────────────────────────────────────────

  const refetchAll = useCallback(async () => {
    await Promise.all([fetchReviews(1, sort), fetchSummary(), fetchMyReview()]);
    setPage(1);
  }, [fetchReviews, fetchSummary, fetchMyReview, sort]);

  const submitReview = useCallback(
    async (reviewData) => {
      setSubmitting(true);
      try {
        await createReviewApi(productId, reviewData);
        await refetchAll();
        return { success: true };
      } catch (err) {
        const message =
          err.response?.data?.message || "Failed to submit review";
        return { success: false, error: message };
      } finally {
        setSubmitting(false);
      }
    },
    [productId, refetchAll]
  );

  const editReview = useCallback(
    async (reviewId, reviewData) => {
      setSubmitting(true);
      try {
        await updateReviewApi(reviewId, reviewData);
        await refetchAll();
        return { success: true };
      } catch (err) {
        const message =
          err.response?.data?.message || "Failed to update review";
        return { success: false, error: message };
      } finally {
        setSubmitting(false);
      }
    },
    [refetchAll]
  );

  const removeReview = useCallback(
    async (reviewId) => {
      setSubmitting(true);
      try {
        await deleteReviewApi(reviewId);
        await refetchAll();
        return { success: true };
      } catch (err) {
        const message =
          err.response?.data?.message || "Failed to delete review";
        return { success: false, error: message };
      } finally {
        setSubmitting(false);
      }
    },
    [refetchAll]
  );

  return {
    reviews,
    summary,
    myReview,
    loading,
    error,
    page,
    sort,
    pagination,
    submitting,
    changePage,
    changeSort,
    submitReview,
    editReview,
    removeReview,
  };
}
