import { cn } from "@/lib/utils";

const STYLES = {
  placed: "bg-blue-500/10 text-blue-400",
  packed: "bg-amber-500/10 text-amber-400",
  shipped: "bg-violet-500/10 text-violet-400",
  delivered: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-red-500/10 text-red-400",
  failed: "bg-red-500/10 text-red-400",
  paid: "bg-emerald-500/10 text-emerald-400",
};

export default function StatusBadge({ status, children }) {
  const s = String(status || children || "").toLowerCase();
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize", STYLES[s] || "bg-muted text-muted-foreground")}>
      {s || "-"}
    </span>
  );
}
