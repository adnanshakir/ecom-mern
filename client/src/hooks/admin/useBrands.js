"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { fetchBrands, addBrand, editBrand, removeBrand } from "@/redux/slices/brandsSlice";
import { brandSchema } from "@/schemas/admin/brand";
import { useConfirm } from "@/hooks/useConfirm";

export function useBrands() {
  const dispatch = useDispatch();
  const { items: brands, loading, error, fetched } = useSelector((state) => state.brands);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  // Form
  const form = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
      logo: "",
      isActive: true,
    },
  });

  // Only fetch once — subsequent mounts (opening Create Product again,
  // navigating back to /brands) reuse the cached store data.
  useEffect(() => {
    if (!fetched) dispatch(fetchBrands());
  }, [dispatch, fetched]);

  const fetchBrandsAgain = () => dispatch(fetchBrands());

  // CRUD
  const create = async (values) => {
    const payload = { ...values, logo: values.logo || undefined };
    return dispatch(addBrand(payload)).unwrap();
  };

  const update = async (values) => {
    const payload = { ...values, logo: values.logo || undefined };
    return dispatch(editBrand({ id: editingBrand._id, payload })).unwrap();
  };

  const remove = (brand) => {
    requestConfirm({
      title: "Delete brand?",
      description: `This will permanently delete "${brand.name}". Any products referencing this brand may be affected.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        await dispatch(removeBrand(brand._id)).unwrap();
      },
    });
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
    } catch (err) {
      setFormError(err || "Failed to save brand");
    } finally {
      setSubmitting(false);
    }
  };

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

    confirmState,
    handleConfirm,
    handleCancel,

    openCreateDialog,
    openEditDialog,
    closeDialog,

    fetchBrands: fetchBrandsAgain,
    create,
    update,
    remove,
    submit,
  };
}
