"use client";

import { useParams } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useEditProduct } from "@/hooks/useEditProduct";
import { useProductVariants } from "@/hooks/useProductVariants";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { RoleGate } from "@/components/RoleGate";
import { ProductDetailsFields } from "@/components/products/ProductDetailsFields";
import { VariantRowFields } from "@/components/products/VariantRowFields";
import { Button } from "@/components/ui/button";
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
import { Form } from "@/components/ui/form";

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
            <ProductDetailsFields form={form} categories={categories} brands={brands} />

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
              <VariantRowFields form={form} stockReadOnly={!!editingVariant} />

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
