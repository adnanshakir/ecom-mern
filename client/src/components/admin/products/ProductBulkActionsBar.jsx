"use client";

import { Button } from "@/components/ui/button";

export function ProductBulkActionsBar({
  selectedIds,
  productsLength,
  toggleSelectAll,
  handleBulkStatusChange,
  handleBulkDelete,
  onCancel,
}) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">{selectedIds.length} selected</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSelectAll}
          className="h-7 px-2 text-xs"
        >
          {selectedIds.length === productsLength && productsLength > 0 ? "Deselect all" : "Select all on page"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange("active")} className="h-7 text-xs">
          Set Active
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange("draft")} className="h-7 text-xs">
          Set Draft
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange("archived")} className="h-7 text-xs">
          Set Archived
        </Button>
        <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-7 text-xs">
          Delete ({selectedIds.length})
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="h-7 px-2 text-xs text-muted-foreground"
      >
        Cancel
      </Button>
    </div>
  );
}
