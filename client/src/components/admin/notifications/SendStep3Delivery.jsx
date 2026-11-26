"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, Send, Calendar, Search, X } from "lucide-react";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { cn } from "@/lib/utils";
import {
  SEGMENT_OPTIONS,
  SEGMENT_LABELS,
  PERSONAL_IMAGE_SEGMENTS,
} from "@/lib/notificationTpl";

export function SendStep3Delivery({
  sendError,
  audienceType,
  setAudienceType,
  segment,
  setSegment,
  categoryId,
  audienceCategorySearch,
  setAudienceCategorySearch,
  audienceCategoryResults,
  selectedAudienceCategory,
  setSelectedAudienceCategory,
  categoryLoading,
  audienceCount,
  audienceCountLoading,
  audienceCountError,
  retryAudienceCount,
  personalImage,
  setPersonalImage,
  hasAutoPlaceholdersInMsg,
  channel,
  setChannel,
  tickerDurationHours,
  setTickerDurationHours,
  sendMode,
  setSendMode,
  minScheduledAt,
  scheduledAt,
  setScheduledAt,
  setStep,
  sendLoading,
  submitSend,
  canSubmitSend,
}) {
  const isSegment = audienceType === "segment";
  const supportsPersonalImage = isSegment && PERSONAL_IMAGE_SEGMENTS.includes(segment);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Where and when?</h2>
        <p className="text-xs text-muted-foreground">
          Choose who receives this notification, where it appears, and when it goes out.
        </p>
      </div>

      {sendError && <ApiErrorSummary message={sendError} />}

      {/* Who gets this? */}
      <div className="space-y-3">
        <Label className="text-xs font-medium">Who gets this?</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={audienceType === "all" ? "default" : "outline"}
            onClick={() => setAudienceType("all")}
            className={cn("h-10 font-medium transition-all", audienceType === "all" && "shadow-xs")}
          >
            Everyone
          </Button>
          <Button
            type="button"
            variant={audienceType === "segment" ? "default" : "outline"}
            onClick={() => setAudienceType("segment")}
            className={cn("h-10 font-medium transition-all", audienceType === "segment" && "shadow-xs")}
          >
            Specific customers
          </Button>
        </div>

        {audienceType === "all" && hasAutoPlaceholdersInMsg && (
          <p className="text-xs text-destructive">
            Your message uses personalized fields ({"{{name}}"}, {"{{product}}"}, or {"{{count}}"}). Switch to Specific customers to send.
          </p>
        )}

        {isSegment && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="space-y-1.5">
              <Label htmlFor="audience-segment" className="text-xs font-medium">
                Customer group
              </Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger id="audience-segment" className="h-9 w-full">
                  <SelectValue>{SEGMENT_LABELS[segment] || segment}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {SEGMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {segment === "category" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select category</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter categories..."
                    value={audienceCategorySearch}
                    onChange={(e) => setAudienceCategorySearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                {selectedAudienceCategory && (
                  <div className="flex items-center justify-between rounded border bg-muted/40 px-2.5 py-1.5 text-xs">
                    <span className="font-medium truncate">{selectedAudienceCategory.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${selectedAudienceCategory.name}`}
                      onClick={() => setSelectedAudienceCategory(null)}
                      className="h-5 px-1 text-[10px]"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                )}
                {categoryLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                    <Loader2 className="size-3 animate-spin" /> Loading categories...
                  </div>
                )}
                {!selectedAudienceCategory && audienceCategoryResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-sm">
                    {audienceCategoryResults.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSelectedAudienceCategory({ _id: c._id, name: c.name, slug: c.slug });
                          setAudienceCategorySearch("");
                        }}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Live audience count line */}
            <p className="text-xs text-muted-foreground">
              {segment === "category" && !categoryId ? (
                "Select a category to see matching customers."
              ) : audienceCountError ? (
                <span className="inline-flex items-center gap-2 text-destructive">
                  <span>{audienceCountError}</span>
                  <button
                    type="button"
                    onClick={retryAudienceCount}
                    className="underline font-medium hover:text-destructive/80 cursor-pointer"
                  >
                    Retry
                  </button>
                </span>
              ) : audienceCountLoading || !audienceCount ? (
                "Checking matching customers..."
              ) : audienceCount.total === 0 ? (
                "No one matches"
              ) : (
                <>
                  About <span className="tabular-nums font-medium text-foreground">{audienceCount.total}</span>{" "}
                  customer{audienceCount.total === 1 ? "" : "s"} ·{" "}
                  <span className="tabular-nums font-medium text-foreground">{audienceCount.withApp}</span>{" "}
                  have the app
                </>
              )}
            </p>

            {supportsPersonalImage && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="personal-image-switch" className="text-xs font-medium cursor-pointer">
                    Show each customer&apos;s own product image
                  </Label>
                  <Switch
                    id="personal-image-switch"
                    checked={personalImage}
                    onCheckedChange={setPersonalImage}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {"{{name}}"}, {"{{product}}"} and {"{{count}}"} are filled in automatically per customer.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Where should it show? Segmented Buttons (hidden for Specific customers) */}
      {!isSegment && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Where should it show?</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "app", label: "📱 App" },
              { value: "web", label: "🖥️ Website" },
              { value: "both", label: "Both" },
            ].map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={channel === opt.value ? "default" : "outline"}
                onClick={() => setChannel(opt.value)}
                className={cn("h-11 font-medium transition-all", channel === opt.value && "shadow-xs")}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Show on website for Chips */}
      {!isSegment && (channel === "web" || channel === "both") && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Show on website for</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 6, label: "6 hours" },
              { value: 24, label: "1 day" },
              { value: 72, label: "3 days" },
              { value: 168, label: "1 week" },
            ].map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={tickerDurationHours === opt.value ? "default" : "outline"}
                onClick={() => setTickerDurationHours(opt.value)}
                className="h-8 text-xs font-medium"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* When? Segmented Buttons */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">When?</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={sendMode === "now" ? "default" : "outline"}
            onClick={() => setSendMode("now")}
            className="h-9 font-medium"
          >
            Send now
          </Button>
          <Button
            type="button"
            variant={sendMode === "schedule" ? "default" : "outline"}
            onClick={() => setSendMode("schedule")}
            className="h-9 font-medium"
          >
            Schedule
          </Button>
        </div>
        {sendMode === "schedule" && (
          <div className="mt-2 space-y-1.5">
            <Label htmlFor="schedule-time" className="text-xs font-medium">
              Schedule time
            </Label>
            <Input
              id="schedule-time"
              type="datetime-local"
              min={minScheduledAt}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">Times are in your local browser timezone.</p>
          </div>
        )}
      </div>

      {/* Navigation Buttons for Step 3 */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep(2)}
          disabled={sendLoading}
          className="h-9"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={submitSend}
          disabled={!canSubmitSend || sendLoading}
          className="h-9 min-w-28 gap-2"
        >
          {sendLoading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Sending...
            </>
          ) : sendMode === "now" ? (
            <>
              <Send className="size-3.5" /> Send now
            </>
          ) : (
            <>
              <Calendar className="size-3.5" /> Schedule
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
