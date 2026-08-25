"use client";

import { useState } from "react";
import { Loader2, Upload, History, CheckCircle2, RotateCcw } from "lucide-react";

import { useCsvImport } from "@/hooks/admin/useCsvImport";
import { useRecentImports } from "@/hooks/admin/useRecentImports";
import { UnifiedCsvImportCard } from "@/components/admin/csv-import/UnifiedCsvImportCard";
import { ImportHistoryModal } from "@/components/admin/csv-import/ImportHistoryModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RoleGate } from "@/components/admin/RoleGate";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function CsvImportPage() {
  return (
    <RoleGate allow={["super_admin", "admin"]}>
      <CsvImportFlow />
    </RoleGate>
  );
}

function CsvImportFlow() {
  const {
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
    reset,
    confirmState: csvConfirmState,
    handleConfirm: csvHandleConfirm,
    handleCancel: csvHandleCancel,
  } = useCsvImport();

  const recentImports = useRecentImports();
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  return (
    <div className="grid gap-6 w-full">
      {/* Top Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4 w-full">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CSV Product Import</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bulk upload products, variants, pricing, and category hierarchies via CSV.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setHistoryDialogOpen(true)}
          className="gap-2 shrink-0 h-9 font-medium shadow-xs bg-card hover:bg-accent"
        >
          <History className="size-4 text-primary" />
          <span>Import History</span>
          {recentImports.jobs?.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {recentImports.jobs.length}
            </span>
          )}
        </Button>
      </div>

      {/* Main Unified Upload & Guide Card — Outer wrapper is transparent */}
      <UnifiedCsvImportCard
        file={file}
        setFile={setFile}
        previewing={previewing}
        previewError={previewError}
        preview={preview}
        reset={reset}
      />

      {/* Confirm Result Card */}
      {confirmResult && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Import complete
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <p className="text-foreground">
              Imported <span className="font-bold text-emerald-500">{confirmResult.successCount}</span> items,
              skipped <span className="font-bold text-destructive">{confirmResult.skippedCount}</span> items.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryDialogOpen(true)}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5 mr-1" />
                View in history / Undo
              </Button>
              <Button variant="outline" size="sm" onClick={reset} className="h-8 text-xs">
                Start new import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Import Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-[95vw] sm:max-w-4xl flex-col p-0 overflow-hidden">
          <DialogHeader className="shrink-0 border-b p-4 sm:p-6 pb-4">
            <DialogTitle className="text-lg font-semibold">Review CSV Import</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {preview &&
                `${preview.validCount} valid, ${preview.invalidCount} invalid, out of ${preview.totalProducts} products (${preview.totalRows} rows)`}
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <>
              <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 py-4">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Handle</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {preview.products.map((row, i) => (
                      <TableRow key={row.handle || i}>
                        <TableCell className="font-mono text-xs">{row.handle}</TableCell>
                        <TableCell className="font-medium">{row.product?.name || "—"}</TableCell>
                        <TableCell>{row.variants?.length ?? 0}</TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${
                              row.valid ? "text-emerald-500" : "text-destructive"
                            }`}
                          >
                            {row.valid ? "Valid" : "Invalid"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.errors?.length ? row.errors.join("; ") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {confirmError && <p className="mt-4 text-sm text-destructive font-medium">{confirmError}</p>}
              </div>

              <DialogFooter className="shrink-0 border-t bg-muted/30 mx-0 mb-0 px-6 py-4 rounded-b-xl">
                <Button
                  onClick={async () => {
                    await runConfirm();
                    recentImports.fetchJobs();
                  }}
                  disabled={confirming || preview.validCount === 0}
                  className="gap-2"
                >
                  {confirming ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Confirm import ({preview.validCount} rows)
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Import History Modal Dialog Component */}
      <ImportHistoryModal
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        loading={recentImports.loading}
        error={recentImports.error}
        jobs={recentImports.jobs}
        rollingBackId={recentImports.rollingBackId}
        onRollback={recentImports.rollback}
      />

      {/* Confirm dialogs for rollback actions */}
      <ConfirmDialog {...csvConfirmState} onConfirm={csvHandleConfirm} onCancel={csvHandleCancel} />
      <ConfirmDialog
        {...recentImports.confirmState}
        onConfirm={recentImports.handleConfirm}
        onCancel={recentImports.handleCancel}
      />
    </div>
  );
}