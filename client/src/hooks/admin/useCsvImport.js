"use client";

import { useState, useEffect } from "react";
import { previewImport, confirmImport, rollbackImport } from "@/services/admin/csvImport";

export function useCsvImport() {
  const [file, setFile] = useState(null);

  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);

  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState(null);
  const [rolledBack, setRolledBack] = useState(false);

  useEffect(() => {
    if (!file) return;

    setPreviewing(true);
    setPreviewError(null);
    setPreview(null);
    setPreviewDialogOpen(false);
    setConfirmResult(null);
    setConfirmError(null);
    setRolledBack(false);
    setRollbackError(null);

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

  const runRollback = async () => {
    if (!confirmResult?.importJobId) return;
    if (!window.confirm("Undo this import? This removes all products it created.")) return;

    setRollingBack(true);
    setRollbackError(null);

    try {
      await rollbackImport(confirmResult.importJobId);
      setRolledBack(true);
    } catch (err) {
      setRollbackError(err.response?.data?.message || "Failed to roll back import");
    } finally {
      setRollingBack(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setPreviewError(null);
    setPreviewDialogOpen(false);
    setConfirmResult(null);
    setConfirmError(null);
    setRolledBack(false);
    setRollbackError(null);
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
    rollingBack,
    rollbackError,
    rolledBack,
    runRollback,
    reset,
  };
}