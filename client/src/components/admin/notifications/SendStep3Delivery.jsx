"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Calendar } from "lucide-react";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { cn } from "@/lib/utils";

export function SendStep3Delivery({
  sendError,
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
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Delivery & Timing</h2>
        <p className="text-xs text-muted-foreground">Choose where and when your notification will be sent.</p>
      </div>

      {sendError && <ApiErrorSummary message={sendError} />}

      {/* Where should it show? Segmented Buttons */}
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

      {/* Show on website for Chips */}
      {(channel === "web" || channel === "both") && (
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
          <div className="mt-2 space-y-1">
            <Input
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

