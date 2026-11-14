"use client";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { STORE } from "@/lib/storeInfo";

const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n) || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

// ADAPT ONLY THIS FUNCTION to match the real Order schema.
export function normalizeOrder(o) {
  const items = (o.items || o.products || []).map((i) => ({
    name: i.name || i.product?.name || "Item",
    variant: i.variant || i.variantName || "",
    qty: i.quantity ?? i.qty ?? 1,
    price: i.price ?? i.unitPrice ?? 0,
  }));
  const a = o.shippingAddress || o.address || {};
  return {
    orderNumber: String(o.orderNumber || o._id),
    createdAt: o.createdAt,
    customerName: a.fullName || a.name || o.customer?.name || "",
    phone: a.phone || o.customer?.phone || "",
    email: o.customer?.email || "",
    addressLines: [
      a.line1 || a.address || a.street,
      a.line2,
      [a.city, a.state, a.pincode || a.postalCode].filter(Boolean).join(", "),
    ].filter(Boolean),
    items,
    subtotal: o.subtotal ?? items.reduce((s, i) => s + i.price * i.qty, 0),
    shipping: o.shippingCharge ?? o.shipping ?? 0,
    tax: o.tax ?? 0,
    discount: o.discount ?? 0,
    total: o.total ?? o.totalAmount ?? 0,
    paymentMethod: o.payment?.method || "Razorpay",
    paymentStatus: o.payment?.status || "paid",
    paymentId: o.payment?.razorpayPaymentId || "",
  };
}

export default function InvoiceTemplate({ order: raw }) {
  const o = normalizeOrder(raw);
  const totalQty = o.items.reduce((s, i) => s + i.qty, 0);
  const isCod = /cod|cash/i.test(o.paymentMethod) && o.paymentStatus !== "paid";

  return (
    <div id="invoice-print" className="mx-auto w-full max-w-[800px] bg-white p-6 text-sm text-black">
      {/* ================= SHIPPING LABEL ================= */}
      <div className="border-2 border-black">
        <div className="flex border-b-2 border-black">
          {/* TO */}
          <div className="flex-1 p-4">
            <p className="text-xs font-bold uppercase tracking-widest">Ship To</p>
            <p className="mt-1 text-xl font-extrabold leading-tight">{o.customerName}</p>
            {o.addressLines.map((l, i) => (
              <p key={i} className="text-base leading-snug">{l}</p>
            ))}
            <p className="mt-2 text-base font-bold">Ph: {o.phone}</p>
          </div>
          {/* QR */}
          <div className="flex shrink-0 flex-col items-center justify-center border-l-2 border-black p-3">
            <QRCodeSVG value={o.orderNumber} size={104} level="M" />
            <p className="mt-1 text-[10px] font-semibold">Scan for order</p>
          </div>
        </div>

        {/* BARCODE */}
        <div className="flex justify-center border-b-2 border-black py-2">
          <Barcode
            value={o.orderNumber}
            format="CODE128"
            width={1.8}
            height={56}
            fontSize={14}
            margin={0}
            background="#ffffff"
          />
        </div>

        {/* META STRIP */}
        <div className="grid grid-cols-3 text-center">
          <div className="border-r-2 border-black p-2">
            <p className="text-[10px] font-bold uppercase">Order Date</p>
            <p className="text-xs font-semibold">{fmtDate(o.createdAt)}</p>
          </div>
          <div className="border-r-2 border-black p-2">
            <p className="text-[10px] font-bold uppercase">Items</p>
            <p className="text-xs font-semibold">{totalQty} pcs</p>
          </div>
          <div className="p-2">
            <p className="text-[10px] font-bold uppercase">Payment</p>
            <p className="text-base font-extrabold">
              {isCod ? `COD ${money(o.total)}` : "PREPAID"}
            </p>
          </div>
        </div>

        {/* FROM */}
        <div className="border-t-2 border-black p-2 text-xs">
          <span className="font-bold uppercase">From: </span>
          {STORE.name}, {STORE.addressLines.join(", ")} | {STORE.phone}
        </div>
      </div>

      {/* CUT LINE */}
      <div className="my-5 border-t-2 border-dashed border-gray-500 text-center">
        <span className="relative -top-3 bg-white px-2 text-xs text-gray-600">✂ cut here</span>
      </div>

      {/* ================= INVOICE ================= */}
      <div className="flex items-start justify-between border-b pb-3">
        <div>
          {STORE.logoUrl && <img src={STORE.logoUrl} alt="" className="mb-1 h-10" />}
          <h1 className="text-xl font-bold">{STORE.name}</h1>
          {STORE.addressLines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <p>{STORE.phone} | {STORE.email}</p>
          {STORE.gstin && <p>GSTIN: {STORE.gstin}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold">INVOICE</h2>
          <p>Order #: <b>{o.orderNumber}</b></p>
          <p>Date: {fmtDate(o.createdAt)}</p>
          <p>Payment: {o.paymentMethod} ({o.paymentStatus})</p>
          {o.paymentId && <p className="text-xs">Txn: {o.paymentId}</p>}
        </div>
      </div>

      <div className="py-3">
        <p className="text-xs font-semibold uppercase text-gray-600">Bill To</p>
        <p className="font-medium">{o.customerName}</p>
        {o.email && <p>{o.email}</p>}
        <p>{o.phone}</p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y-2 border-black text-left">
            <th className="p-2">#</th>
            <th className="p-2">Item</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((it, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{i + 1}</td>
              <td className="p-2">
                <p className="font-medium">{it.name}</p>
                {it.variant && <p className="text-xs text-gray-600">{it.variant}</p>}
              </td>
              <td className="p-2 text-right">{it.qty}</td>
              <td className="p-2 text-right">{money(it.price)}</td>
              <td className="p-2 text-right">{money(it.price * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-4 w-64 space-y-1">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
        {o.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{money(o.discount)}</span></div>}
        <div className="flex justify-between"><span>Shipping</span><span>{money(o.shipping)}</span></div>
        {o.tax > 0 && <div className="flex justify-between"><span>Tax</span><span>{money(o.tax)}</span></div>}
        <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold">
          <span>Total</span><span>{money(o.total)}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-600">{STORE.footerNote}</p>
    </div>
  );
}