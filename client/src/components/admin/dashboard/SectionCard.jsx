import { cn } from "@/lib/utils";

export default function SectionCard({ title, icon: Icon, action, children, className }) {
  return (
    <section className={cn("surface fade-up", className)}>
      <header className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
          {title}
        </h2>
        {action}
      </header>
      <div className="px-2 pb-2">{children}</div>
    </section>
  );
}
