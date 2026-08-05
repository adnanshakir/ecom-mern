"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createProduct } from "@/services/products";
import { productSchema } from "@/schemas/product";

const EMPTY_VARIANT = { sku: "", price: "", stock: "", salePrice: "", barcode: "", weight: "" };

export function useCreateProduct() {
  const router = useRouter();
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
    // Mirrors the backend's "at least one variant" rule client-side —
    // there's no product yet at this point, so this just protects the form.
    if (fields.length <= 1) return;
    remove(index);
  };

  const submit = async (values) => {
     console.log("submit called");
    setSubmitting(true);
    setFormError(null);
    console.log("Submitting product:", JSON.stringify(values, null, 2));

    const payload = {
      ...values,
      images: values.images
        ? values.images.split("\n").map((url) => url.trim()).filter(Boolean)
        : undefined,
      variants: values.variants.map((v) => ({
        ...v,
        salePrice: v.salePrice || undefined,
        barcode: v.barcode || undefined,
        weight: v.weight || undefined,
      })),
    };

    try {
      const { data } = await createProduct(payload);
      console.log("Product created successfully:", data);
      router.push(`/products/${data.data._id}`);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    variantFields: fields,
    addVariant,
    removeVariant,
    submit,
    submitting,
    formError,
  };
}