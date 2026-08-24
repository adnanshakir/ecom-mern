"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  fetchCategories,
  addCategory,
  editCategory,
  removeCategory,
} from "@/redux/slices/categoriesSlice";
import { categorySchema } from "@/schemas/admin/category";
import { buildCategoryTree, getDescendantIds } from "@/lib/categoryTree";
import { useConfirm } from "@/hooks/useConfirm";

export function useCategories() {
  const dispatch = useDispatch();
  const { items: categories, loading, error, fetched } = useSelector(
    (state) => state.categories
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [expandedIds, setExpandedIds] = useState(new Set());

  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  const isExpanded = (id) => expandedIds.has(id);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", parent: "", isActive: true, image: { url: "", fileId: "" } },
  });

  useEffect(() => {
    if (!fetched) dispatch(fetchCategories());
  }, [dispatch, fetched]);

  const fetchCategoriesAgain = () => dispatch(fetchCategories());

  // A category can't be nested under itself or any of its own descendants —
  // excludes both when editing, prevents cycles.
  const excludedIds = editingCategory
    ? new Set([editingCategory._id, ...getDescendantIds(categories, editingCategory._id)])
    : new Set();
  const parentOptions = buildCategoryTree(categories).filter((c) => !excludedIds.has(c._id));

  const create = async (values) => {
    const payload = { ...values, parent: values.parent || undefined };
    return dispatch(addCategory(payload)).unwrap();
  };

  const update = async (values) => {
    const payload = { ...values, parent: values.parent || undefined };
    return dispatch(editCategory({ id: editingCategory._id, payload })).unwrap();
  };

  const remove = (category) => {
    requestConfirm({
      title: "Delete category?",
      description: `This will permanently delete "${category.name}" and may affect products under it.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        await dispatch(removeCategory(category._id)).unwrap();
      },
    });
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormError(null);
    form.reset({ name: "", parent: "", isActive: true, image: { url: "", fileId: "" } });
    setDialogOpen(true);
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setFormError(null);
    form.reset({
      name: category.name,
      parent: category.parent?._id || category.parent || "",
      isActive: !!category.isActive,
      image: category.image ? { url: category.image.url || "", fileId: category.image.fileId || "" } : { url: "", fileId: "" },
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormError(null);
    form.reset();
  };

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
    } catch (err) {
      setFormError(err || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    categories,
    loading,
    error,
    parentOptions,

    dialogOpen,
    setDialogOpen,
    editingCategory,

    form,
    formError,
    submitting,

    isExpanded,
    toggleExpanded,

    confirmState,
    handleConfirm,
    handleCancel,

    openCreateDialog,
    openEditDialog,
    closeDialog,

    fetchCategories: fetchCategoriesAgain,
    create,
    update,
    remove,
    submit,
  };
}