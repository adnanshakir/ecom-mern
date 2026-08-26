import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VariantSelector({ optionTypes, selectedOptions, onSelect }) {
  if (!optionTypes?.length) return null;

  return (
    <div className="grid gap-3">
      {optionTypes.map((optionType) => {
        const currentValue = selectedOptions[optionType.name] || optionType.values[0] || "";
        return (
          <div key={optionType.name} className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {optionType.name}: <span className="text-foreground font-bold">{currentValue}</span>
            </label>
            <Select
              value={currentValue}
              onValueChange={(val) => onSelect(optionType.name, val)}
            >
              <SelectTrigger className="w-full h-[38px] rounded-lg border-slate-300 dark:border-slate-700 bg-background px-3 text-xs sm:text-sm font-medium">
                <SelectValue placeholder={`Select ${optionType.name}`} />
              </SelectTrigger>
              <SelectContent>
                {optionType.values.map((value) => (
                  <SelectItem key={value} value={value} className="text-xs sm:text-sm cursor-pointer">
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

