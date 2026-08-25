"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getUsers, updateUser, deleteUser } from "@/services/admin/users";
import { userUpdateSchema } from "@/schemas/admin/user";
import { useConfirm } from "@/hooks/useConfirm";
import { useUrlFilters } from "@/hooks/admin/useUrlFilters";

const DEFAULT_LIMIT = 20;
const PARAM_KEYS = ["search", "role", "isActive"];

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();
  const { filters, setFilter, setPage } = useUrlFilters(PARAM_KEYS, DEFAULT_LIMIT);

  const form = useForm({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: { name: "", role: "staff", isActive: true },
  });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {
      page: filters.page,
      limit: filters.limit,
      ...(filters.search && { search: filters.search }),
      ...(filters.role && { role: filters.role }),
      ...(filters.isActive && { isActive: filters.isActive }),
    };

    getUsers(params)
      .then(({ data }) => {
        setUsers(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load users"))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormError(null);
    form.reset({ name: user.name, role: user.role, isActive: !!user.isActive });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormError(null);
    form.reset();
  };

  const submit = async (values) => {
    try {
      setSubmitting(true);
      setFormError(null);
      await updateUser(editingUser._id, values);
      closeDialog();
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (user) => {
    // Backend blocks self-deletion — the confirm dialog surfaces that
    // error if it's somehow attempted, but the UI also disables it directly.
    requestConfirm({
      title: "Delete user?",
      description: `This will permanently delete "${user.name}". This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        await deleteUser(user._id);
        fetchUsers();
      },
    });
  };

  return {
    users,
    pagination,
    loading,
    error,
    filters,
    setFilter,
    setPage,

    dialogOpen,
    setDialogOpen,
    editingUser,
    form,
    formError,
    submitting,

    confirmState,
    handleConfirm,
    handleCancel,

    openEditDialog,
    closeDialog,
    submit,
    remove,
    fetchUsers,
  };
}