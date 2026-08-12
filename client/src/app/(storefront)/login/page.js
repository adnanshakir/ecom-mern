"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, X } from "lucide-react";

import { loginCustomer, registerCustomer } from "@/redux/slices/customerAuthSlice";
import { customerLoginSchema, customerRegisterSchema } from "@/schemas/storefront/customerAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";

export default function CustomerLoginPage() {
  const router = useRouter();

  // Lock background scroll while this "modal-styled" page is mounted.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <button
          onClick={() => router.push("/")}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="mb-4 text-center">
          <h1 className="text-lg font-semibold">Welcome to Fibio</h1>
          <p className="text-sm text-muted-foreground">Shop smarter, shop wholesale.</p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="pt-4">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register" className="pt-4">
            <RegisterForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LoginForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const status = useSelector((state) => state.customerAuth.status);
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(customerLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    setFormError(null);
    const result = await dispatch(loginCustomer(values));
    if (loginCustomer.fulfilled.match(result)) {
      router.push("/");
    } else {
      setFormError(result.payload || "Unable to log in");
    }
  };

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">Welcome back — log in to continue shopping.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* <ApiErrorSummary message={formError} /> */}

        <Button type="submit" className="w-full" disabled={status === "loading"}>
          {status === "loading" && <Loader2 className="animate-spin" />}
          Log in
        </Button>
        </form>
      </Form>
    </>
  );
}

function RegisterForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const status = useSelector((state) => state.customerAuth.status);
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  const onSubmit = async (values) => {
    setFormError(null);
    const result = await dispatch(registerCustomer(values));
    if (registerCustomer.fulfilled.match(result)) {
      router.push("/");
    } else {
      setFormError(result.payload || "Unable to register");
    }
  };

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">Create an account and start shopping with us.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (optional)</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ApiErrorSummary message={formError} />

        <Button type="submit" className="w-full" disabled={status === "loading"}>
          {status === "loading" && <Loader2 className="animate-spin" />}
          Create account
        </Button>
        </form>
      </Form>
    </>
  );
}