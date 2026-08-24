"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/**
 * A reusable confirm dialog powered by shadcn's AlertDialog.
 *
 * Props come directly from useConfirm's confirmState + handlers.
 *
 * @param {boolean} open
 * @param {string}  title
 * @param {string}  description
 * @param {string}  confirmLabel   – button text (default "Delete")
 * @param {boolean} destructive    – uses destructive button style
 * @param {boolean} loading        – shows spinner, disables buttons
 * @param {string|null} error      – inline error message
 * @param {() => void}  onConfirm
 * @param {() => void}  onCancel
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel?.()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="text-sm text-destructive px-1">{error}</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            variant={destructive ? "destructive" : "default"}
            onClick={(e) => {
              // Prevent AlertDialog from auto-closing — we close only on success.
              e.preventDefault();
              onConfirm?.();
            }}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
