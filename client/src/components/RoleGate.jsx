"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";

// Wrap any page/section that only certain roles should see.
// Usage: <RoleGate allow={["super_admin"]}>...</RoleGate>
export function RoleGate({ allow, children }) {
  const router = useRouter();
  const { user, authReady, status } = useSelector((state) => state.auth);

  const isAllowed = !!user && allow.includes(user.role);

  useEffect(() => {
    if (authReady) {
      if (status === "unauthenticated") {
        router.replace("/admin/login");
      } else if (!isAllowed) {
        router.replace("/admin/dashboard");
      }
    }
  }, [authReady, status, isAllowed, router]);

  if (!authReady) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking access...
      </div>
    );
  }

  if (!isAllowed) {
    return null; // redirect is firing
  }

  return children;
}