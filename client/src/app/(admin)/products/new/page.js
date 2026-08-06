"use client";

import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";

import { useCreateProduct } from "@/hooks/useCreateProduct";
import { useCategories } from "@/hooks/useCategories";
import { useBrands } from "@/hooks/useBrands";
import { RoleGate } from "@/components/RoleGate";
import { ProductDetailsFields } from "@/components/products/ProductDetailsFields";
import { VariantRowFields } from "@/components/products/VariantRowFields";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export default function NewProductPage() {
  return (
    <RoleGate allow={["super_admin", "admin"]}>
      <NewProductForm />
    </RoleGate>
  );
}

function NewProductForm() {
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
  } = useCreateProduct();
  const { categories } = useCategories();
  const { brands } = useBrands();

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <h1 className="text-xl font-semibold">New product</h1>

      <Stepper step={step} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ProductDetailsFields form={form} categories={categories} brands={brands} />
                <Button type="button" className="w-fit" onClick={goToVariants}>
                  Next: Variants
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Variants</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="size-4" />
                  Add variant
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
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
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
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
                "flex size-6 items-center justify-center rounded-full border text-xs",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary text-primary",
                !active && !done && "text-muted-foreground"
              )}
            >
              {num}
            </div>
            <span className={cn(active ? "font-medium" : "text-muted-foreground")}>
              {label}
            </span>
            {num < steps.length && <div className="h-px w-8 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}