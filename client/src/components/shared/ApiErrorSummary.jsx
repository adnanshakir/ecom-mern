import { parseApiErrorMessage } from "@/lib/parseApiError";

export function ApiErrorSummary({ message }) {
  const lines = parseApiErrorMessage(message);
  if (lines.length === 0) return null;

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3" role="alert">
      <p className="text-sm font-medium text-destructive">
        {lines.length > 1 ? "The server rejected this:" : "Error"}
      </p>
      <ul className="mt-1 grid gap-0.5 text-sm text-destructive">
        {lines.map((line, i) => (
          <li key={i}>• {line}</li>
        ))}
      </ul>
    </div>
  );
}