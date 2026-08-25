"use client";

import { useState } from "react";
import { FileSpreadsheet, Download, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsvDropzone } from "@/components/admin/csv-import/CsvDropzone";
import { CsvColumnGuideModal, handleDownloadSampleCsv } from "@/components/admin/csv-import/CsvColumnGuideModal";

export function UnifiedCsvImportCard({
  file,
  setFile,
  previewing,
  previewError,
  reset,
}) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="w-full space-y-4 bg-transparent">
      {/* Header Controls Row — No background color on outer container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            Upload Product CSV
          </h2>
          <p className="text-xs text-muted-foreground">
            Import or update catalog items in bulk using CSV files.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSampleCsv}
            className="h-8 gap-1.5 text-xs font-medium bg-card hover:bg-accent"
          >
            <Download className="size-3.5 text-primary" />
            Download Sample CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setGuideOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <HelpCircle className="size-3.5 text-muted-foreground" />
            Column Guide
          </Button>
        </div>
      </div>

      {/* Upload Dropzone Component — Has the background color */}
      <CsvDropzone
        file={file}
        setFile={setFile}
        previewing={previewing}
        previewError={previewError}
        reset={reset}
      />

      {/* Column Guide Modal Dialog Component */}
      <CsvColumnGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}
