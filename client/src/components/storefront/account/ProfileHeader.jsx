"use client";

import Link from "next/link";
import { Phone, ShieldCheck, Package, LogOut } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function ProfileHeader({
  displayName,
  hasName,
  phone,
  isAuthenticated,
  onLogout,
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-sm shrink-0">
          {hasName ? displayName.charAt(0).toUpperCase() : "G"}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {displayName}
            </h1>
            {!hasName && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                New Member
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
            <Phone className="size-3.5 shrink-0 text-primary" /> {phone || "No phone linked"}
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium ml-1">
              <ShieldCheck className="size-3" /> Verified
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Link
          href="/account/orders"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "inline-flex items-center justify-center gap-2",
          })}
        >
          <Package className="size-4 shrink-0" />
          <span>My Orders</span>
        </Link>

        {isAuthenticated && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Logout</span>
          </Button>
        )}
      </div>
    </div>
  );
}
