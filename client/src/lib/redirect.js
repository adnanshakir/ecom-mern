/**
 * Ensures the given redirect path is safe and relative to avoid open-redirect vulnerabilities.
 * @param {string|null} fromParam - The 'from' search query parameter.
 * @returns {string} Safe relative path (e.g. "/cart" or "/")
 */
export function getSafeRedirectUrl(fromParam) {
  if (!fromParam || typeof fromParam !== "string") return "/";
  const trimmed = fromParam.trim();
  // Safe relative paths must start with a single "/" and NOT "//" or "http:" / "https:"
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes(":")) {
    return trimmed;
  }
  return "/";
}
