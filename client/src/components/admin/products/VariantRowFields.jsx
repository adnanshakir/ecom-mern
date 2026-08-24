import { useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ImageUploader } from "@/components/admin/products/ImageUploader";
import { weightUnits } from "@/schemas/admin/product";

// name prefix lets this render either `variants.${index}.sku` (inline array,
// on Create) or just `sku` (single-variant dialog, on Edit).
export function VariantRowFields({ form, namePrefix = "", stockReadOnly = false, optionTypes = [] }) {
  const field = (name) => (namePrefix ? `${namePrefix}.${name}` : name);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={field("sku")}
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input placeholder="TEE-BLK-M" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={field("barcode")}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barcode (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={field("price")}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={field("salePrice")}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sale price (optional)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={field("costPrice")}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost per item (optional, seller only)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g. 11.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={field("stock")}
          render={({ field: stockField }) => (
            <FormItem>
              <FormLabel>Stock</FormLabel>
              {stockReadOnly ? (
                <p className="flex h-9 items-center text-sm text-muted-foreground">
                  {stockField.value} <span className="ml-1 text-xs">(adjust via Inventory)</span>
                </p>
              ) : (
                <FormControl>
                  <Input type="number" {...stockField} />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-[1fr_100px] gap-2">
          <FormField
            control={form.control}
            name={field("weight.value")}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={field("weight.unit")}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select value={field.value ?? "g"} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {weightUnits.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <VariantOptionsFields form={form} namePrefix={namePrefix} optionTypes={optionTypes} />

      <FormField
        control={form.control}
        name={field("images")}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Variant images (optional, up to 4)</FormLabel>
            <FormControl>
              <ImageUploader images={field.value || []} onChange={field.onChange} maxImages={4} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

function VariantOptionsFields({ form, namePrefix, optionTypes }) {
  const field = (name) => (namePrefix ? `${namePrefix}.${name}` : name);
  const currentOptions = form.watch(field("options")) || [];

  const getValue = (typeName) => currentOptions.find((o) => o.name === typeName)?.value || "";

  const setOptionValue = (typeName, value) => {
    const existing = form.getValues(field("options")) || [];
    const filtered = existing.filter((o) => o.name !== typeName);
    const next = value ? [...filtered, { name: typeName, value }] : filtered;
    form.setValue(field("options"), next, { shouldDirty: true, shouldValidate: true });
  };

  if (!optionTypes.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No option types defined on this product yet — add them in Details to map this variant
        (e.g. Color: Red).
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Options</span>
      <div className="grid grid-cols-2 gap-3">
        {optionTypes.map((optionType) => (
          <div key={optionType.name} className="grid gap-1.5">
            <label className="text-xs text-muted-foreground">{optionType.name}</label>
            <Select
              value={getValue(optionType.name) || "none"}
              onValueChange={(v) => setOptionValue(optionType.name, v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${optionType.name}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {optionType.values.map((val) => (
                  <SelectItem key={val} value={val}>
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
