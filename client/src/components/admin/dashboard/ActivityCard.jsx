"use client";

import { Activity, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ActivityLog } from "@/components/admin/dashboard/ActivityLog";

export function ActivityCard({ items = [] }) {
  return (
    <Card className="flex flex-col border-border/80 shadow-xs h-[460px] sm:h-[500px] overflow-hidden w-full min-w-0 py-0 gap-0">
      <CardHeader className="shrink-0 border-b px-4 py-3 gap-0 [.border-b]:pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
              <Activity className="size-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Recent Activity</span>
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-[11px] mt-0.5">
              Audit log &amp; user operations
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-blue-500/10 text-blue-500 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 border border-blue-500/20">
            Latest 10
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-3 overflow-hidden">
        <ActivityLog items={items} />
      </CardContent>
      <CardFooter className="shrink-0 border-t px-4 py-2.5 [.border-t]:pt-2.5">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Layers className="size-3" /> Auto-recorded operations
        </span>
      </CardFooter>
    </Card>
  );
}
