"use client";

import { STORE } from "@/lib/storeInfo";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const fmtDate = (date) => date ? new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

export function normalizeOrder(order) {
  const items = (order.items || []).map((item) => ({
    name: item.name || "Item",
    variant: item.variant || "",
    image: item.image || "",
    qty: item.quantity ?? item.qty ?? 1,
    price: item.unitPrice ?? item.price ?? 0,
  }));
  const address = order.shippingAddress || {};
  return {
    ...order,
    orderNumber: order.orderNumber || order._id,
    customerName: address.fullName || order.customer?.name || "",
    phone: address.phone || order.customer?.phone || "",
    email: order.customer?.email || "",
    addressLines: [address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(", ")].filter(Boolean),
    items,
    shipping: order.shipping ?? order.shippingCharge ?? 0,
    paymentMethod: order.payment?.method || "Razorpay",
    paymentStatus: order.payment?.status || "paid",
    paymentId: order.payment?.razorpayPaymentId || "",
  };
}

export default function InvoiceTemplate({ order: raw }) {
  const order = normalizeOrder(raw);
  return (
    <div id="invoice-print" className="mx-auto w-full max-w-[800px] bg-white p-8 text-sm text-black">
      <div className="mb-6 border-2 border-dashed border-black p-4">
        <p className="text-xs font-semibold uppercase tracking-wide">Ship To</p>
        <p className="text-lg font-bold">{order.customerName}</p>
        {order.addressLines.map((line, index) => <p key={index}>{line}</p>)}
        <p className="mt-1 font-semibold">Phone: {order.phone}</p>
        <p className="mt-2 text-xs">Order: {order.orderNumber}</p>
      </div>
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          {STORE.logoUrl && <img src={STORE.logoUrl} alt="" className="mb-2 h-10" />}
          <h1 className="text-2xl font-bold">{STORE.name}</h1>
          {STORE.addressLines.map((line, index) => <p key={index}>{line}</p>)}
          <p>{STORE.phone} | {STORE.email}</p>
          {STORE.gstin && <p>GSTIN: {STORE.gstin}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold">INVOICE</h2>
          <p>Order #: <b>{order.orderNumber}</b></p>
          <p>Date: {fmtDate(order.createdAt)}</p>
          <p>Payment: {order.paymentMethod} ({order.paymentStatus})</p>
          {order.paymentId && <p className="text-xs">Txn: {order.paymentId}</p>}
        </div>
      </div>
      <div className="py-4">
        <p className="text-xs font-semibold uppercase text-gray-600">Bill To</p>
        <p className="font-medium">{order.customerName}</p>
        {order.email && <p>{order.email}</p>}
        <p>{order.phone}</p>
      </div>
      <table className="w-full border-collapse">
        <thead><tr className="border-y bg-gray-100 text-left"><th className="p-2">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Amount</th></tr></thead>
        <tbody>{order.items.map((item, index) => <tr key={index} className="border-b"><td className="p-2"><div className="flex items-center gap-3">{item.image && <img src={item.image} alt="" className="h-12 w-12 rounded border object-cover" />}<div><p className="font-medium">{item.name}</p>{item.variant && <p className="text-xs text-gray-600">{item.variant}</p>}</div></div></td><td className="p-2 text-right">{item.qty}</td><td className="p-2 text-right">{money(item.price)}</td><td className="p-2 text-right">{money(item.price * item.qty)}</td></tr>)}</tbody>
      </table>
      <div className="ml-auto mt-4 w-64 space-y-1">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{money(order.discount)}</span></div>}
        <div className="flex justify-between"><span>Shipping</span><span>{money(order.shipping)}</span></div>
        {order.tax > 0 && <div className="flex justify-between"><span>Tax</span><span>{money(order.tax)}</span></div>}
        <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{money(order.total)}</span></div>
      </div>
      <p className="mt-8 text-center text-xs text-gray-600">{STORE.footerNote}</p>
    </div>
  );
}
