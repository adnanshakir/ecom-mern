"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { authClient } from "@/lib/authClient";
import { restoreCustomerSession } from "@/redux/slices/customerAuthSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function EmailVerificationDialog({ open, onOpenChange, onSuccess }) {
  const dispatch = useDispatch();

  const [emailInput, setEmailInput] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [step, setStep] = useState("input"); // "input" | "otp"
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resendMessage, setResendMessage] = useState(null);

  const handleClose = (isOpen) => {
    if (!isOpen) {
      setStep("input");
      setEmailOtp("");
      setError(null);
      setResendMessage(null);
    }
    onOpenChange(isOpen);
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    setResendMessage(null);

    try {
      const formattedEmail = emailInput.trim().toLowerCase();
      const { error: apiErr } = await authClient.emailOtp.requestEmailChange({
        newEmail: formattedEmail,
      });

      if (apiErr) {
        const msg = apiErr.message || "";
        if (msg.toLowerCase().includes("same")) {
          setError("The entered email is already your current email address.");
        } else if (msg.toLowerCase().includes("already in use")) {
          setError("This email address is already associated with another account.");
        } else {
          setError(msg || "Failed to send verification code.");
        }
      } else {
        setEmailOtp("");
        setStep("otp");
      }
    } catch (err) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setResendMessage(null);
    setResendLoading(true);

    try {
      const formattedEmail = emailInput.trim().toLowerCase();
      const { error: apiErr } = await authClient.emailOtp.requestEmailChange({
        newEmail: formattedEmail,
      });

      if (apiErr) {
        const msg = apiErr.message || "";
        if (msg.toLowerCase().includes("already in use")) {
          setError("This email address is already associated with another account.");
        } else {
          setError(msg || "Failed to resend verification code.");
        }
      } else {
        setEmailOtp("");
        setResendMessage("Verification code resent successfully!");
        setTimeout(() => setResendMessage(null), 4000);
      }
    } catch (err) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (emailOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const formattedEmail = emailInput.trim().toLowerCase();

      // Verify OTP and change email via Better Auth changeEmail endpoint
      const { error: apiErr } = await authClient.emailOtp.changeEmail({
        newEmail: formattedEmail,
        otp: emailOtp,
      });

      if (apiErr) {
        const code = apiErr.code || "";
        const msg = apiErr.message || "";

        if (code === "INVALID_OTP" || msg.toLowerCase().includes("invalid otp")) {
          setError("Invalid verification code. Please double-check the 6-digit code and try again.");
        } else if (code === "OTP_EXPIRED" || msg.toLowerCase().includes("expired")) {
          setError("Verification code has expired. Please click 'Resend OTP' for a new code.");
        } else if (code === "TOO_MANY_ATTEMPTS" || msg.toLowerCase().includes("too many attempts")) {
          setError("Too many incorrect attempts. This code has been invalidated — please click 'Resend OTP' to request a fresh code.");
        } else if (msg.toLowerCase().includes("already in use")) {
          setError("This email address is already associated with another account.");
        } else {
          setError(msg || "Email verification failed.");
        }
      } else {
        await dispatch(restoreCustomerSession());
        if (onSuccess) onSuccess("Email attached and verified successfully!");
        handleClose(false);
      }
    } catch (err) {
      setError(err.message || "Email verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {step === "input" ? "Attach & Verify Email" : "Enter Verification Code"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step === "input"
                  ? "We will send a 6-digit OTP to verify your email."
                  : `Verification code sent to ${emailInput}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {resendMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            {resendMessage}
          </div>
        )}

        {step === "input" ? (
          <form onSubmit={handleSendOtp} className="space-y-4 pt-2">
            <div>
              <label htmlFor="verify-email" className="block text-xs font-semibold text-foreground mb-1.5">
                Email Address *
              </label>
              <Input
                id="verify-email"
                type="email"
                placeholder="e.g. rahul@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading || !emailInput.includes("@")}>
                {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                Send Code
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5 text-xs">
              <span className="font-medium text-foreground truncate pr-2">{emailInput}</span>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold shrink-0"
              >
                <ArrowLeft className="size-3" /> Change
              </button>
            </div>

            <div className="space-y-2 text-center">
              <label className="block text-xs font-semibold text-foreground text-left">
                Enter 6-Digit OTP *
              </label>
              <div className="flex justify-center pt-1">
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={emailOtp}
                  onChange={(val) => setEmailOtp(val.replace(/\D/g, ""))}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading || loading}
                className="text-xs text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
              >
                {resendLoading ? "Resending..." : "Resend OTP"}
              </button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading || emailOtp.length !== 6}>
                  {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  Verify & Attach
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
