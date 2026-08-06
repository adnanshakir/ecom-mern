"use client";

import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";

import { useCreateProduct } from "@/hooks/useCreateProduct";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function CreateProductDialog({ open, onOpenChange, onCreated }) {
  const {
    form,
    step,
    goToVariants,
    goToDetails,
    variantFields,
    addVariant,
    removeVariant,
    submit,
    submitting,
    formError,
  } = useCreateProduct(open, (product) => {
    onOpenChange(false);
    onCreated(product);
  });

  const { categories, fetchCategories } = useCategories();
  const { brands, fetchBrands } = useBrands();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>
            <Stepper step={step} />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            {step === 1 && (
              <div className="grid gap-4">
                <ProductDetailsFields
                  form={form}
                  categories={categories}
                  brands={brands}
                  refetchCategories={fetchCategories}
                  refetchBrands={fetchBrands}
                />
                <Button type="button" className="w-fit" onClick={goToVariants}>
                  Next: Variants
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Variants</span>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="size-4" />
                    Add variant
                  </Button>
                </div>

                {variantFields.map((variantField, index) => (
                  <div key={variantField.id} className="grid gap-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Variant {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={variantFields.length <= 1}
                        onClick={() => removeVariant(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <VariantRowFields form={form} namePrefix={`variants.${index}`} />
                  </div>
                ))}
                <FormMessage>{form.formState.errors.variants?.root?.message}</FormMessage>

                {formError && (
                  <p className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={goToDetails}>
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="animate-spin" />}
                    Create product
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }) {
  const steps = ["Details", "Variants"];
  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-xs",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary text-primary",
                !active && !done && "text-muted-foreground"
              )}
            >
              {num}
            </div>
            <span className={cn(active ? "font-medium text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
            {num < steps.length && <div className="h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}