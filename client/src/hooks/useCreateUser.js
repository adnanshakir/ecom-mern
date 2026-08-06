"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerUser, clearRegisterStatus } from "@/redux/slices/authSlice";
import { registerSchema } from "@/schemas/auth";

export function useCreateUser(onCreated) {
  const dispatch = useDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "admin" },
  });

  const openCreateDialog = () => {
    setFormError(null);
    form.reset({ name: "", email: "", password: "", role: "admin" });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormError(null);
    dispatch(clearRegisterStatus());
    form.reset();
  };

  const submit = async (values) => {
    setSubmitting(true);
    setFormError(null);
    const result = await dispatch(registerUser(values));
    setSubmitting(false);

    if (registerUser.fulfilled.match(result)) {
      closeDialog();
      onCreated?.();
    } else {
      setFormError(result.payload || "Failed to create user");
    }
  };

  return {
    dialogOpen,
    setDialogOpen,
    form,
    formError,
    submitting,
    openCreateDialog,
    closeDialog,
    submit,
  };
}