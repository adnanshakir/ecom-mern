import { useFieldArray } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ImageUploader } from "@/components/products/ImageUploader";
import { weightUnits } from "@/schemas/product";

// name prefix lets this render either `variants.${index}.sku` (inline array,
// on Create) or just `sku` (single-variant dialog, on Edit).
export function VariantRowFields({ form, namePrefix = "", stockReadOnly = false }) {
  const field = (name) => (namePrefix ? `${namePrefix}.${name}` : name);

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control: form.control,
    name: field("options"),
  });

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

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Options (optional)</span>
          <Button type="button" variant="outline" size="sm" onClick={() => appendOption({ name: "", value: "" })}>
            <Plus className="size-4" />
            Add option
          </Button>
        </div>

        {optionFields.length === 0 && (
          <p className="text-xs text-muted-foreground">
            e.g. Color: Black, Size: Medium — helps distinguish this variant from others.
          </p>
        )}

        {optionFields.map((optionField, i) => (
          <div key={optionField.id} className="flex items-end gap-2">
            <FormField
              control={form.control}
              name={field(`options.${i}.name`)}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Color" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={field(`options.${i}.value`)}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs">Value</FormLabel>
                  <FormControl>
                    <Input placeholder="Black" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" className="mb-0.5" onClick={() => removeOption(i)}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <FormField
        control={form.control}
        name={field("image")}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Variant image (optional)</FormLabel>
            <FormControl>
              <ImageUploader
                images={field.value ? [{ url: field.value, fileId: field.value }] : []}
                onChange={(imgs) => field.onChange(imgs[0]?.url)}
                multiple={false}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
