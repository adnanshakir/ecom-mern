"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "@/schemas/category";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/services/categories";
import { buildCategoryTree, getDescendantIds } from "@/lib/categoryTree";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

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

  const toggleExpanded = (categoryId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  const isExpanded = (categoryId) => expandedIds.has(categoryId);

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

  // new — excludes itself AND all its descendants, preventing a cycle:
  const excludedIds = editingCategory
    ? new Set([editingCategory._id, ...getDescendantIds(categories, editingCategory._id)])
    : new Set();
  const parentOptions = buildCategoryTree(categories).filter((c) => !excludedIds.has(c._id));

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then(({ data }) => {
        if (!cancelled) setCategories(data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || "Failed to load categories");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    categories,
    loading,
    error,
    expandedIds,
    isExpanded,
    toggleExpanded,

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
