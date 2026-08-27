"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

import { useProduct } from "@/hooks/admin/useProduct";
import { useEditProduct } from "@/hooks/admin/useEditProduct";
import { useProductVariants } from "@/hooks/admin/useProductVariants";
import { useCategories } from "@/hooks/admin/useCategories";
import { useBrands } from "@/hooks/admin/useBrands";
import { RoleGate } from "@/components/admin/RoleGate";
import { ProductView } from "@/components/admin/products/ProductView";
import { ProductDetailsFields } from "@/components/admin/products/ProductDetailsFields";
import { VariantRowFields } from "@/components/admin/products/VariantRowFields";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { FormErrorSummary } from "@/components/shared/FormErrorSummary";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/formatCurrency";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const { product, loading, error, refetch } = useProduct(id);

  return (
    <RoleGate allow={["super_admin", "admin"]}>
      <div className="grid w-full gap-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/products")} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to products
          </Button>

          {!loading && !error && (
            editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Done editing
              </Button>
            ) : (
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                Edit product
              </Button>
            )
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading product...
          </div>
        )}

        {!loading && error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && product && !editing && <ProductView product={product} />}

        {!loading && !error && editing && (
          <Card className="mx-auto w-full max-w-2xl">
            <CardContent className="pt-6">
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="pt-4">
                  <DetailsTab
                    productId={id}
                    onSaved={async () => {
                      await refetch();
                      setEditing(false);
                    }}
                  />
                </TabsContent>

                <TabsContent value="variants" className="pt-4">
                  <VariantsTab productId={id} optionTypes={product?.optionTypes || []} onChanged={refetch} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGate>
  );
}

function DetailsTab({ productId, onSaved }) {
  const { form, loading, loadError, submit, submitting, formError, saved } =
    useEditProduct(productId);
  const { categories, fetchCategories } = useCategories();
  const { brands, fetchBrands } = useBrands();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  const handleSubmit = async (values) => {
    const success = await submit(values);
    if (success) {
      await onSaved?.();
    }
  };

  // Runs when handleSubmit's own zod validation fails — this is the case
  // that was previously silent (e.g. images with undefined url/fileId).
  const handleInvalid = () => {
    // no-op here — FormErrorSummary below reads form.formState.errors
    // directly and re-renders automatically on any failed validation.
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
        className="grid gap-4"
        noValidate
      >
        <ProductDetailsFields
          form={form}
          categories={categories}
          brands={brands}
          refetchCategories={fetchCategories}
          refetchBrands={fetchBrands}
        />

        <FormErrorSummary errors={form.formState.errors} />

        <ApiErrorSummary message={formError} />
        {saved && <p className="text-sm text-emerald-500">Saved.</p>}

        <Button type="submit" disabled={submitting} className="w-fit">
          {submitting && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </form>
    </Form>
  );
}

function VariantsTab({ productId, optionTypes, onChanged }) {
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
    confirmState,
    handleConfirm,
    handleCancel,
  } = useProductVariants(productId);

  const handleSubmit = async (values) => {
    await submit(values);
    onChanged?.();
  };

  const handleRemove = async (variant) => {
    await remove(variant);
    onChanged?.();
  };

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
              <TableHead>Cost</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant._id}>
                <TableCell>{variant.sku}</TableCell>
                <TableCell>
                  {variant.salePrice ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-medium text-red-600 dark:text-red-400">{formatPrice(variant.salePrice)}</span>
                      <span className="text-xs text-muted-foreground line-through">{formatPrice(variant.price)}</span>
                    </div>
                  ) : (
                    formatPrice(variant.price)
                  )}
                </TableCell>
                <TableCell>{variant.costPrice ? formatPrice(variant.costPrice) : "—"}</TableCell>
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
                    onClick={() => handleRemove(variant)}
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
        <DialogContent className="max-h-[85vh] sm:max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit variant" : "New variant"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" noValidate>
              <VariantRowFields form={form} stockReadOnly={!!editingVariant} optionTypes={optionTypes} />

              <FormErrorSummary errors={form.formState.errors} />

              <ApiErrorSummary message={formError} />

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

      {/* Delete Confirm Dialog */}
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}