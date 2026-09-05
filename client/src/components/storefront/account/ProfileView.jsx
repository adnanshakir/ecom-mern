"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { customerSignOut } from "@/redux/slices/customerAuthSlice";
import { resetCart } from "@/redux/slices/cartSlice";
import { resetWishlist } from "@/redux/slices/wishlistSlice";

import { ProfileHeader } from "./ProfileHeader";
import { ProfileCompletionCard } from "./ProfileCompletionCard";
import { ProfileInfoOverview } from "./ProfileInfoOverview";
import { EmailVerificationDialog } from "./EmailVerificationDialog";
import { PhoneVerificationDialog } from "./PhoneVerificationDialog";
import { NameEditDialog } from "./NameEditDialog";
import { AddressEditDialog } from "./AddressEditDialog";

// Helper functions to filter out temp generated data
function isRealEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  return !trimmed.endsWith("@customer.local") && !trimmed.includes("customer.local");
}

function isRealName(name, phone) {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (phone && trimmed === phone) return false;
  if (/^\+?91?\d{10}$/.test(trimmed.replace(/\s/g, ""))) return false;
  return true;
}

export function ProfileView() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, status } = useSelector((state) => state.customerAuth);
  const isAuthenticated = status === "authenticated" || !!user;

  // Active pop-up dialog
  const [activeDialog, setActiveDialog] = useState(null); // "name" | "email" | "phone" | "address" | null
  const [toastMessage, setToastMessage] = useState({ type: "", text: "" });

  const phone = user?.phoneNumber || user?.phone || "";
  const hasPhone = Boolean(phone);
  const hasName = isRealName(user?.name, phone);
  const hasEmail = isRealEmail(user?.email);
  const userAddresses = user?.addresses || [];
  const defaultAddr = userAddresses.length > 0 ? userAddresses[0] : null;
  const hasAddress = Boolean(defaultAddr?.line1 && defaultAddr?.city);

  // Completion calculation
  let completionPercentage = 10; // Base 10% for verified session
  if (hasPhone) completionPercentage += 25;
  if (hasName) completionPercentage += 25;
  if (hasEmail) completionPercentage += 20;
  if (hasAddress) completionPercentage += 20;

  const displayName = hasName ? user.name : "Guest User";
  const displayEmail = hasEmail ? user.email : null;

  const handleLogout = async () => {
    await dispatch(customerSignOut());
    dispatch(resetCart());
    dispatch(resetWishlist());
    router.push("/");
  };

  const showSuccessNotification = (msgText) => {
    setToastMessage({ type: "success", text: msgText });
    setTimeout(() => setToastMessage({ type: "", text: "" }), 5000);
  };

  return (
    <div className="min-h-[85vh] bg-muted/20 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Profile Header */}
        <ProfileHeader
          displayName={displayName}
          hasName={hasName}
          phone={phone}
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
        />

        {/* Global Toast Notification */}
        {toastMessage.text && (
          <div
            className={`flex items-center gap-2.5 rounded-xl border p-4 text-xs ${
              toastMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        )}

        {/* Profile Completion Widget Card */}
        <ProfileCompletionCard
          completionPercentage={completionPercentage}
          hasPhone={hasPhone}
          phone={phone}
          hasName={hasName}
          displayName={displayName}
          hasEmail={hasEmail}
          displayEmail={displayEmail}
          hasAddress={hasAddress}
          defaultAddr={defaultAddr}
          onOpenDialog={(dialogName) => setActiveDialog(dialogName)}
        />

        {/* Profile Info Overview Grid */}
        <ProfileInfoOverview
          hasName={hasName}
          displayName={displayName}
          phone={phone}
          hasEmail={hasEmail}
          displayEmail={displayEmail}
          hasAddress={hasAddress}
          defaultAddr={defaultAddr}
          onOpenDialog={(dialogName) => setActiveDialog(dialogName)}
        />

        {/* POP-UP DIALOGS */}
        <NameEditDialog
          open={activeDialog === "name"}
          onOpenChange={(open) => setActiveDialog(open ? "name" : null)}
          currentName={hasName ? user?.name : ""}
          onSuccess={showSuccessNotification}
        />

        <EmailVerificationDialog
          open={activeDialog === "email"}
          onOpenChange={(open) => setActiveDialog(open ? "email" : null)}
          onSuccess={showSuccessNotification}
        />

        <PhoneVerificationDialog
          open={activeDialog === "phone"}
          onOpenChange={(open) => setActiveDialog(open ? "phone" : null)}
          onSuccess={showSuccessNotification}
        />

        <AddressEditDialog
          open={activeDialog === "address"}
          onOpenChange={(open) => setActiveDialog(open ? "address" : null)}
          currentAddress={defaultAddr}
          onSuccess={showSuccessNotification}
        />
      </div>
    </div>
  );
}
