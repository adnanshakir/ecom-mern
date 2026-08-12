"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getUsers, updateUser, deleteUser } from "@/services/admin/users";
import { userUpdateSchema } from "@/schemas/admin/user";

const DEFAULT_LIMIT = 20;

export function useUsers() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: { name: "", role: "staff", isActive: true },
  });

  // Filters driven by the URL, same pattern as useProducts — shareable/bookmarkable.
  const filters = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      role: searchParams.get("role") || "",
      isActive: searchParams.get("isActive") || "",
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || DEFAULT_LIMIT,
    }),
    [searchParams]
  );

  const updateParams = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === undefined || value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if (!("page" in updates)) params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const setFilter = (key, value) => updateParams({ [key]: value });
  const setPage = (page) => updateParams({ page });

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

  const remove = async (user) => {
    // Backend blocks self-deletion — the confirm/alert flow surfaces that
    // error if it's somehow attempted, but the UI also disables it directly.
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user._id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user");
    }
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

    openEditDialog,
    closeDialog,
    submit,
    remove,
    fetchUsers,
  };
}