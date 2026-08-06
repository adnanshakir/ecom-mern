"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createProduct } from "@/services/products";
import { productSchema } from "@/schemas/product";

const EMPTY_VARIANT = { sku: "", price: "", stock: "", salePrice: "", barcode: "" };

// Fields that belong to "step 1" — validated before letting the user move
// on to the variants step.
const DETAILS_FIELDS = [
  "name",
  "category",
  "brand",
  "status",
  "featured",
  "images",
  "seoTitle",
  "seoDescription",
];

export function useCreateProduct() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = details, 2 = variants
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      brand: "",
      status: "draft",
      featured: false,
      seoTitle: "",
      seoDescription: "",
      images: "",
      variants: [EMPTY_VARIANT],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

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
      images: values.images
        ? values.images.split("\n").map((url) => url.trim()).filter(Boolean)
        : undefined,
      variants: values.variants.map((v) => ({
        ...v,
        salePrice: v.salePrice || undefined,
        barcode: v.barcode || undefined,
        weight: v.weight?.value ? { value: v.weight.value, unit: v.weight.unit || "g" } : undefined,
      })),
    };

    try {
      const { data } = await createProduct(payload);
      router.push(`/products/${data.data._id}`);
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