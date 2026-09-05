"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { Loader2, Phone, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { authClient } from "@/lib/authClient";
import { restoreCustomerSession } from "@/redux/slices/customerAuthSlice";
import { fetchCart } from "@/redux/slices/cartSlice";
import { fetchWishlist } from "@/redux/slices/wishlistSlice";
import { getSafeRedirectUrl } from "@/lib/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function SignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const authStatus = useSelector((state) => state.customerAuth.status);
  const authReady = useSelector((state) => state.customerAuth.authReady);

  const [activeTab, setActiveTab] = useState("phone"); // "phone" | "email"
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("input"); // "input" | "otp"
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resendMessage, setResendMessage] = useState(null);

  // If already authenticated, redirect safely
  useEffect(() => {
    if (authReady && authStatus === "authenticated") {
      const from = searchParams.get("from");
      router.replace(getSafeRedirectUrl(from));
    }
  }, [authReady, authStatus, router, searchParams]);

  // Strict numeric input enforcement for phone number
  const handlePhoneKeyDown = (e) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];
    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setPhone(raw.slice(0, 10));
  };

  const handleTabChange = (val) => {
    setActiveTab(val);
    setStep("input");
    setError(null);
    setResendMessage(null);
    setOtp("");
  };

  // SEND OTP HANDLER
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setResendMessage(null);

    if (activeTab === "phone") {
      if (phone.length !== 10) {
        setError("Please enter a valid 10-digit Indian phone number.");
        return;
      }
      setLoading(true);
      try {
        const formattedPhone = `+91${phone}`;
        const { error: apiErr } = await authClient.phoneNumber.sendOtp({
          phoneNumber: formattedPhone,
        });

        if (apiErr) {
          setError(apiErr.message || "Failed to send verification code. Please check your phone number.");
        } else {
          setStep("otp");
        }
      } catch (err) {
        setError(err.message || "An unexpected error occurred while sending OTP.");
      } finally {
        setLoading(false);
      }
    } else {
      // Email OTP Send: Always proceed to OTP step for anti-enumeration
      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }
      setLoading(true);
      try {
        const { error: apiErr } = await authClient.emailOtp.sendVerificationOtp({
          email: email.trim().toLowerCase(),
          type: "sign-in",
        });

        if (apiErr) {
          // If network or internal server error
          setError(apiErr.message || "Failed to send verification code.");
        } else {
          // Proceed to OTP step regardless of whether backend silently dropped it for unregistered emails
          setStep("otp");
        }
      } catch (err) {
        setError(err.message || "An unexpected error occurred while sending OTP.");
      } finally {
        setLoading(false);
      }
    }
  };

  // RESEND OTP HANDLER
  const handleResendOtp = async () => {
    setError(null);
    setResendMessage(null);
    setResendLoading(true);

    try {
      if (activeTab === "phone") {
        const formattedPhone = `+91${phone}`;
        const { error: apiErr } = await authClient.phoneNumber.sendOtp({
          phoneNumber: formattedPhone,
        });
        if (apiErr) {
          setError(apiErr.message || "Failed to resend OTP.");
        } else {
          setResendMessage("Verification code resent successfully!");
          setTimeout(() => setResendMessage(null), 4000);
        }
      } else {
        const { error: apiErr } = await authClient.emailOtp.sendVerificationOtp({
          email: email.trim().toLowerCase(),
          type: "sign-in",
        });
        if (apiErr) {
          setError(apiErr.message || "Failed to resend OTP.");
        } else {
          setResendMessage("Verification code resent successfully!");
          setTimeout(() => setResendMessage(null), 4000);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setResendLoading(false);
    }
  };

  // VERIFY OTP HANDLER
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (activeTab === "phone") {
        const formattedPhone = `+91${phone}`;
        const { error: apiErr } = await authClient.phoneNumber.verify({
          phoneNumber: formattedPhone,
          code: otp,
        });

        if (apiErr) {
          setError(apiErr.message || "Invalid or expired verification code.");
          setLoading(false);
          return;
        }
      } else {
        const { error: apiErr } = await authClient.signIn.emailOtp({
          email: email.trim().toLowerCase(),
          otp: otp,
        });

        if (apiErr) {
          setError("Invalid or expired verification code. Please ensure your email is attached to an account and try again.");
          setLoading(false);
          return;
        }
      }

      // Success: Hydrate Redux session and user state
      const result = await dispatch(restoreCustomerSession());
      if (restoreCustomerSession.fulfilled.match(result)) {
        dispatch(fetchCart());
        dispatch(fetchWishlist());
        const from = searchParams.get("from");
        router.push(getSafeRedirectUrl(from));
      } else {
        setError("Signed in but failed to restore session. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || authStatus === "authenticated") return null;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Sign in to Fibio</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your details to receive a one-time verification code.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {resendMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{resendMessage}</span>
          </div>
        )}

        {step === "input" ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="phone" className="text-xs font-semibold">
                Phone OTP
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs font-semibold">
                Email OTP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone">
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="signin-phone" className="block text-xs font-semibold text-foreground mb-1.5">
                    Mobile Number *
                  </label>
                  <div className="relative flex items-center rounded-md border border-input shadow-xs focus-within:ring-2 focus-within:ring-primary">
                    <span className="flex h-10 items-center justify-center border-r bg-muted px-3 text-sm font-semibold text-muted-foreground select-none">
                      +91
                    </span>
                    <Input
                      id="signin-phone"
                      type="text"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="Enter 10-digit mobile number"
                      className="border-0 shadow-none focus-visible:ring-0 text-sm font-medium"
                      value={phone}
                      onKeyDown={handlePhoneKeyDown}
                      onChange={handlePhoneChange}
                      maxLength={10}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-semibold h-11"
                  disabled={loading || phone.length !== 10}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sending Code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="signin-email" className="block text-xs font-semibold text-foreground mb-1.5">
                    Email Address *
                  </label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your registered email"
                    className="text-sm font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Email OTP sign-in works for accounts with an attached email address.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-semibold h-11"
                  disabled={loading || !email.includes("@")}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sending Code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs font-medium truncate pr-2">
                {activeTab === "phone" ? (
                  <>
                    <Phone className="size-4 text-primary shrink-0" />
                    <span>+91 {phone.replace(/(\d{5})(\d{5})/, "$1 $2")}</span>
                  </>
                ) : (
                  <>
                    <Mail className="size-4 text-primary shrink-0" />
                    <span className="truncate">{email}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("input");
                  setError(null);
                  setOtp("");
                }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold shrink-0"
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
                  value={otp}
                  onChange={(val) => {
                    const digitsOnly = val.replace(/\D/g, "");
                    setOtp(digitsOnly);
                  }}
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

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-semibold h-11"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Code & Sign In"
              )}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading || loading}
                className="text-xs text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
              >
                {resendLoading ? "Resending..." : "Didn't receive the code? Resend OTP"}
              </button>
            </div>
          </form>
        )}

        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          Don&apos;t have an account yet?{" "}
          <Link href="/sign-up" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
