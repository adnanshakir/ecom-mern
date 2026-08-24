"use client";

import { useState, useCallback } from "react";

/**
 *
 * Usage:
 *   const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();
 *
 *   // Trigger a confirm dialog:
 *   requestConfirm({
 *     title: "Delete brand?",
 *     description: 'This will permanently delete "Nike".',
 *     onConfirm: async () => { await deleteBrand(id); },
 *     destructive: true,
 *   });
 *
 *   // Render <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
 */
export function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Delete",
    destructive: true,
    loading: false,
    error: null,
    onConfirm: null,
  });

  const requestConfirm = useCallback(
    ({ title, description, confirmLabel, destructive = true, onConfirm }) => {
      setConfirmState({
        open: true,
        title,
        description,
        confirmLabel: confirmLabel || "Delete",
        destructive,
        loading: false,
        error: null,
        onConfirm,
      });
    },
    []
  );

  const handleCancel = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, open: false, error: null }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmState.onConfirm) return;

    setConfirmState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await confirmState.onConfirm();
      setConfirmState((prev) => ({ ...prev, open: false, loading: false }));
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        (typeof err === "string" ? err : "Something went wrong");
      setConfirmState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [confirmState.onConfirm]);

  return { confirmState, requestConfirm, handleConfirm, handleCancel };
}
