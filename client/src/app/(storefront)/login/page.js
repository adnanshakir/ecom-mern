import { Suspense } from "react";
import { AuthFormTabs } from "@/components/storefront/auth/AuthFormTabs";

export const metadata = {
  title: "Login / Register | Fibio Wholesale",
  description: "Log in or register your account to start ordering wholesale products.",
};

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthFormTabs />
    </Suspense>
  );
}