import { createAuthClient } from "better-auth/react";
import { phoneNumberClient, emailOTPClient } from "better-auth/client/plugins";
import { getAuthBaseUrl } from "./apiBaseUrl";

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: "/api/v1/customers/auth",
  plugins: [
    phoneNumberClient(),
    emailOTPClient(),
  ],
});
