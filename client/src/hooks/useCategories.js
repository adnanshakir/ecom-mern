"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "@/schemas/category";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/services/categories";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = creating

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      parent: "",
      isActive: true,
    },
  });

  // CRUD
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await getCategories();
      setCategories(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = async (values) => {
    const payload = {
      ...values,
      parent: values.parent || undefined,
    };

    await createCategory(payload);
  };

  const update = async (values) => {
    const payload = {
      ...values,
      parent: values.parent || undefined,
    };

    await updateCategory(editingCategory._id, payload);
  };

  const remove = async (category) => {
    // Backend blocks deletion if it has children or a Product references it —
    // the error message from the API explains that case, so we just surface it.
    if (!window.confirm(`Delete category "${category.name}"?`)) return;

    try {
      await deleteCategory(category._id);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete category");
    }
  };

  // UI Actions
  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormError(null);

    form.reset({
      name: "",
      parent: "",
      isActive: true,
    });

    setDialogOpen(true);
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setFormError(null);

    form.reset({
      name: category.name,
      parent: category.parent?._id || category.parent || "",
      isActive: !!category.isActive,
    });

    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormError(null);
    form.reset();
  };

  // Submit
  const submit = async (values) => {
    try {
      setSubmitting(true);
      setFormError(null);

      if (editingCategory) {
        await update(values);
      } else {
        await create(values);
      }

      closeDialog();
      fetchCategories();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  // A category can't be nested under itself — exclude it from the parent
  // options when editing. Computed here so the page doesn't need to know about
  // editingCategory at all.
  const parentOptions = categories.filter((c) => c._id !== editingCategory?._id);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,

    dialogOpen,
    setDialogOpen,
    editingCategory,

    form,
    formError,
    submitting,

    parentOptions,

    openCreateDialog,
    openEditDialog,
    closeDialog,

    fetchCategories,
    create,
    update,
    remove,
    submit,
  };
}
