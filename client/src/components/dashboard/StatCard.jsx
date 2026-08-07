import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLOR_STYLES = {
  blue: "bg-blue-500/10 text-blue-500",
  violet: "bg-violet-500/10 text-violet-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
};

export function StatCard({ label, value, icon: Icon, color = "blue" }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", COLOR_STYLES[color])}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}