/**
 * Returns the API base URL, handling both SSR (server-side) and CSR (client-side) contexts.
 * Centralised here so every Axios instance uses the same logic.
 */
export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "/api";
  }
  return process.env.NEXT_PUBLIC_API_URL &&
    process.env.NEXT_PUBLIC_API_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://ecom-mern-c5wz.onrender.com/api";
};
