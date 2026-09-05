/**
 * Returns the API base URL (e.g. "http://localhost:5000/api" or "https://my-backend.onrender.com/api").
 * Single source of truth for Axios, fetch, and auth client.
 */
export const getApiBaseUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL
    ? String(process.env.NEXT_PUBLIC_API_URL).trim()
    : "";

  if (rawUrl) {
    return rawUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    const errorMsg =
      "[FATAL CONFIG ERROR] NEXT_PUBLIC_API_URL environment variable is required in production builds but was not found!";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return "http://localhost:5000/api";
};

/**
 * Returns the base origin for authentication client (e.g. "http://localhost:5000" or "https://my-backend.onrender.com").
 * Derived directly by stripping the trailing "/api" suffix from getApiBaseUrl().
 */
export const getAuthBaseUrl = () => {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
};
