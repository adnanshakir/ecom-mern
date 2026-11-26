"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function NotificationPreviewCard({
  channel,
  imageUrl,
  previewTitle,
  previewBody,
  showPersonalImagePlaceholder = false,
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Push preview */}
        {(channel === "app" || channel === "both") && (
          <div className="rounded-xl border bg-card p-3 shadow-xs space-y-2">
            {showPersonalImagePlaceholder ? (
              <div className="relative flex aspect-[2/1] w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                Customer&apos;s product
              </div>
            ) : (
              imageUrl &&
              /^https:\/\//i.test(imageUrl.trim()) && (
                <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    key={imageUrl.trim()}
                    src={imageUrl.trim()}
                    alt="Notification banner"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )
            )}
            <div className="flex items-start gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                F
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Fibio</span>
                  <span className="text-[10px] text-muted-foreground">now</span>
                </div>
                <p
                  className={cn(
                    "text-xs font-bold leading-snug break-words",
                    !previewTitle ? "text-muted-foreground italic" : "text-foreground"
                  )}
                >
                  {previewTitle || "Your title appears here"}
                </p>
                {previewBody && (
                  <p className="text-xs text-muted-foreground leading-snug break-words">
                    {previewBody}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Website Ticker preview */}
        {(channel === "web" || channel === "both") && (
          <div className="rounded-md bg-black px-3 py-2 text-xs text-white">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-semibold shrink-0">Website:</span>
              <span className="truncate opacity-90">
                {previewTitle || "Your title appears here"}
                {previewBody ? ` — ${previewBody}` : ""}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

