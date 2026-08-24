"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, FileUp, Activity, User } from "lucide-react";
import { ActionBadge, RoleBadge } from "@/components/admin/dashboard/ActivityBadges";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ACTION_ICONS = {
  create: { icon: Plus, color: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20" },
  update: { icon: Edit, color: "bg-amber-500/10 text-amber-500 ring-amber-500/20" },
  delete: { icon: Trash2, color: "bg-rose-500/10 text-rose-500 ring-rose-500/20" },
  import: { icon: FileUp, color: "bg-blue-500/10 text-blue-500 ring-blue-500/20" },
};

export function ActivityLog({ items = [] }) {
  const [selected, setSelected] = useState(null);

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center">
          <Activity className="size-5" />
        </div>
        <p className="text-sm font-medium text-foreground">No Recent Activity</p>
        <p className="text-xs">Events will appear as changes occur.</p>
      </div>
    );
  }

  return (
    <>
      {/* Scrollable list — fills full available card height */}
      <div className="h-full overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        {items.map((log) => {
          const actionConfig = ACTION_ICONS[log.action] || { icon: Activity, color: "bg-blue-500/10 text-blue-500 ring-blue-500/20" };
          const IconComponent = actionConfig.icon;

          return (
            <button
              key={log._id}
              type="button"
              onClick={() => setSelected(log)}
              className="group flex w-full items-start gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-left text-xs transition-all hover:bg-accent/60 hover:border-border overflow-hidden"
            >
              {/* Action Icon */}
              <div className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ring-1", actionConfig.color)}>
                <IconComponent className="size-3" />
              </div>

              {/* Content — all truncated to prevent overflow */}
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-semibold text-foreground truncate text-[12px] group-hover:text-primary transition-colors">
                    {log.resource}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                    {timeAgo(log.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 overflow-hidden">
                  <ActionBadge action={log.action} />
                  <span className="truncate">
                    by {log.user?.name || "System"}
                  </span>
                  <RoleBadge role={log.user?.role} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Activity Details Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <ActionBadge action={selected.action} />
                  <span>{selected.resource}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-3 text-xs sm:text-sm py-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="size-3.5" /> Performed By
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    {selected.user?.name || "Unknown"}
                    <RoleBadge role={selected.user?.role} />
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Timestamp</span>
                  <span className="font-medium">{new Date(selected.createdAt).toLocaleString()}</span>
                </div>
                {selected.resourceId && (
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">Resource ID</span>
                    <span className="font-mono text-xs font-semibold">{selected.resourceId}</span>
                  </div>
                )}
                {selected.description && (
                  <div className="pt-2 bg-muted/30 p-2.5 rounded-md border border-border/40">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Description</p>
                    <p className="text-xs text-foreground leading-relaxed">{selected.description}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}