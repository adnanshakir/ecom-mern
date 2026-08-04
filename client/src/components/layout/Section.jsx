import { cn } from "@/lib/utils";

export function Section({ className, children, ...props }) {
  return (
    <section className={cn("py-8 sm:py-10", className)} {...props}>
      {children}
    </section>
  );
}
