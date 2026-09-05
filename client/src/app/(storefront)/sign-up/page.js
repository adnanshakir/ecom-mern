import { Suspense } from "react";
import { SignUpView } from "@/components/storefront/auth/SignUpView";

export const metadata = {
  title: "Sign Up | Fibio Wholesale",
  description: "Create an account with your mobile number to start ordering wholesale products.",
  robots: { index: true, follow: true },
};

export default function CustomerSignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpView />
    </Suspense>
  );
}
