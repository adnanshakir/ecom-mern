"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getProduct, updateProduct } from "@/services/admin/products";
import { productDetailsSchema } from "@/schemas/admin/product";
import { cleanOptionTypes } from "@/lib/productSanitizers";

export function useEditProduct(productId) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saved, setSaved] = useState(false);

  const form = useForm({
    resolver: zodResolver(productDetailsSchema),
    defaultValues: {
      name: "",
      description: "",
      optionTypes: [],
      category: "",
      brand: "",
      status: "draft",
      featured: false,
      seoTitle: "",
      seoDescription: "",
      images: [],
    },
  });

  useEffect(() => {
    if (!productId) return;

    setLoading(true);
    getProduct(productId)
      .then(({ data }) => {
        const product = data.data;
        form.reset({
          name: product.name || "",
          description: product.description || "",
          optionTypes: (product.optionTypes || []).map((ot) => ({
            name: ot.name,
            values: (ot.values || []).map((v) => ({ value: v })),
          })),
          category: product.category?._id || product.category || "",
          brand: product.brand?._id || product.brand || "",
          status: product.status || "draft",
          featured: !!product.featured,
          seoTitle: product.seoTitle || "",
          seoDescription: product.seoDescription || "",
          images: product.images || [],
        });
      })
      .catch((err) => setLoadError(err.response?.data?.message || "Failed to load product"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async (values) => {
    setSubmitting(true);
    setFormError(null);
    setSaved(false);

    const payload = {
      ...values,
      images: values.images || [],
      optionTypes: cleanOptionTypes(values.optionTypes) || [],
    };

    try {
      await updateProduct(productId, payload);
      setSaved(true);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  return { form, loading, loadError, submit, submitting, formError, saved };
}
