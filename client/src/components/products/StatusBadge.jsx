import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  draft: "bg-slate-500/10 text-slate-400",
  active: "bg-emerald-500/10 text-emerald-500",
  archived: "bg-red-500/10 text-red-500",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status] || "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}