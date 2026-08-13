"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
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

const STATUS_STYLES = {
  completed: "bg-emerald-500/10 text-emerald-500",
  rolled_back: "bg-slate-500/10 text-slate-400",
  failed: "bg-red-500/10 text-red-500",
};

export function ImportJobsList({ jobs, showRollback, rollingBackId, onRollback }) {
  const [jobToRollback, setJobToRollback] = useState(null);

  if (!jobs?.length) {
    return <p className="text-sm text-muted-foreground">No imports yet.</p>;
  }

  const handleConfirmRollback = () => {
    if (jobToRollback) {
      onRollback(jobToRollback);
      setJobToRollback(null);
    }
  };

  return (
    <>
      <ul className="grid gap-1">
        {jobs.map((job) => {
          // Server-verified status is the source of truth — a "completed" job
          // with successCount 0 has nothing to undo either way.
          const canRollback = job.status === "completed" && job.successCount > 0;

          return (
            <li
              key={job._id}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{job.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {job.successCount} imported, {job.skippedCount} skipped ·{" "}
                  {new Date(job.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_STYLES[job.status] || "bg-muted text-muted-foreground"
                  )}
                >
                  {job.status.replace("_", " ")}
                </span>
                {showRollback && canRollback && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={rollingBackId === job._id}
                    onClick={() => setJobToRollback(job)}
                    title="Undo this import"
                  >
                    {rollingBackId === job._id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="size-4" />
                    )}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

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
