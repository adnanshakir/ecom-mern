import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuantitySelector({ value, onChange, max = 99 }) {
  return (
    <div className="flex w-fit items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7.5 shrink-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-8 text-center text-xs font-bold">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7.5 shrink-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
