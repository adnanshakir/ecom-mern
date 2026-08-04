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
  const [editingBrand, setEditingBrand] = useState(null);

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const form = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
      logo: "",
      isActive: true,
    },
  });

  // CRUD
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await getBrands();
      setBrands(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (values) => {
    const payload = {
      ...values,
      logo: values.logo || undefined,
    };

    await createBrand(payload);
  };

  const update = async (values) => {
    const payload = {
      ...values,
      logo: values.logo || undefined,
    };

    await updateBrand(editingBrand._id, payload);
  };

  const remove = async (brand) => {
    if (!window.confirm(`Delete brand "${brand.name}"?`)) return;

    try {
      await deleteBrand(brand._id);
      fetchBrands();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete brand");
    }
  };

  // UI Actions
  const openCreateDialog = () => {
    setEditingBrand(null);
    setFormError(null);

    form.reset({
      name: "",
      logo: "",
      isActive: true,
    });

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

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBrand(null);
    setFormError(null);
    form.reset();
  };

  // Submit
  const submit = async (values) => {
    try {
      setSubmitting(true);
      setFormError(null);

      if (editingBrand) {
        await update(values);
      } else {
        await create(values);
      }

      closeDialog();
      fetchBrands();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save brand");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return {
    brands,
    loading,
    error,

    dialogOpen,
    setDialogOpen,
    editingBrand,

    form,
    formError,
    submitting,

    openCreateDialog,
    openEditDialog,
    closeDialog,

    fetchBrands,
    create,
    update,
    remove,
    submit,
  };
}
