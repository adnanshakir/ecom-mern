/**
 * Returns the API base URL, handling both SSR (server-side) and CSR (client-side) contexts.
 * Centralised here so every Axios instance uses the same logic.
 */
export const getApiBaseUrl = () => {
  let url = "";
  if (typeof window !== "undefined") {
    url = process.env.NEXT_PUBLIC_API_URL || "/api";
  } else {
    url =
      process.env.NEXT_PUBLIC_API_URL &&
      process.env.NEXT_PUBLIC_API_URL.startsWith("http")
        ? process.env.NEXT_PUBLIC_API_URL
        : "https://ecom-mern-c5wz.onrender.com/api";
  }
  return url.replace(/\/+$/, "");
};
