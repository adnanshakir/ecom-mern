"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const quickNameSchema = z.object({ name: z.string().min(1, "Name is required") });

// Generic "+" trigger + small dialog for creating a Category or Brand
// inline, without leaving the product form. createFn must return the
// created entity as { data: { data: {...} } } (matches your axios services).
export function QuickCreateEntityDialog({ label, createFn, onCreated }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(quickNameSchema),
    defaultValues: { name: "" },
  });

  const submit = async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await createFn({ name: values.name, isActive: true });
      onCreated(data.data);
      setOpen(false);
      form.reset();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to create ${label.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="icon" className="size-6" title={`New ${label.toLowerCase()}`}>
            <Plus className="size-3.5" />
          </Button>
        }
      />
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New {label.toLowerCase()}</DialogTitle>
          <DialogDescription>Quickly add a {label.toLowerCase()} without leaving this form.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
