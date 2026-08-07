"use client";

import { useSelector } from "react-redux";
import { Loader2, Pencil, Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";

import { useCategories } from "@/hooks/useCategories";
import { buildChildrenMap } from "@/lib/categoryTree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const CAN_WRITE_ROLES = ["super_admin", "admin"];

export default function CategoriesPage() {
  const role = useSelector((state) => state.auth.user?.role);
  const canWrite = CAN_WRITE_ROLES.includes(role);

  const {
    categories,
    loading,
    error,
    isExpanded,
    toggleExpanded,
    dialogOpen,
    setDialogOpen,
    editingCategory,
    form,
    formError,
    submitting,
    openCreateDialog,
    openEditDialog,
    submit,
    remove,
    parentOptions, // now computed in useCategories per your update
  } = useCategories();

  const childrenMap = buildChildrenMap(categories);
  const roots = childrenMap.get(null) || [];

  const renderRows = (nodes, depth) =>
    nodes.flatMap((category) => {
      const children = childrenMap.get(category._id) || [];
      const hasChildren = children.length > 0;
      const expanded = isExpanded(category._id);

      const row = (
        <TableRow
          key={category._id}
          className={hasChildren ? "cursor-pointer" : undefined}
          onClick={hasChildren ? () => toggleExpanded(category._id) : undefined}
        >
          <TableCell>
            <span
              style={{ paddingLeft: `${depth * 1.25}rem` }}
              className="inline-flex items-center gap-1.5"
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpanded(category._id);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {expanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>
              ) : (
                depth > 0 && <span className="inline-block w-3.5" />
              )}
              {category.name}
            </span>
          </TableCell>
          <TableCell>
            <span className={category.isActive ? "text-emerald-500" : "text-muted-foreground"}>
              {category.isActive ? "Active" : "Inactive"}
            </span>
          </TableCell>
          {canWrite && (
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation();
                  openEditDialog(category);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation();
                  remove(category);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          )}
        </TableRow>
      );

      return hasChildren && expanded ? [row, ...renderRows(children, depth + 1)] : [row];
    });

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        {canWrite && (
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            New category
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading categories...
        </div>
      )}

      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              {canWrite && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 3 : 2} className="text-muted-foreground">
                  No categories yet.
                </TableCell>
              </TableRow>
            )}
            {renderRows(roots, 0)}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update this category's details."
                : "Add a new category for products to reference."}
            </DialogDescription>
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
                      <Input placeholder="Footwear" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent category (optional)</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None (top-level)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (top-level)</SelectItem>
                        {parentOptions.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {"—".repeat(c.depth)}
                            {c.depth > 0 ? " " : ""}
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="animate-spin" />}
                  {editingCategory ? "Save changes" : "Create category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
