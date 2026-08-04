"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandSchema } from "@/schemas/brand";
import { getBrands, createBrand, updateBrand, deleteBrand } from "@/services/brands";

export function useBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null); // null = creating
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchBrands = useCallback(() => {
    setLoading(true);
    getBrands()
      .then(({ data }) => setBrands(data.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load brands")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const form = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: "", logo: "", isActive: true },
  });

  const openCreateDialog = () => {
    setEditingBrand(null);
    setFormError(null);
    form.reset({ name: "", logo: "", isActive: true });
    setDialogOpen(true);
  };

  const openEditDialog = (brand) => {
    setEditingBrand(brand);
    setFormError(null);
    form.reset({
      name: brand.name,
      logo: brand.logo || "",
      isActive: !!brand.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    setFormError(null);
    const payload = { ...values, logo: values.logo || undefined };

    try {
      if (editingBrand) {
        await updateBrand(editingBrand._id, payload);
      } else {
        await createBrand(payload);
      }
      setDialogOpen(false);
      fetchBrands();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save brand");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (brand) => {
    // Backend blocks deletion if a Product references this brand — the
    // error message from the API explains that case, so we just surface it.
    if (!window.confirm(`Delete brand "${brand.name}"?`)) return;

    try {
      await deleteBrand(brand._id);
      fetchBrands();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete brand");
    }
  };

  return {
    brands,
    loading,
    error,
    dialogOpen,
    setDialogOpen,
    editingBrand,
    formError,
    submitting,
    form,
    openCreateDialog,
    openEditDialog,
    onSubmit,
    handleDelete,
  };
}
