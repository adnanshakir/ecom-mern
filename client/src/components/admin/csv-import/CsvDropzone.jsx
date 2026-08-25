"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  FileCheck2,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CsvDropzone({
  file,
  setFile,
  previewing,
  previewError,
  reset,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-3 w-full">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
          }
        }}
      />

      {/* Upload Dropzone Container — Only element with background color */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && !previewing && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 shadow-sm",
          isDragOver
            ? "border-primary bg-primary/10 scale-[1.002]"
            : file
            ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
            : "border-border/80 bg-card hover:bg-accent/40 hover:border-primary/50 cursor-pointer"
        )}
      >
        {previewing ? (
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Loader2 className="size-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Parsing and validating CSV...</p>
              <p className="text-xs text-muted-foreground">Reading headers, row count, and product variants.</p>
            </div>
          </div>
        ) : file ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full p-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <FileCheck2 className="size-6" />
              </div>
              <div className="text-left min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} • Ready for review
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={reset} className="h-8 gap-1 text-xs">
                <X className="size-3.5" />
                Choose different file
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <UploadCloud className="size-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Drag & drop your CSV file here, or <span className="text-primary underline underline-offset-2">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Supports standard CSV files with headers (Max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {previewError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="font-medium">{previewError}</span>
        </div>
      )}
    </div>
  );
}
