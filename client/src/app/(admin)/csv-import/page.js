"use client";

import { Loader2, Upload, RotateCcw } from "lucide-react";

import { useCsvImport } from "@/hooks/useCsvImport";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

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
    runPreview,
    confirming,
    confirmError,
    confirmResult,
    runConfirm,
    rollingBack,
    rollbackError,
    rolledBack,
    runRollback,
    reset,
  } = useCsvImport();

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">CSV Import</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">1. Upload &amp; preview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />

          <div className="flex gap-2">
            <Button onClick={runPreview} disabled={!file || previewing}>
              {previewing && <Loader2 className="animate-spin" />}
              <Upload className="size-4" />
              Preview
            </Button>
            {(preview || confirmResult) && (
              <Button variant="outline" onClick={reset}>
                Start over
              </Button>
            )}
          </div>

          {previewError && <p className="text-sm text-destructive">{previewError}</p>}
        </CardContent>
      </Card>

      {preview && !confirmResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              2. Review — {preview.validCount} valid, {preview.invalidCount} invalid, out of {preview.totalProducts}{" "}
              products ({preview.totalRows} rows)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
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

            <div className="flex items-center gap-3">
              <Button onClick={runConfirm} disabled={confirming || preview.validCount === 0}>
                {confirming && <Loader2 className="animate-spin" />}
                Confirm import ({preview.validCount} rows)
              </Button>
              {preview.validCount === 0 && (
                <span className="text-sm text-muted-foreground">
                  No valid rows to import — fix the CSV and re-upload.
                </span>
              )}
            </div>

            {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
          </CardContent>
        </Card>
      )}

      {confirmResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">3. Import complete</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm">
              Imported <span className="text-emerald-500">{confirmResult.successCount}</span>, skipped{" "}
              <span className="text-destructive">{confirmResult.skippedCount}</span> — all imported products are set to{" "}
              <span className="font-medium">draft</span> status.
            </p>

            {confirmResult.errors?.length > 0 && (
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {confirmResult.errors.map((err, i) => (
                  <li key={i}>• {typeof err === "string" ? err : err.message}</li>
                ))}
              </ul>
            )}

            {!rolledBack ? (
              <Button
                variant="outline"
                className="w-fit"
                onClick={runRollback}
                disabled={rollingBack || confirmResult.successCount === 0}
              >
                {rollingBack && <Loader2 className="animate-spin" />}
                <RotateCcw className="size-4" />
                Undo this import
              </Button>
            ) : (
              <p className="text-sm text-emerald-500">Import rolled back.</p>
            )}

            {rollbackError && <p className="text-sm text-destructive">{rollbackError}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
