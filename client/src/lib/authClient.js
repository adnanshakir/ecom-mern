import { createAuthClient } from "better-auth/react";
import { phoneNumberClient, emailOTPClient } from "better-auth/client/plugins";

const getAuthBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  return "http://localhost:5000";
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: "/api/v1/customers/auth",
  plugins: [
    phoneNumberClient(),
    emailOTPClient(),
  ],
});
