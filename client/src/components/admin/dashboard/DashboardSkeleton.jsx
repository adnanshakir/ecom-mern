"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div className="space-y-1.5">
          <div className="h-6 w-36 rounded-md bg-muted/80" />
          <div className="h-3.5 w-52 rounded-md bg-muted/50" />
        </div>
        <div className="h-4 w-20 rounded bg-muted/50" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/60 bg-card/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-16 rounded bg-muted/70" />
                  <div className="h-7 w-12 rounded bg-muted" />
                  <div className="h-2.5 w-20 rounded bg-muted/40" />
                </div>
                <div className="size-10 rounded-xl bg-muted/70" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2 Main Panels */}
      <div className="grid gap-5 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="min-h-[360px] flex flex-col border-border/60 bg-card/60">
            <CardHeader className="shrink-0 border-b pb-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-muted/80" />
                <div className="h-5 w-14 rounded-full bg-muted/50" />
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2 flex-1">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-10 w-full rounded-lg bg-muted/30" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Imports */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="border-b pb-3 pt-4">
          <div className="h-4 w-36 rounded bg-muted/80" />
        </CardHeader>
        <CardContent className="p-4 space-y-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 w-full rounded-lg bg-muted/30" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
