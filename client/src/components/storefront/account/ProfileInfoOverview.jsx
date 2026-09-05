"use client";

import { User, MapPin, Pencil, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileInfoOverview({
  hasName,
  displayName,
  phone,
  hasEmail,
  displayEmail,
  hasAddress,
  defaultAddr,
  onOpenDialog,
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <User className="size-5 shrink-0" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
            <p className="text-xs text-muted-foreground">Your verified contact details and address.</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenDialog("name")}
          className="gap-1.5 text-xs"
        >
          <Pencil className="size-3.5" /> Edit Name
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 rounded-xl border bg-muted/30 p-4">
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block">Full Name</span>
          <span className="text-sm font-semibold text-foreground">
            {hasName ? displayName : <span className="text-muted-foreground italic font-normal">Not added yet</span>}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-muted-foreground block">Mobile Number</span>
          <span className="text-sm font-semibold text-foreground">{phone || "—"}</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-muted-foreground block">Email Address</span>
          <span className="text-sm font-semibold text-foreground">
            {hasEmail ? (
              displayEmail
            ) : (
              <span className="text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-1">
                <AlertCircle className="size-3" /> Not attached
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Delivery Address Section */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Primary Delivery Address
          </h3>
          {!hasAddress && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-primary font-semibold p-0 h-auto"
              onClick={() => onOpenDialog("address")}
            >
              + Add Address
            </Button>
          )}
        </div>

        {hasAddress ? (
          <div className="rounded-xl border bg-primary/5 p-4 relative flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <MapPin className="size-5 shrink-0" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{displayName}</p>
              <p className="mt-1 text-xs text-foreground leading-relaxed">
                {defaultAddr.line1}
                {defaultAddr.line2 ? `, ${defaultAddr.line2}` : ""}
              </p>
              <p className="text-xs text-foreground font-medium">
                {defaultAddr.city}, {defaultAddr.state} - {defaultAddr.postalCode}, India
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground flex items-center justify-between gap-3">
            <span>No delivery address saved yet.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenDialog("address")}
              className="shrink-0 text-xs font-semibold"
            >
              Add Address
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
