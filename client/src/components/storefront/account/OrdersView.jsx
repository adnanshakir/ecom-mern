"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { getCustomerOrdersRequest } from "@/services/storefront/payments";
import { formatPrice } from "@/lib/formatCurrency";
import { parseApiErrorMessage } from "@/lib/parseApiError";
import { buttonVariants } from "@/components/ui/button";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getExpectedDeliveryDate = (createdAt) => {
  const expectedDate = new Date(createdAt);
  expectedDate.setDate(expectedDate.getDate() + 5);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(expectedDate);
};

export function OrdersView() {
  const router = useRouter();
  const authStatus = useSelector((state) => state.customerAuth.status);
  const authReady = useSelector((state) => state.customerAuth.authReady);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (authReady && authStatus !== "authenticated") {
      router.replace("/sign-in");
    }
  }, [authReady, authStatus, router]);

  useEffect(() => {
    if (!authReady || authStatus !== "authenticated") return;

    let active = true;
    getCustomerOrdersRequest()
      .then(({ data }) => {
        if (active) {
          setOrders(data.data || []);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (active) {
          setStatus("error");
          toast.error(
            parseApiErrorMessage(error.response?.data?.message || error.message)[0] || "Unable to load orders"
          );
        }
      });

    return () => {
      active = false;
    };
  }, [authReady, authStatus]);

  const paidOrders = useMemo(() => orders.filter((order) => order.status === "paid"), [orders]);

  if (!authReady || authStatus === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[#033936]" />
      </div>
    );
  }

  if (authStatus !== "authenticated") return null;
  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[#033936]" />
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-muted/20 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="grid items-center gap-6 bg-[#eef8f5] px-6 py-6 sm:grid-cols-[1fr_180px] sm:px-8">
            <div>
              <p className="text-sm font-medium text-[#033936]">Wholesale delivery, on its way</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Your Orders</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Track your purchases and see when your next delivery is expected.
              </p>
            </div>
            <Image
              src="/delivery-illustration.svg"
              alt="Delivery van carrying your order"
              width={180}
              height={130}
              className="mx-auto w-full max-w-[180px]"
              priority
            />
          </div>
        </div>

        {status === "error" ? (
          <div className="mt-8 rounded-2xl border bg-card p-10 text-center">
            <p className="font-medium">We could not load your orders.</p>
            <p className="mt-2 text-sm text-muted-foreground">Please refresh and try again.</p>
          </div>
        ) : !orders.length ? (
          <div className="mt-8 rounded-2xl border bg-card p-10 text-center">
            <Package className="mx-auto size-10 text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-bold">No orders placed yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Explore the catalog and place your first wholesale order.
            </p>
            <Link href="/" className={buttonVariants({ variant: "default", size: "lg", className: "mt-6" })}>
              <ShoppingBag className="mr-2 size-4" />
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {orders.map((order) => (
              <article key={order._id} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
                    {order.status}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#eef8f5] px-4 py-3 text-sm text-[#033936]">
                  <Package className="size-5 shrink-0" />
                  <span>
                    Expected delivery by <strong>{getExpectedDeliveryDate(order.createdAt)}</strong>
                  </span>
                </div>
                <div className="mt-4 grid gap-2 border-t pt-4 text-sm">
                  {order.items.map((item, index) => (
                    <div
                      key={`${order._id}-${item.variantId || item.sku || index}-${index}`}
                      className="flex justify-between gap-4"
                    >
                      <span className="text-muted-foreground">
                        {item.name} × {item.quantity}
                      </span>
                      <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {!!paidOrders.length && (
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            Payment confirmations are secured by Razorpay <ArrowRight className="size-3" />
          </p>
        )}
      </div>
    </div>
  );
}
