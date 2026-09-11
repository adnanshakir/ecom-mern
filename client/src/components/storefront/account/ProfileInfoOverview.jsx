"use client";

import { User, MapPin, Pencil, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileInfoOverview({
  hasName,
  displayName,
  phone,
  hasEmail,
  displayEmail,
  hasAddress,
  defaultAddr,
  onEditProfile,
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-6">
      {/* Card Header with Single Edit Profile Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <User className="size-5 shrink-0" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
            <p className="text-xs text-muted-foreground">Your verified account details and delivery address.</p>
          </div>
        </div>

        <Button
          onClick={onEditProfile}
          size="sm"
          className="gap-2 text-xs font-semibold shrink-0"
        >
          <Pencil className="size-3.5" /> Edit Profile
        </Button>
      </div>

      {/* Info Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3 rounded-xl border bg-muted/30 p-4">
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Full Name</span>
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground" />
            {hasName ? displayName : <span className="text-muted-foreground italic font-normal">Not added yet</span>}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Mobile Number</span>
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Phone className="size-3.5 text-muted-foreground" />
            {phone || <span className="text-muted-foreground italic font-normal">Not attached</span>}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-muted-foreground block mb-0.5">Email Address</span>
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Mail className="size-3.5 text-muted-foreground" />
            {hasEmail ? displayEmail : <span className="text-muted-foreground italic font-normal">Not added yet</span>}
          </span>
        </div>
      </div>

      {/* Delivery Address Section */}
      <div className="pt-4 border-t space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MapPin className="size-3.5 text-primary" /> Primary Delivery Address
          </h3>
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
              onClick={onEditProfile}
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
