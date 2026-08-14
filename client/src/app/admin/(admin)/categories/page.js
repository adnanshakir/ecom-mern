"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Upload,
  Link as LinkIcon,
  X,
  ImageIcon,
} from "lucide-react";

import { useCategories } from "@/hooks/admin/useCategories";
import { buildChildrenMap } from "@/lib/categoryTree";
import { uploadImages } from "@/services/admin/images";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

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
      const imageUrl = category.image?.url;

      const row = (
        <TableRow
          key={category._id}
          className={hasChildren ? "cursor-pointer" : undefined}
          onClick={hasChildren ? () => toggleExpanded(category._id) : undefined}
        >
          <TableCell>
            <span style={{ paddingLeft: `${depth * 1.25}rem` }} className="inline-flex items-center gap-2">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpanded(category._id);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </button>
              ) : (
                depth > 0 && <span className="inline-block w-3.5" />
              )}

              {/* Category Thumbnail */}
              <div className="relative size-8 shrink-0 overflow-hidden rounded bg-muted border flex items-center justify-center">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={category.name} className="size-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    {category.name?.slice(0, 2) || "CAT"}
                  </span>
                )}
              </div>

              <span className="font-medium">{category.name}</span>
            </span>
          </TableCell>
          <TableCell>
            <span className={category.isActive ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
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
        <DialogContent className="sm:max-w-md w-full ">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update this category's details and thumbnail image."
                : "Add a new category for products to reference."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 w-full " noValidate>
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

              {/* Category Image Field (Upload via ImageKit or Direct URL) */}
              <CategoryImageUploader form={form} />

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

function CategoryImageUploader({ form }) {
  const [mode, setMode] = useState("file"); // "file" or "url"
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const currentImage = form.watch("image");
  const imageUrl = currentImage?.url || "";

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setUploadError(null);
      const { data } = await uploadImages(files);
      if (data.data && data.data.length > 0) {
        const uploaded = data.data[0];
        form.setValue("image", { url: uploaded.url, fileId: uploaded.fileId }, { shouldValidate: true });
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || "Failed to upload image to ImageKit");
    } finally {
      setUploading(false);
    }
  };

  const handleClearImage = () => {
    form.setValue("image", { url: "", fileId: "" }, { shouldValidate: true });
  };

  return (
    <div className="w-full space-y-2 rounded-lg border p-3 bg-muted/20 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Category Image (Optional)
        </label>

        <div className="flex items-center gap-1 bg-background border rounded-md p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
              mode === "file"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="size-3 shrink-0" />
            <span>Upload (ImageKit)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
              mode === "url"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LinkIcon className="size-3 shrink-0" />
            <span>URL</span>
          </button>
        </div>
      </div>

      {/* Image Preview Container */}
      {imageUrl ? (
        <div className="relative flex items-center gap-3 rounded-md border bg-background p-2 w-full overflow-hidden">
          <div className="relative size-14 shrink-0 overflow-hidden rounded border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Category preview" className="size-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-xs font-medium text-foreground truncate break-all">{imageUrl}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Image Ready</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearImage}
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : mode === "file" ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-4 text-center bg-background">
          {uploading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Uploading to ImageKit...
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 w-full">
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Click to upload file</span>
              <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP up to 5MB</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-1 w-full overflow-hidden">
          <Input
            placeholder="https://example.com/category-image.png"
            value={imageUrl}
            onChange={(e) => form.setValue("image", { url: e.target.value, fileId: "" }, { shouldValidate: true })}
            className="text-xs w-full truncate"
          />
          <p className="text-[10px] text-muted-foreground">Paste a direct public image URL.</p>
        </div>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </div>
  );
}
