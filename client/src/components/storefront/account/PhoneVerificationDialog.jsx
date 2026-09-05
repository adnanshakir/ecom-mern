"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Phone, Loader2, ArrowLeft } from "lucide-react";
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

export function PhoneVerificationDialog({ open, onOpenChange, onSuccess }) {
  const dispatch = useDispatch();

  const [phoneInput, setPhoneInput] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [step, setStep] = useState("input"); // "input" | "otp"
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState(null);
  const [resendMessage, setResendMessage] = useState(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleClose = (isOpen) => {
    if (!isOpen) {
      setStep("input");
      setPhoneOtp("");
      setError(null);
      setResendMessage(null);
    }
    onOpenChange(isOpen);
  };

  const formatPhoneNumber = (input) => {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (input.startsWith("+")) return input.trim();
    return digits ? `+91${digits}` : "";
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const formatted = formatPhoneNumber(phoneInput);
    if (!formatted || formatted.length < 13) {
      setError("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    setLoading(true);
    setError(null);
    setResendMessage(null);

    try {
      const { error: apiErr } = await authClient.phoneNumber.sendOtp({
        phoneNumber: formatted,
      });

      if (apiErr) {
        const msg = apiErr.message || "";
        setError(msg || "Failed to send OTP code.");
      } else {
        setPhoneOtp("");
        setStep("otp");
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading || loading) return;
    setError(null);
    setResendMessage(null);
    setResendLoading(true);

    try {
      const formatted = formatPhoneNumber(phoneInput);
      const { error: apiErr } = await authClient.phoneNumber.sendOtp({
        phoneNumber: formatted,
      });

      if (apiErr) {
        setError(apiErr.message || "Failed to resend OTP code.");
      } else {
        setPhoneOtp("");
        setResendCooldown(30);
        setResendMessage("OTP code resent successfully!");
        setTimeout(() => setResendMessage(null), 4000);
      }
    } catch (err) {
      setError(err.message || "Failed to resend OTP code.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (phoneOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const formatted = formatPhoneNumber(phoneInput);

      const { error: apiErr } = await authClient.phoneNumber.verify({
        phoneNumber: formatted,
        code: phoneOtp,
        updatePhoneNumber: true,
      });

      if (apiErr) {
        const code = apiErr.code || "";
        const msg = apiErr.message || "";

        if (code === "INVALID_OTP" || msg.toLowerCase().includes("invalid otp")) {
          setError("Invalid verification code. Please double-check the 6-digit code.");
        } else if (code === "PHONE_NUMBER_EXIST" || msg.toLowerCase().includes("exist")) {
          setError("This phone number is already registered to another account.");
        } else {
          setError(msg || "Phone verification failed.");
        }
      } else {
        await dispatch(restoreCustomerSession());
        if (onSuccess) onSuccess("Phone number attached and verified successfully!");
        handleClose(false);
      }
    } catch (err) {
      setError(err.message || "Phone verification failed.");
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
              <Phone className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {step === "input" ? "Attach & Verify Phone Number" : "Enter Verification Code"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step === "input"
                  ? "Enter your 10-digit phone number to receive an OTP code."
                  : `Verification code sent to ${phoneInput}`}
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
              <label htmlFor="verify-phone" className="block text-xs font-semibold text-foreground mb-1.5">
                Mobile Number *
              </label>
              <div className="flex items-center gap-2">
                <span className="flex h-9 items-center rounded-md border bg-muted px-3 text-xs font-medium text-muted-foreground">
                  +91
                </span>
                <Input
                  id="verify-phone"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading || phoneInput.length < 10}>
                {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                Send OTP
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5 text-xs">
              <span className="font-medium text-foreground truncate pr-2">+91 {phoneInput}</span>
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
                  value={phoneOtp}
                  onChange={(val) => setPhoneOtp(val.replace(/\D/g, ""))}
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
                disabled={resendLoading || loading || resendCooldown > 0}
                className="text-xs text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
              >
                {resendLoading
                  ? "Resending..."
                  : resendCooldown > 0
                  ? `Resend OTP (${resendCooldown}s)`
                  : "Resend OTP"}
              </button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading || phoneOtp.length !== 6}>
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
