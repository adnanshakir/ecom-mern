"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLOR_THEMES = {
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    glow: "group-hover:border-blue-500/40",
  },
  violet: {
    bg: "bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    glow: "group-hover:border-violet-500/40",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    glow: "group-hover:border-emerald-500/40",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    glow: "group-hover:border-amber-500/40",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    glow: "group-hover:border-rose-500/40",
  },
};

export function StatCard({ label, value, icon: Icon, color = "blue", subtitle, alertCount }) {
  const theme = COLOR_THEMES[color] || COLOR_THEMES.blue;

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-colors duration-200 border-border/80 w-full min-w-0",
      theme.glow
    )}>
      <CardContent className="p-3 sm:p-4 md:p-5 overflow-hidden">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
            <p className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-muted-foreground truncate">{label}</p>
            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2 min-w-0">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {typeof value === "number" ? value.toLocaleString() : value ?? 0}
              </span>
              {alertCount !== undefined && alertCount > 0 && (
                <span className="rounded-full bg-rose-500/10 text-rose-500 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 border border-rose-500/20 animate-pulse whitespace-nowrap">
                  {alertCount} alert{alertCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 truncate font-medium">{subtitle}</p>
            )}
          </div>

          <div className={cn("flex size-9 sm:size-10 md:size-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border shadow-xs", theme.bg)}>
            <Icon className="size-4 sm:size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}