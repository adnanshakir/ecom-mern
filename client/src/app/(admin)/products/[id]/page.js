"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

import { useProduct } from "@/hooks/useProduct";
import { useEditProduct } from "@/hooks/useEditProduct";
import { useProductVariants } from "@/hooks/useProductVariants";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { RoleGate } from "@/components/RoleGate";
import { ProductView } from "@/components/products/ProductView";
import { ProductDetailsFields } from "@/components/products/ProductDetailsFields";
import { VariantRowFields } from "@/components/products/VariantRowFields";
import { ApiErrorSummary } from "@/components/ApiErrorSummary";
import { FormErrorSummary } from "@/components/FormErrorSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/products")}>
            <ArrowLeft className="size-4" />
            Back to products
          </Button>

          {!loading && !error && !editing && (
            <Button size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
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
                    onSaved={() => {
                      refetch();
                      setEditing(false);
                    }}
                  />
                </TabsContent>

                <TabsContent value="variants" className="pt-4">
                  <VariantsTab productId={id} onChanged={refetch} />
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
    await submit(values);
    onSaved?.();
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

function VariantsTab({ productId, onChanged }) {
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit variant" : "New variant"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" noValidate>
              <VariantRowFields form={form} stockReadOnly={!!editingVariant} />

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
    </div>
  );
}