"use client";

import { History, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImportJobsList } from "@/components/admin/csv-import/ImportJobsList";

export function ImportHistoryModal({
  open,
  onOpenChange,
  loading,
  error,
  jobs,
  rollingBackId,
  onRollback,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-[95vw] sm:max-w-3xl flex-col p-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b p-4 sm:p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <History className="size-5 text-primary" />
            Import History &amp; Recent Jobs
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm mt-1">
            View executed CSV import jobs and revert changes if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Loading import history...
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4 text-center">{error}</p>
          ) : (
            <ImportJobsList
              jobs={jobs}
              showRollback
              rollingBackId={rollingBackId}
              onRollback={onRollback}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
