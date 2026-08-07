"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useEditProduct } from "@/hooks/useEditProduct";
import { useProductVariants } from "@/hooks/useProductVariants";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { ProductDetailsFields } from "@/components/products/ProductDetailsFields";
import { VariantRowFields } from "@/components/products/VariantRowFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Form } from "@/components/ui/form";

export function EditProductDialog({ productId, open, onOpenChange, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
        </DialogHeader>

        {productId && (
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="pt-4">
              <DetailsTab productId={productId} onSaved={onSaved} />
            </TabsContent>

            <TabsContent value="variants" className="pt-4">
              <VariantsTab productId={productId} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailsTab({ productId, onSaved }) {
  const { form, loading, loadError, submit, submitting, formError, saved } = useEditProduct(productId);
  const { categories, fetchCategories } = useCategories();
  const { brands, fetchBrands } = useBrands();

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

  const handleSubmit = async (values) => {
    await submit(values);
    onSaved?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" noValidate>
        <ProductDetailsFields
          form={form}
          categories={categories}
          brands={brands}
          refetchCategories={fetchCategories}
          refetchBrands={fetchBrands}
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
  );
}

function VariantsTab({ productId }) {
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
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Variants</span>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add variant
        </Button>
      </div>

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
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant._id}>
                <TableCell>{variant.sku}</TableCell>
                <TableCell>{variant.price}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit variant" : "New variant"}</DialogTitle>
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
    </div>
  );
}
