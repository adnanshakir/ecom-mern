"use client";

import { SignInView } from "./SignInView";

/**
 * @deprecated Legacy modal auth form. Use SignInView or SignUpView pages instead.
 */
export function AuthFormTabs() {
  return <SignInView />;
}
