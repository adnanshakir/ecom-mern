export function FormErrorSummary({ errors }) {
  const messages = collectMessages(errors);
  if (messages.length === 0) return null;

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-sm font-medium text-destructive">
        Please fix the following before saving:
      </p>
      <ul className="mt-1 grid gap-0.5 text-sm text-destructive">
        {messages.map((msg, i) => (
          <li key={i}>• {msg}</li>
        ))}
      </ul>
    </div>
  );
}

function collectMessages(errors, path = "") {
  if (!errors) return [];
  const messages = [];

  Object.entries(errors).forEach(([key, value]) => {
    if (!value) return;
    const currentPath = path ? `${path}.${key}` : key;

    if (value.message) {
      messages.push(`${currentPath}: ${value.message}`);
    } else if (typeof value === "object") {
      messages.push(...collectMessages(value, currentPath));
    }
  });

  return messages;
}