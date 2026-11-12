"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import InvoiceTemplate from "@/components/admin/orders/InvoiceTemplate";
import { getAdminOrder } from "@/services/adminOrderService";

export default function InvoicePage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminOrder(id).then(setOrder).catch(() => setError("Could not load order"));
  }, [id]);

  useEffect(() => {
    if (!order) return;
    const images = Array.from(document.querySelectorAll("#invoice-print img"));
    Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.onload = image.onerror = resolve; }))).then(() => setTimeout(() => window.print(), 300));
  }, [order]);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!order) return <p className="p-6">Loading invoice...</p>;
  return <div className="bg-gray-100 p-4 print:bg-white print:p-0"><div className="mx-auto mb-4 flex max-w-[800px] justify-end print:hidden"><button onClick={() => window.print()} className="rounded bg-black px-4 py-2 text-white">Print</button></div><InvoiceTemplate order={order} /></div>;
}
