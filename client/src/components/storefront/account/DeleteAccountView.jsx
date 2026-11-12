"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle,
  Check,
  CircleAlert,
  Database,
  Info,
  Loader2,
  Phone,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { toast } from "sonner";

import { authClient } from "@/lib/authClient";
import { clearAuth } from "@/redux/slices/customerAuthSlice";
import { resetCart } from "@/redux/slices/cartSlice";
import { resetWishlist } from "@/redux/slices/wishlistSlice";
import customerApi from "@/services/storefront/customerAxios";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PageContainer } from "@/components/layout/PageContainer";
import { Section } from "@/components/layout/Section";

export function DeleteAccountView() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, status, authReady } = useSelector((state) => state.customerAuth);
  const phone = user?.phoneNumber || user?.phone || "";
  const [step, setStep] = useState("ready");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  useEffect(() => {
    if (authReady && status !== "authenticated") {
      router.replace("/sign-in?from=/account/delete");
    }
  }, [authReady, router, status]);

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: apiError } = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
      if (apiError) {
        setError(apiError.message || "Unable to send verification code");
        return;
      }
      setStep("otp");
    } catch (err) {
      setError(err.message || "Unable to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    setError("");
    setLoading(true);
    try {
      await customerApi.delete("/customers/me", { data: { otp } });
      dispatch(clearAuth());
      dispatch(resetCart());
      dispatch(resetWishlist());
      toast.success("Account deleted");
      router.replace("/");
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete your account");
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || status !== "authenticated") return null;

  return (
    <Section>
      <PageContainer className="max-w-4xl">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              <ShieldCheck className="size-3.5" />
              Account privacy & control
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Delete your account
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                We respect your decision. Review exactly what happens to your
                information before you permanently close your Fibio account.
              </p>
            </div>
          </div>

          <Card className="border-destructive/25 shadow-sm">
            <CardHeader className="border-b border-destructive/10 bg-destructive/5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <CircleAlert className="size-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">This action is permanent</CardTitle>
                  <CardDescription>
                    Once completed, your account cannot be restored.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <DataItem
                  icon={Trash2}
                  title="Removed immediately"
                  items={["Profile and account details", "Saved addresses", "Cart and wishlist", "Active sign-in sessions"]}
                />
                <DataItem
                  icon={Database}
                  title="Kept securely"
                  items={["Past orders for record-keeping", "Order totals, items, and dates", "Personal details anonymized"]}
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                    <p className="font-medium text-foreground">How we handle your data</p>
                    <p>
                      Your profile data is deleted from active systems after
                      verification. We retain only the minimum order information
                      needed for business records and legal obligations, with
                      personal identifiers replaced by an anonymized value.
                    </p>
                    <p>
                      Deletion applies to this customer account only. It does
                      not cancel orders that have already been placed or remove
                      records we are required to retain.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {step === "ready" ? (
                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Verify it&apos;s you</p>
                      <p className="text-sm text-muted-foreground">
                        We&apos;ll send a one-time code to your registered number.
                      </p>
                    </div>
                  </div>
                  <Button variant="destructive" onClick={sendOtp} disabled={loading}>
                    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {loading ? "Sending code..." : "Send verification code"}
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (otp.length === 6) setConfirmationOpen(true);
                  }}
                  className="space-y-4 rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Enter your verification code</p>
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to your registered number.
                    </p>
                  </div>
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={otp}
                    onChange={setOtp}
                    disabled={loading}
                    aria-label="Account deletion verification code"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" variant="destructive" disabled={loading || otp.length !== 6}>
                      Review final deletion
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setOtp("");
                        setStep("ready");
                        setError("");
                      }}
                      disabled={loading}
                    >
                      Start over
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
            You will be asked to confirm one final time before any deletion
            request is sent.
          </p>
        </div>
      </PageContainer>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your profile, saved data, and active sessions.
              Past orders will remain only in anonymized form. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Keep my account</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async (event) => {
                event.preventDefault();
                const deleted = await deleteAccount();
                if (deleted) setConfirmationOpen(false);
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}

function DataItem({ icon: Icon, title, items }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
