import Link from "next/link";
import { cn } from "@/lib/utils";

export default function KpiCard({ icon: Icon, label, value, hint, href, alert = false }) {
  const Wrapper = href ? Link : "div";
  const props = href ? { href } : {};
  return (
    <Wrapper {...props} className={cn("surface fade-up block p-4", href && "surface-hover cursor-pointer")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && (
        <p className={cn("mt-1 text-xs", alert ? "text-amber-500" : "text-muted-foreground")}>{hint}</p>
      )}
    </Wrapper>
  );
}
