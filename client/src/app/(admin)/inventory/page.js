"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, Plus, Search } from "lucide-react";

import { getVariants } from "@/services/variants";
import { useProductPicker } from "@/hooks/useProductPicker";
import { useInventoryMovements } from "@/hooks/useInventoryMovements";
import { movementTypes } from "@/schemas/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const CAN_WRITE_ROLES = ["super_admin", "admin"];
const CAN_RECONCILE_ROLES = ["super_admin", "admin"];

export default function InventoryPage() {
  const role = useSelector((state) => state.auth.user?.role);
  const canWrite = CAN_WRITE_ROLES.includes(role);
  const canReconcile = CAN_RECONCILE_ROLES.includes(role);

  const { products, pagination, loading, search, setSearch, page, setPage } =
    useProductPicker();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedVariantId("");
    setVariantsLoading(true);
    getVariants(product._id)
      .then(({ data }) => setVariants(data.data))
      .finally(() => setVariantsLoading(false));
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Inventory</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Select a product</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading products...
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No products found.
                      </TableCell>
                    </TableRow>
                  )}
                  {products.map((p) => (
                    <TableRow
                      key={p._id}
                      onClick={() => selectProduct(p)}
                      className={
                        "cursor-pointer" +
                        (selectedProduct?._id === p._id ? " bg-accent" : "")
                      }
                    >
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {p.status}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Page {pagination.page} of {pagination.pages || 1} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (pagination.pages || 1)}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Variant — {selectedProduct.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {variantsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading variants...
              </div>
            ) : (
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select variant">
                    {variants.find((v) => v._id === selectedVariantId)?.sku}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.sku} — stock: {v.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {selectedVariantId && (
        <VariantMovements
          variantId={selectedVariantId}
          canWrite={canWrite}
          canReconcile={canReconcile}
        />
      )}
    </div>
  );
}

function VariantMovements({ variantId, canWrite, canReconcile }) {
  const {
    movements,
    loading,
    error,
    dialogOpen,
    setDialogOpen,
    form,
    formError,
    submitting,
    openCreateDialog,
    submit,
    reconcileResult,
    reconciling,
    reconcile,
  } = useInventoryMovements(variantId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Movement history</CardTitle>
        <div className="flex gap-2">
          {canReconcile && (
            <Button variant="outline" size="sm" onClick={reconcile} disabled={reconciling}>
              {reconciling && <Loader2 className="size-4 animate-spin" />}
              Reconcile
            </Button>
          )}
          {canWrite && (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Record movement
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {reconcileResult && (
          <p className="text-sm">Ledger-computed stock: {reconcileResult.computedStock}</p>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading history...
          </div>
        )}

        {!loading && error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No movements recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {movements.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="capitalize">{m.type}</TableCell>
                  <TableCell>{m.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{m.reason || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record movement</DialogTitle>
            <DialogDescription>
              Correction takes a signed delta (e.g. -3 to reduce stock). All other types must
              be a positive quantity.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="grid gap-4" noValidate>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {movementTypes.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t}
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
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
                  Record
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}