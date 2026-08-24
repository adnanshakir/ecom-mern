"use client";

import { useState } from "react";
import { Loader2, RotateCcw, FileSpreadsheet, CheckCircle2, AlertTriangle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  rolled_back: {
    label: "Rolled back",
    style: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20",
    icon: Undo2,
  },
  failed: {
    label: "Failed",
    style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: AlertTriangle,
  },
};

export function ImportJobsList({ jobs, showRollback, rollingBackId, onRollback }) {
  const [jobToRollback, setJobToRollback] = useState(null);

  if (!jobs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center">
          <FileSpreadsheet className="size-5" />
        </div>
        <p className="text-sm font-medium text-foreground">No Recent Import Jobs</p>
        <p className="text-xs">CSV imports executed in the portal will appear here.</p>
      </div>
    );
  }

  const handleConfirmRollback = () => {
    if (jobToRollback) {
      onRollback(jobToRollback);
      setJobToRollback(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {jobs.map((job) => {
          const canRollback = job.status === "completed" && job.successCount > 0;
          const statusConfig = STATUS_CONFIG[job.status] || {
            label: job.status?.replace("_", " ") || "Processing",
            style: "bg-muted text-muted-foreground border-border",
            icon: FileSpreadsheet,
          };
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={job._id}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs transition-all hover:bg-accent/40 hover:border-border"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <FileSpreadsheet className="size-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate font-semibold text-foreground text-xs sm:text-sm group-hover:text-primary transition-colors">
                    {job.fileName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{job.successCount || 0}</span> imported,{" "}
                    <span>{job.skippedCount || 0}</span> skipped
                    {job.user?.name && <span className="hidden sm:inline"> · by {job.user.name}</span>}
                    <span> · {timeAgo(job.createdAt)}</span>
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-0 border-border/40">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border capitalize",
                    statusConfig.style
                  )}
                >
                  <StatusIcon className="size-3" />
                  {statusConfig.label}
                </span>

                {showRollback && canRollback && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                    disabled={rollingBackId === job._id}
                    onClick={() => setJobToRollback(job)}
                    title="Undo this import"
                  >
                    {rollingBackId === job._id ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <RotateCcw className="size-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!jobToRollback} onOpenChange={(open) => !open && setJobToRollback(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Import</AlertDialogTitle>
            <AlertDialogDescription>
              Undo import &quot;{jobToRollback?.fileName}&quot;? This will remove all products, variants, categories, and brands created by this import.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmRollback}>
              Undo import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
