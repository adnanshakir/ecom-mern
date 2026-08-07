import { cn } from "@/lib/utils";

const ACTION_STYLES = {
  create: "bg-emerald-500/10 text-emerald-500",
  update: "bg-amber-500/10 text-amber-500",
  delete: "bg-red-500/10 text-red-500",
};

const ROLE_STYLES = {
  super_admin: "bg-violet-500/10 text-violet-500",
  admin: "bg-blue-500/10 text-blue-500",
  staff: "bg-slate-500/10 text-slate-400",
};

export function ActionBadge({ action }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        ACTION_STYLES[action] || "bg-muted text-muted-foreground"
      )}
    >
      {action}
    </span>
  );
}

export function RoleBadge({ role }) {
  if (!role) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        ROLE_STYLES[role] || "bg-muted text-muted-foreground"
      )}
    >
      {role.replace("_", " ")}
    </span>
  );
}