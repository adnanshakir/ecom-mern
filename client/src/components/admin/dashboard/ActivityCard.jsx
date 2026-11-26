"use client";

import { Activity, Pencil, Plus, Trash2 } from "lucide-react";
import SectionCard from "@/components/admin/dashboard/SectionCard";
import { timeAgo } from "@/lib/time";

const ACTION_ICONS = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_VERBS = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

const RESOURCE_LABELS = {
  Product: "Product",
  ProductVariant: "Product Variant",
  Category: "Category",
  Brand: "Brand",
  User: "User",
  ImportJob: "Import Job",
};

export function ActivityCard({ items = [] }) {
  const recentItems = (items || []).slice(0, 5);

  return (
    <SectionCard title="Recent activity" icon={Activity}>
      {recentItems.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" strokeWidth={1.75} />
          <span>No recent activity</span>
        </div>
      ) : (
        <div className="space-y-0.5">
          {recentItems.map((log) => {
            const Icon = ACTION_ICONS[log.action] || Activity;
            const verb =
              ACTION_VERBS[log.action] ||
              (log.action
                ? log.action.charAt(0).toUpperCase() + log.action.slice(1)
                : "Modified");
            const res =
              RESOURCE_LABELS[log.resource] || log.resource || "Item";

            return (
              <div
                key={log._id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className="h-4 w-4 text-muted-foreground shrink-0"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0 truncate text-sm">
                    <span className="font-normal text-foreground">
                      {verb} {res}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">
                      by {log.user?.name || "Admin"}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
