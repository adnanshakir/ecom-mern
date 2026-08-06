import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { weightUnits } from "@/schemas/product";

// name prefix lets this render either `variants.${index}.sku` (inline array,
// on Create) or just `sku` (single-variant dialog, on Edit).
export function VariantRowFields({ form, namePrefix = "", stockReadOnly = false }) {
  const field = (name) => (namePrefix ? `${namePrefix}.${name}` : name);

  return (
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
            <FormLabel>Stock{stockReadOnly ? " (adjust via Inventory)" : ""}</FormLabel>
            <FormControl>
              <Input type="number" disabled={stockReadOnly} {...stockField} />
            </FormControl>
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
  );
}
