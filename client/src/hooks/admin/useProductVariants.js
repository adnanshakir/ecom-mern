"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getVariants, createVariant, updateVariant, deleteVariant } from "@/services/admin/variants";
import { variantSchema } from "@/schemas/admin/product";

const EMPTY_VARIANT = { sku: "", price: "", stock: "", salePrice: "", barcode: "" };

export function useProductVariants(productId) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null); // null = creating

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(variantSchema),
    defaultValues: EMPTY_VARIANT,
  });

  const fetchVariants = useCallback(() => {
    if (!productId) return;
    setLoading(true);
    getVariants(productId)
      .then(({ data }) => setVariants(data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load variants"))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const openCreateDialog = () => {
    setEditingVariant(null);
    setFormError(null);
    form.reset(EMPTY_VARIANT);
    setDialogOpen(true);
  };

  const openEditDialog = (variant) => {
    setEditingVariant(variant);
    setFormError(null);
    form.reset({
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      salePrice: variant.salePrice || "",
      barcode: variant.barcode || "",
      weight: variant.weight || undefined,
      images: variant.images || [],
      options: variant.options || [],
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingVariant(null);
    setFormError(null);
    form.reset(EMPTY_VARIANT);
  };

  const create = async (values) => {
    await createVariant(productId, cleanPayload(values));
  };

  const update = async (values) => {
    await updateVariant(productId, editingVariant._id, cleanPayload(values));
  };

  const submit = async (values) => {
    try {
      setSubmitting(true);
      setFormError(null);

      if (editingVariant) {
        await update(values);
      } else {
        await create(values);
      }

      closeDialog();
      fetchVariants();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save variant");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (variant) => {
    // Backend blocks deleting a product's only remaining variant.
    if (variants.length <= 1) return;
    if (!window.confirm(`Delete variant "${variant.sku}"?`)) return;

    try {
      await deleteVariant(productId, variant._id);
      fetchVariants();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete variant");
    }
  };

  return {
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
    closeDialog,

    fetchVariants,
    create,
    update,
    remove,
    submit,
  };
}

function cleanPayload(values) {
  const cleanOptions = values.options?.filter((o) => o.name && o.value);
  return {
    ...values,
    salePrice: values.salePrice || undefined,
    barcode: values.barcode || undefined,
    weight: values.weight?.value
      ? { value: values.weight.value, unit: values.weight.unit || "g" }
      : undefined,
    images: values.images?.length ? values.images : undefined,
    options: cleanOptions?.length ? cleanOptions : undefined,
  };
}
