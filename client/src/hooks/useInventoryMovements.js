"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getMovements, createMovement, getReconcile } from "@/services/inventory";
import { movementSchema } from "@/schemas/inventory";

export function useInventoryMovements(variantId) {
  const [movements, setMovements] = useState([]);
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
    getMovements(variantId)
      .then(({ data }) => setMovements(data.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load movement history")
      )
      .finally(() => setLoading(false));
  }, [variantId]);

  useEffect(() => {
    fetchMovements();
    setReconcileResult(null);
  }, [fetchMovements]);

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
      fetchMovements();
      setReconcileResult(null); // stale after a new movement — force a re-check
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