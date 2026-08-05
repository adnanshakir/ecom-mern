"use client";

import { useParams } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useEditProduct } from "@/hooks/useEditProduct";
import { useProductVariants } from "@/hooks/useProductVariants";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export default function EditProductPage() {
  const { id } = useParams();

  return (
    <RoleGate allow={["super_admin", "admin"]}>
      <div className="mx-auto grid max-w-2xl gap-6">
        <h1 className="text-xl font-semibold">Edit product</h1>
        <ProductDetailsForm productId={id} />
        <VariantsPanel productId={id} />
      </div>
    </RoleGate>
  );
}

function ProductDetailsForm({ productId }) {
  const { form, loading, loadError, submit, submitting, formError, saved } = useEditProduct(productId);
  const { categories } = useCategories();
  const { brands } = useBrands();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading product...
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
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
                    <FormMessage />
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
                    <FormMessage />
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
                  <FormLabel>Image URLs (one per line)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO title (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seoDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
            {saved && <p className="text-sm text-emerald-500">Saved.</p>}

            <Button type="submit" disabled={submitting} className="w-fit">
              {submitting && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function VariantsPanel({ productId }) {
  const {
    variants,
    loading,
    error,
    dialogOpen,
    setDialogOpen,
    editingVariant,
    form,
    formError,
    submitting,
    openCreateDialog,
    openEditDialog,
    remove,
    submit,
  } = useProductVariants(productId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Variants</CardTitle>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add variant
        </Button>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading variants...
          </div>
        )}

        {!loading && error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Sale price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant._id}>
                  <TableCell>{variant.sku}</TableCell>
                  <TableCell>{variant.price}</TableCell>
                  <TableCell className="text-muted-foreground">{variant.salePrice ?? "—"}</TableCell>
                  <TableCell>{variant.stock}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(variant)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={variants.length <= 1}
                      title={variants.length <= 1 ? "A product must have at least one variant" : undefined}
                      onClick={() => remove(variant)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit variant" : "New variant"}</DialogTitle>
            <DialogDescription>
              {editingVariant ? "Update this variant." : "Add a new variant to this product."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="grid gap-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="barcode"
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
                  name="price"
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
                  name="salePrice"
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
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <FormField
                    control={form.control}
                    name="weight.value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
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
                    name="weight.unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="animate-spin" />}
                  {editingVariant ? "Save changes" : "Add variant"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
