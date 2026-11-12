"use client";

import { Eye, Loader2, Printer } from "lucide-react";
import { useOrders } from "@/hooks/admin/useOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const statuses = ["placed", "packed", "shipped", "delivered", "cancelled"];

function StatusBadge({ children }) {
  return <Badge variant={children === "cancelled" ? "destructive" : children === "delivered" ? "default" : "secondary"} className="capitalize">{children}</Badge>;
}

export default function OrdersPage() {
  const { orders, stats, pagination, filters, selectedOrder, orderLoading, sheetOpen, loading, error, setSheetOpen, setFilter, openOrder, changeStatus } = useOrders();
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold">Orders</h1><p className="text-sm text-muted-foreground">{stats.newCount} new · {stats.pendingCount} pending</p></div></div>
      <Card><CardContent className="flex flex-wrap gap-2 p-4">
        <Input className="w-full max-w-sm" placeholder="Search order, customer, phone..." value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
        <OrderSelect value={filters.status} placeholder="All statuses" options={statuses} onChange={(value) => setFilter("status", value)} />
        <OrderSelect value={filters.paymentStatus} placeholder="All payments" options={["paid", "pending", "failed", "refund_pending", "refunded"]} onChange={(value) => setFilter("paymentStatus", value)} />
      </CardContent></Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="w-full overflow-x-auto rounded-lg border bg-card">
        <Table><TableHeader><TableRow><TableHead>Order #</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={8}><Loader2 className="size-4 animate-spin" /></TableCell></TableRow> : orders.length === 0 ? <TableRow><TableCell colSpan={8} className="text-muted-foreground">No orders found.</TableCell></TableRow> : orders.map((order) => {
            const first = order.items?.[0];
            return <TableRow key={order._id}><TableCell className="font-medium">{order.orderNumber}{!order.adminSeen && <Badge className="ml-2 bg-emerald-500 text-white">New</Badge>}</TableCell><TableCell><div>{order.customer?.name || "Customer"}</div><div className="text-xs text-muted-foreground">{order.customer?.phone || order.customer?.email}</div></TableCell><TableCell><div className="flex items-center gap-2">{first?.image && <img src={first.image} alt="" className="size-8 rounded object-cover" />}<span>{first?.name || "-"}{order.items?.length > 1 && ` +${order.items.length - 1} more`}</span></div></TableCell><TableCell>{money(order.total)}</TableCell><TableCell><Badge variant="outline" className="capitalize">{order.payment?.status}</Badge></TableCell><TableCell><StatusBadge>{order.orderStatus}</StatusBadge></TableCell><TableCell>{new Date(order.createdAt).toLocaleDateString("en-IN")}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title="View" onClick={() => openOrder(order._id)}><Eye className="size-4" /></Button><Button variant="ghost" size="icon" title="Print invoice" onClick={() => window.open(`/admin/orders/${order._id}/invoice`, "_blank", "noopener,noreferrer")}><Printer className="size-4" /></Button></div></TableCell></TableRow>;
          })}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Page {pagination.page} of {pagination.pages || 1} ({pagination.total})</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setFilter("page", pagination.page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => setFilter("page", pagination.page + 1)}>Next</Button></div></div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{orderLoading ? "Loading order..." : selectedOrder?.orderNumber || "Order details"}</SheetTitle></SheetHeader>{orderLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : selectedOrder && <OrderDetails order={selectedOrder} onStatusChange={changeStatus} />}</SheetContent></Sheet>
    </div>
  );
}

function OrderSelect({ value, placeholder, options, onChange }) {
  return <Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}><SelectTrigger className="w-44"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value="all">{placeholder}</SelectItem>{options.map((option) => <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem>)}</SelectContent></Select>;
}

function OrderDetails({ order, onStatusChange }) {
  const address = order.shippingAddress || {};
  return <div className="grid gap-5 px-4 pb-6"><section><h3 className="font-semibold">Customer</h3><p>{order.customer?.name || address.fullName}</p><p className="text-sm text-muted-foreground">{order.customer?.email} {order.customer?.phone && `· ${order.customer.phone}`}</p></section><section><h3 className="font-semibold">Shipping address</h3><p>{address.line1}{address.line2 && `, ${address.line2}`}</p><p>{[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}</p><p>{address.phone}</p></section><section className="grid gap-3"><h3 className="font-semibold">Items</h3>{order.items?.map((item, index) => <div key={index} className="flex items-center gap-3 border-b pb-2"><img src={item.image || "/delivery-illustration.svg"} alt="" className="size-12 rounded object-cover" /><div className="flex-1"><p>{item.name}</p><p className="text-xs text-muted-foreground">Qty {item.quantity} · {money(item.unitPrice)}</p></div><p>{money(item.unitPrice * item.quantity)}</p></div>)}</section><section><h3 className="font-semibold">Payment</h3><p className="capitalize">{order.payment?.method} · {order.payment?.status}</p><p className="break-all text-xs text-muted-foreground">Razorpay: {order.payment?.razorpayPaymentId || "-"}</p></section><section className="grid gap-1 border-t pt-3"><p className="flex justify-between">Subtotal <span>{money(order.subtotal)}</span></p><p className="flex justify-between">Shipping <span>{money(order.shipping)}</span></p><p className="flex justify-between font-semibold">Total <span>{money(order.total)}</span></p></section><OrderSelect value={order.orderStatus} placeholder="Update status" options={statuses} onChange={onStatusChange} /></div>;
}
