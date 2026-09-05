"use client";

import { Sparkles, User, Mail, MapPin, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileCompletionCard({
  completionPercentage,
  hasName,
  displayName,
  hasEmail,
  displayEmail,
  hasAddress,
  defaultAddr,
  onOpenDialog,
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <h2 className="text-lg font-bold text-foreground">Profile Completion</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete your profile to enjoy faster wholesale checkout and order notifications.
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-primary">{completionPercentage}%</span>
          <span className="text-xs text-muted-foreground block font-medium">Completed</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Tasks Checklist */}
      <div className="grid gap-3 pt-2 sm:grid-cols-3">
        {/* Task 1: Name */}
        <div
          className={`rounded-xl border p-4 transition-all ${
            hasName
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-card border-border hover:border-primary/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className={`size-4 ${hasName ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-bold text-foreground">Full Name</span>
            </div>
            {hasName ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                +30%
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
            {hasName ? displayName : "Set your display & billing name."}
          </p>
          {!hasName && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full text-xs font-semibold"
              onClick={() => onOpenDialog("name")}
            >
              Add Name <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>

        {/* Task 2: Email OTP */}
        <div
          className={`rounded-xl border p-4 transition-all ${
            hasEmail
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-card border-border hover:border-primary/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className={`size-4 ${hasEmail ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-bold text-foreground">Email OTP</span>
            </div>
            {hasEmail ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                +30%
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
            {hasEmail ? displayEmail : "Attach & verify email address."}
          </p>
          {!hasEmail && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full text-xs font-semibold"
              onClick={() => onOpenDialog("email")}
            >
              Verify Email <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>

        {/* Task 3: Address */}
        <div
          className={`rounded-xl border p-4 transition-all ${
            hasAddress
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-card border-border hover:border-primary/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className={`size-4 ${hasAddress ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-bold text-foreground">Delivery Address</span>
            </div>
            {hasAddress ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                +30%
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
            {hasAddress ? `${defaultAddr.city}, ${defaultAddr.state}` : "Add primary shipping address."}
          </p>
          {!hasAddress && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full text-xs font-semibold"
              onClick={() => onOpenDialog("address")}
            >
              Add Address <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
