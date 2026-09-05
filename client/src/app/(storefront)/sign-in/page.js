import { Suspense } from "react";
import { SignInView } from "@/components/storefront/auth/SignInView";

export const metadata = {
  title: "Sign In | Fibio Wholesale",
  description: "Sign in to your account with phone number or email OTP.",
  robots: { index: true, follow: true },
};

export default function CustomerSignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInView />
    </Suspense>
  );
}
