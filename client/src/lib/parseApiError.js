export function parseApiErrorMessage(message) {
  if (!message) return [];
  return message
    .split(/,(?=\s*[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}