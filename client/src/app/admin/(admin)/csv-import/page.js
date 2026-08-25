"use client";

import { Loader2, Upload } from "lucide-react";

import { useCsvImport } from "@/hooks/admin/useCsvImport";
import { useRecentImports } from "@/hooks/admin/useRecentImports";
import { ImportJobsList } from "@/components/admin/csv-import/ImportJobsList";
import { CsvHeaderGuide } from "@/components/admin/csv-import/CsvHeaderGuide";
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

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">CSV Import</h1>

      <CsvHeaderGuide />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />

          {previewing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Parsing and validating...
            </div>
          )}

          {previewError && <p className="text-sm text-destructive">{previewError}</p>}

          {(preview || confirmResult) && (
            <Button variant="outline" className="w-fit" onClick={reset}>
              Start over
            </Button>
          )}
        </CardContent>
      </Card>

      {confirmResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Import complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Imported <span className="text-emerald-500">{confirmResult.successCount}</span>,
              skipped <span className="text-destructive">{confirmResult.skippedCount}</span> — see
              Recent Imports below to undo if needed.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-[95vw] sm:max-w-4xl flex-col p-0">
          <DialogHeader className="shrink-0 border-b p-4 sm:p-6 pb-4">
            <DialogTitle>Review import</DialogTitle>
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
                    <TableRow>
                      <TableHead>Handle</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.products.map((row, i) => (
                      <TableRow key={row.handle || i}>
                        <TableCell>{row.handle}</TableCell>
                        <TableCell>{row.product?.name || "—"}</TableCell>
                        <TableCell>{row.variants?.length ?? 0}</TableCell>
                        <TableCell>
                          <span className={row.valid ? "text-emerald-500" : "text-destructive"}>
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

                {confirmError && <p className="mt-4 text-sm text-destructive">{confirmError}</p>}
              </div>

              <DialogFooter className="shrink-0 border-t bg-muted/30 mx-0 mb-0 px-6 py-4 rounded-b-xl">
                <Button
                  onClick={async () => {
                    await runConfirm();
                    recentImports.fetchJobs();
                  }}
                  disabled={confirming || preview.validCount === 0}
                >
                  {confirming && <Loader2 className="animate-spin" />}
                  <Upload className="size-4" />
                  Confirm import ({preview.validCount} rows)
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent imports</CardTitle>
        </CardHeader>
        <CardContent>
          {recentImports.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </div>
          ) : recentImports.error ? (
            <p className="text-sm text-destructive">{recentImports.error}</p>
          ) : (
            <ImportJobsList
              jobs={recentImports.jobs}
              showRollback
              rollingBackId={recentImports.rollingBackId}
              onRollback={recentImports.rollback}
            />
          )}
        </CardContent>
      </Card>

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