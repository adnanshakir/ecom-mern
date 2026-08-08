"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getMovements, createMovement, getReconcile } from "@/services/inventory";
import { movementSchema } from "@/schemas/inventory";

const LIMIT = 20;

export function useInventoryMovements(variantId) {
  const [movements, setMovements] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reconcileResult, setReconcileResult] = useState(null);
  const [reconciling, setReconciling] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: "restock", quantity: "", reason: "" },
  });

  const fetchMovements = useCallback(() => {
    if (!variantId) return;
    setLoading(true);
    setError(null);
    getMovements(variantId, { page, limit: LIMIT })
      .then(({ data }) => {
        setMovements(data.data);
        setPagination(data.pagination);
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load movement history")
      )
      .finally(() => setLoading(false));
  }, [variantId, page]);

  useEffect(() => {
    fetchMovements();
    setReconcileResult(null);
  }, [fetchMovements]);

  // Switching variants should always start back at page 1.
  useEffect(() => {
    setPage(1);
  }, [variantId]);

  const openCreateDialog = () => {
    setFormError(null);
    form.reset({ type: "restock", quantity: "", reason: "" });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormError(null);
    form.reset();
  };

  const submit = async (values) => {
    try {
      setSubmitting(true);
      setFormError(null);
      await createMovement({
        variantId,
        ...values,
        reason: values.reason || undefined,
      });
      closeDialog();
      setPage(1); // a new movement should be visible immediately, on page 1
      fetchMovements();
      setReconcileResult(null);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to record movement");
    } finally {
      setSubmitting(false);
    }
  };

  const reconcile = async () => {
    setReconciling(true);
    try {
      const { data } = await getReconcile(variantId);
      setReconcileResult(data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reconcile stock");
    } finally {
      setReconciling(false);
    }
  };

  return {
    movements,
    page,
    setPage,
    pagination,
    loading,
    error,

    dialogOpen,
    setDialogOpen,
    form,
    formError,
    submitting,

    openCreateDialog,
    closeDialog,
    submit,

    reconcileResult,
    reconciling,
    reconcile,

    fetchMovements,
  };
}