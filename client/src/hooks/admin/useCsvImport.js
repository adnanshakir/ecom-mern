"use client";

import { useState, useEffect } from "react";
import { previewImport, confirmImport, rollbackImport } from "@/services/admin/csvImport";
import { useConfirm } from "@/hooks/useConfirm";

export function useCsvImport() {
  const [file, setFile] = useState(null);

  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);

  useEffect(() => {
    if (!file) return;

    setPreviewing(true);
    setPreviewError(null);
    setPreview(null);
    setPreviewDialogOpen(false);
    setConfirmResult(null);
    setConfirmError(null);

    previewImport(file)
      .then(({ data }) => {
        setPreview(data.data);
        setPreviewDialogOpen(true);
      })
      .catch((err) => setPreviewError(err.response?.data?.message || "Failed to parse CSV"))
      .finally(() => setPreviewing(false));
  }, [file]);

  const runConfirm = async () => {
    if (!preview || !file) return;
    setConfirming(true);
    setConfirmError(null);

    try {
      const { data } = await confirmImport(file.name, preview.products);
      setConfirmResult(data.data);
      setPreviewDialogOpen(false);
    } catch (err) {
      setConfirmError(err.response?.data?.message || "Failed to import products");
    } finally {
      setConfirming(false);
    }
  };

  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  const runRollback = () => {
    if (!confirmResult?.importJobId) return;

    requestConfirm({
      title: "Undo import?",
      description: "This will remove all products created by this import.",
      confirmLabel: "Undo import",
      destructive: true,
      onConfirm: async () => {
        await rollbackImport(confirmResult.importJobId);
      },
    });
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setPreviewError(null);
    setPreviewDialogOpen(false);
    setConfirmResult(null);
    setConfirmError(null);
  };

  return {
    file,
    setFile,
    previewing,
    previewError,
    preview,
    previewDialogOpen,
    setPreviewDialogOpen,
    confirming,
    confirmError,
    confirmResult,
    runConfirm,
    runRollback,
    reset,
    confirmState,
    handleConfirm,
    handleCancel,
  };
}