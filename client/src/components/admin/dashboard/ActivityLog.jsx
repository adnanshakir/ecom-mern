"use client";

import { useState } from "react";
import { ActionBadge, RoleBadge } from "@/components/admin/dashboard/ActivityBadges";
import { timeAgo } from "@/lib/time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ActivityLog({ items }) {
  const [selected, setSelected] = useState(null);

  if (!items?.length) {
    return <p className="text-sm text-muted-foreground">No recent activity.</p>;
  }

  return (
    <>
      <ul className="grid gap-1">
        {items.map((log) => (
          <li key={log._id}>
            <button
              type="button"
              onClick={() => setSelected(log)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
            >
              <div className="flex min-w-0 items-center gap-2">
                <ActionBadge action={log.action} />
                <span className="truncate">
                  {log.resource}
                  <span className="text-muted-foreground"> · {log.user?.name || "Someone"}</span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <RoleBadge role={log.user?.role} />
                <span className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ActionBadge action={selected.action} />
                  <span>{selected.resource}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">By</span>
                  <span className="flex items-center gap-2">
                    {selected.user?.name || "Unknown"}
                    <RoleBadge role={selected.user?.role} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">When</span>
                  <span>{new Date(selected.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Resource ID</span>
                  <span className="font-mono text-xs">{selected.resourceId}</span>
                </div>
                <div className="border-t pt-3">
                  <p>{selected.description}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}