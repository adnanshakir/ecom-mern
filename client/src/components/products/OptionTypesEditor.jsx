"use client";

import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormControl } from "@/components/ui/form";

export function OptionTypesEditor({ form }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "optionTypes",
  });

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Option types (optional)</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: "", values: [] })}
        >
          <Plus className="size-4" />
          Add option type
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          e.g. &quot;Color&quot; with values Red/Black/Green — variants will pick one value per type
          instead of typing it freehand.
        </p>
      )}

      {fields.map((optionField, index) => (
        <OptionTypeRow
          key={optionField.id}
          form={form}
          index={index}
          onRemove={() => remove(index)}
        />
      ))}
    </div>
  );
}

function OptionTypeRow({ form, index, onRemove }) {
  const {
    fields: valueFields,
    append: appendValue,
    remove: removeValue,
  } = useFieldArray({
    control: form.control,
    name: `optionTypes.${index}.values`,
  });
  const [newValue, setNewValue] = useState("");

  const addValue = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    appendValue({ value: trimmed });
    setNewValue("");
  };

  return (
    <div className="grid gap-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <FormField
          control={form.control}
          name={`optionTypes.${index}.name`}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input placeholder="Color" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
          <X className="size-4" />
        </Button>
      </div>

      {valueFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valueFields.map((vf, vi) => (
            <span
              key={vf.id}
              className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
            >
              {form.watch(`optionTypes.${index}.values.${vi}.value`)}
              <button type="button" onClick={() => removeValue(vi)}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add a value (e.g. Red)"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addValue}>
          Add
        </Button>
      </div>
    </div>
  );
}
