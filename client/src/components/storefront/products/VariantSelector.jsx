import { cn } from "@/lib/utils";

export function VariantSelector({ optionTypes, selectedOptions, onSelect }) {
  if (!optionTypes.length) return null;

  return (
    <div className="grid gap-3">
      {optionTypes.map((optionType) => (
        <div key={optionType.name} className="grid gap-1.5">
          <span className="text-sm font-medium">{optionType.name}</span>
          <div className="flex flex-wrap gap-2">
            {optionType.values.map((value) => {
              const isSelected = selectedOptions[optionType.name] === value;
              return (
                <button
                  key={value}
                  onClick={() => onSelect(optionType.name, value)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
