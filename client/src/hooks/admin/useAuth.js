"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { loginSchema, registerSchema } from "@/schemas/admin/auth";
import {
  login,
  logout,
  registerUser,
  clearRegisterStatus,
} from "@/redux/slices/authSlice";

export function useAuth() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { status, registerStatus, registerError } = useSelector((state) => state.auth);

  const [serverError, setServerError] = useState(null);

  // Forms
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "admin" },
  });

  // Login
  const submitLogin = async (values) => {
    console.log("LOGIN VALUES:", JSON.stringify(values));
    setServerError(null);

    const result = await dispatch(login(values));

    if (login.fulfilled.match(result)) {
      router.push("/admin/dashboard");
    } else {
      setServerError(result.payload || "Unable to log in");
    }
  };

  // Register
  const submitRegister = async (values) => {
    const result = await dispatch(registerUser(values));

    if (registerUser.fulfilled.match(result)) {
      registerForm.reset();
    }
  };

  // Logout
  const handleLogout = async () => {
    await dispatch(logout());
    router.push("/admin/login");
  };

  const clearRegisterStatusAction = () => dispatch(clearRegisterStatus());

  // Clear register status on unmount so stale success/failure banners
  // don't linger if the user navigates away and comes back.
  useEffect(() => () => dispatch(clearRegisterStatus()), [dispatch]);

  return {
    loginForm,
    isLoginSubmitting: status === "loading",
    serverError,
    submitLogin,

    registerForm,
    isRegisterSubmitting: registerStatus === "loading",
    registerStatus,
    registerError,
    submitRegister,
    clearRegisterStatus: clearRegisterStatusAction,

    handleLogout,
  };
}
