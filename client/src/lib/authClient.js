import { createAuthClient } from "better-auth/react";
import { phoneNumberClient, emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000",
  basePath: "/api/v1/customers/auth",
  plugins: [
    phoneNumberClient(),
    emailOTPClient(),
  ],
});
