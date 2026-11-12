import { useState } from "react";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { createCategory } from "@/services/admin/categories";
import { createBrand } from "@/services/admin/brands";
import { QuickCreateEntityDialog } from "@/components/admin/products/QuickCreateEntityDialog";
import { ImageUploader } from "@/components/admin/products/ImageUploader";
import { OptionTypesEditor } from "@/components/admin/products/OptionTypesEditor";

export function ProductDetailsFields({ form, categories, brands, refetchCategories, refetchBrands }) {
  const [detailsBucketOpen, setDetailsBucketOpen] = useState(false);

  const descriptionValue = form.watch("description") || "";
  const wordCount = descriptionValue.trim().split(/\s+/).filter(Boolean).length;
  const isOverWordLimit = wordCount > 500;

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
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
              <span
                className={`text-xs ${
                  isOverWordLimit
                    ? "text-destructive font-bold"
                    : wordCount > 400
                    ? "text-amber-500 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {wordCount} / 500 words
              </span>
            </div>
            <FormControl>
              <Textarea
                rows={5}
                placeholder="Write a comprehensive product description (up to 500 words)..."
                className="min-h-[120px] max-h-[260px] overflow-y-auto resize-y"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Additional Details Buckets (Key Features & Product Dimensions) */}
      <div className="rounded-lg border border-border/70 bg-muted/15 p-3.5 space-y-3">
        <button
          type="button"
          onClick={() => setDetailsBucketOpen((prev) => !prev)}
          className="flex w-full items-center justify-between text-left transition-colors hover:text-foreground"
        >
          <div>
            <span className="text-sm font-semibold text-foreground">
              Additional Details (Optional)
            </span>
            <p className="text-xs text-muted-foreground">
              Key features, product dimensions & extra detail sections
            </p>
          </div>
          <span className="flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground">
            {detailsBucketOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
          </span>
        </button>

        {detailsBucketOpen && (
          <div className="space-y-4 border-t border-border/50 pt-3">
            <FormField
              control={form.control}
              name="keyFeatures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Key Features (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="e.g.&#10;• 100% combed ring-spun cotton&#10;• Reinforced double stitching&#10;• Pre-shrunk fabric"
                      className="resize-y min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productDimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Product Dimensions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="e.g. Dimensions: 30cm x 20cm x 5cm | Weight: 250g | Standard fit"
                      className="resize-y min-h-[60px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>

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
