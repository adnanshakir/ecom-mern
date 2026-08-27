import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { createCategory } from "@/services/admin/categories";
import { createBrand } from "@/services/admin/brands";
import { QuickCreateEntityDialog } from "@/components/admin/products/QuickCreateEntityDialog";
import { ImageUploader } from "@/components/admin/products/ImageUploader";
import { OptionTypesEditor } from "@/components/admin/products/OptionTypesEditor";

export function ProductDetailsFields({ form, categories, brands, refetchCategories, refetchBrands }) {
  return (
    <div className="grid gap-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Classic Cotton Tee" {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Product description..."
                className="min-h-[90px] max-h-[180px] overflow-y-auto resize-none"
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <OptionTypesEditor form={form} />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Category</FormLabel>
                <QuickCreateEntityDialog
                  label="Category"
                  createFn={createCategory}
                  onCreated={(newCategory) => {
                    refetchCategories();
                    field.onChange(newCategory._id);
                  }}
                />
              </div>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category">
                      {categories.find((c) => c._id === field.value)?.name}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Brand</FormLabel>
                <QuickCreateEntityDialog
                  label="Brand"
                  createFn={createBrand}
                  onCreated={(newBrand) => {
                    refetchBrands();
                    field.onChange(newBrand._id);
                  }}
                />
              </div>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select brand">
                      {brands.find((b) => b._id === field.value)?.name}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="featured"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between pt-6">
              <FormLabel>Featured</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="images"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product images (optional, up to 4)</FormLabel>
            <FormControl>
              <ImageUploader images={field.value || []} onChange={field.onChange} maxImages={4} />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Search Engine Optimization (SEO) Section */}
      <div className="rounded-lg border border-border/60 p-4 space-y-4 bg-muted/20">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">SEO Settings (Optional)</h4>
          <span className="text-xs text-muted-foreground">Custom Search & Social Meta</span>
        </div>

        <FormField
          control={form.control}
          name="seo.metaTitle"
          render={({ field }) => {
            const length = field.value?.length || 0;
            return (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs">Meta Title</FormLabel>
                  <span className={`text-[10px] ${length > 60 ? "text-amber-500 font-medium" : "text-muted-foreground"}`}>
                    {length}/60 chars
                  </span>
                </div>
                <FormControl>
                  <Input placeholder="Custom title tag for search engines..." {...field} value={field.value || ""} />
                </FormControl>
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="seo.metaDescription"
          render={({ field }) => {
            const length = field.value?.length || 0;
            return (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs">Meta Description</FormLabel>
                  <span className={`text-[10px] ${length > 160 ? "text-amber-500 font-medium" : "text-muted-foreground"}`}>
                    {length}/160 chars
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Custom meta description snippet..."
                    className="resize-none"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="seo.keywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Meta Keywords (comma-separated)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. wholesale, cotton, t-shirt, fashion"
                  {...field}
                  value={Array.isArray(field.value) ? field.value.join(", ") : field.value || ""}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
