import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuantitySelector({ value, onChange, max = 99 }) {
  return (
    <div className="flex w-fit items-center rounded-md border">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-10 text-center text-sm">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
