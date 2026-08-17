"use client";

import { useSelector } from "react-redux";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useBrands } from "@/hooks/admin/useBrands";
import { ApiErrorSummary } from "@/components/shared/ApiErrorSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const CAN_WRITE_ROLES = ["super_admin", "admin"];

export default function BrandsPage() {
  const role = useSelector((state) => state.auth.user?.role);
  const canWrite = CAN_WRITE_ROLES.includes(role);

  const {
    brands,
    loading,
    error,
    dialogOpen,
    setDialogOpen,
    editingBrand,
    formError,
    submitting,
    form,
    openCreateDialog,
    openEditDialog,
    onSubmit,
    handleDelete,
  } = useBrands();

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Brands</h1>
        {canWrite && (
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            New brand
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading brands...
        </div>
      )}

      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="w-full overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 3 : 2} className="text-muted-foreground">
                    No brands yet.
                  </TableCell>
                </TableRow>
              )}
              {brands.map((brand) => (
                <TableRow key={brand._id}>
                  <TableCell>{brand.name}</TableCell>
                  <TableCell>
                    <span className={brand.isActive ? "text-emerald-500" : "text-muted-foreground"}>
                      {brand.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(brand)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(brand)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit brand" : "New brand"}</DialogTitle>
            <DialogDescription>
              {editingBrand ? "Update this brand's details." : "Add a new brand for products to reference."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Nike" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <ApiErrorSummary message={formError} />

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="animate-spin" />}
                  {editingBrand ? "Save changes" : "Create brand"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
