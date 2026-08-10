"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createProduct } from "@/services/products";
import { productSchema } from "@/schemas/product";

const EMPTY_VARIANT = { sku: "", price: "", stock: "", salePrice: "", barcode: "" };

const DETAILS_FIELDS = ["name", "category", "brand", "status", "featured", "images", "seoTitle", "seoDescription"];

const DEFAULTS = {
  name: "",
  category: "",
  brand: "",
  status: "draft",
  featured: false,
  seoTitle: "",
  seoDescription: "",
  images: [],
  variants: [EMPTY_VARIANT],
};

export function useCreateProduct(open, onCreated) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: DEFAULTS,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  // Reset to a clean slate every time the dialog opens.
  useEffect(() => {
    if (open) {
      setStep(1);
      setFormError(null);
      form.reset(DEFAULTS);
    }
  }, [open]);

  const addVariant = () => append(EMPTY_VARIANT);

  const removeVariant = (index) => {
    if (fields.length <= 1) return;
    remove(index);
  };

  const goToVariants = async () => {
    const valid = await form.trigger(DETAILS_FIELDS);
    if (valid) setStep(2);
  };

  const goToDetails = () => setStep(1);

  const submit = async (values) => {
    setSubmitting(true);
    setFormError(null);

    const payload = {
      ...values,
      images: values.images?.length ? values.images : undefined,
      variants: values.variants.map((v) => ({
        ...v,
        salePrice: v.salePrice || undefined,
        barcode: v.barcode || undefined,
        weight: v.weight?.value ? { value: v.weight.value, unit: v.weight.unit || "g" } : undefined,
        image: v.image || undefined,
        options: v.options?.filter((o) => o.name && o.value)?.length
          ? v.options.filter((o) => o.name && o.value)
          : undefined,
      })),
    };

    try {
      const { data } = await createProduct(payload);
      onCreated(data.data);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    step,
    goToVariants,
    goToDetails,
    variantFields: fields,
    addVariant,
    removeVariant,
    submit,
    submitting,
    formError,
  };
}
