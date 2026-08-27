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
      seo: {
        metaTitle: "",
        metaDescription: "",
        keywords: "",
      },
      optionTypes: [],
      category: "",
      brand: "",
      status: "draft",
      featured: false,
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
          seo: {
            metaTitle: product.seo?.metaTitle || "",
            metaDescription: product.seo?.metaDescription || "",
            keywords: Array.isArray(product.seo?.keywords)
              ? product.seo.keywords.join(", ")
              : product.seo?.keywords || "",
          },
          optionTypes: (product.optionTypes || []).map((ot) => ({
            name: ot.name,
            values: (ot.values || []).map((v) => ({ value: v })),
          })),
          category: product.category?._id || product.category || "",
          brand: product.brand?._id || product.brand || "",
          status: product.status || "draft",
          featured: !!product.featured,
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

    const formattedKeywords =
      typeof values.seo?.keywords === "string"
        ? values.seo.keywords.split(",").map((k) => k.trim()).filter(Boolean)
        : Array.isArray(values.seo?.keywords)
        ? values.seo.keywords
        : [];

    const payload = {
      ...values,
      seo: {
        metaTitle: values.seo?.metaTitle || "",
        metaDescription: values.seo?.metaDescription || "",
        keywords: formattedKeywords,
      },
      images: values.images || [],
      optionTypes: cleanOptionTypes(values.optionTypes) || [],
    };

    try {
      await updateProduct(productId, payload);
      setSaved(true);
      return true;
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save product");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { form, loading, loadError, submit, submitting, formError, saved };
}
