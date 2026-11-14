"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { fillTpl, CHANNEL_LABELS } from "@/lib/notificationTpl";

export function SendStep1Template({
  templatesLoading,
  templatesError,
  manualTemplates,
  pickTemplate,
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Choose a starting point</h2>
        <p className="text-xs text-muted-foreground">Select a template or start from scratch.</p>
      </div>

      {templatesLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin text-primary" />
          Loading templates...
        </div>
      ) : templatesError ? (
        <ApiErrorSummary message={templatesError} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Blank card */}
          <div
            onClick={() => pickTemplate(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") pickTemplate(null);
            }}
            className="group flex flex-col justify-between rounded-lg border-2 border-dashed p-4 text-left transition-all hover:border-primary/60 hover:bg-accent/40 cursor-pointer"
          >
            <div className="space-y-1.5">
              <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                ✏️ Write your own
              </span>
              <p className="text-xs text-muted-foreground">
                Compose a custom notification without a template.
              </p>
            </div>
            <div className="mt-4 pt-2">
              <Badge variant="outline" className="text-[10px]">
                Custom
              </Badge>
            </div>
          </div>

          {/* Non-auto templates */}
          {manualTemplates.map((t) => (
            <div
              key={t._id}
              onClick={() => pickTemplate(t)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") pickTemplate(t);
              }}
              className="group flex flex-col justify-between rounded-lg border bg-card p-4 text-left shadow-xs transition-all hover:border-primary/60 hover:bg-accent/30 cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {t.name}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {CHANNEL_LABELS[t.channel] || t.channel}
                  </Badge>
                </div>
                <p className="text-xs text-foreground/80 line-clamp-2">
                  {fillTpl(t.titleTpl, {}, "sample")}
                </p>
                {t.bodyTpl && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {fillTpl(t.bodyTpl, {}, "sample")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

