"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  ShoppingBag,
  ArrowRight,
  Truck,
  RotateCcw,
  Headphones,
  Calendar,
  Sparkles,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function OrdersView() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");

  // Empty handler state for now as requested
  const orders = []; 

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-[85vh] bg-muted/20 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Your Orders</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              View, track, and manage your wholesale purchases and invoices.
            </p>
          </div>
          <Link
            href="/track-order"
            className={buttonVariants({ variant: "default", size: "sm", className: "inline-flex items-center justify-center gap-2 shrink-0" })}
          >
            <Truck className="size-4 shrink-0" />
            <span>Track by Order #</span>
          </Link>
        </div>

        {/* Toolbar: Search + Filter + Status Tabs */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders by ID, product name, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </form>

            {/* Time Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                <Calendar className="size-3.5 shrink-0" /> Period:
              </span>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Time</option>
                <option value="30days">Past 30 Days</option>
                <option value="6months">Past 6 Months</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/60 rounded-xl max-w-md">
              <TabsTrigger value="all" className="py-1.5 text-xs font-medium">All</TabsTrigger>
              <TabsTrigger value="processing" className="py-1.5 text-xs font-medium">Processing</TabsTrigger>
              <TabsTrigger value="delivered" className="py-1.5 text-xs font-medium">Delivered</TabsTrigger>
              <TabsTrigger value="cancelled" className="py-1.5 text-xs font-medium">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Empty State Handler */}
        {orders.length === 0 && (
          <div className="mt-8 rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Package className="size-10 shrink-0" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-foreground sm:text-2xl">
              {searchQuery ? "No matching orders found" : "No orders placed yet"}
            </h2>
            
            <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground sm:text-sm leading-relaxed">
              {searchQuery
                ? `We couldn't find any orders matching "${searchQuery}". Try searching with a different keyword or order ID.`
                : "You haven't placed any wholesale orders with Fibio yet. Explore our wholesale catalog to discover quality products at competitive prices."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className={buttonVariants({ variant: "default", size: "lg", className: "inline-flex items-center justify-center gap-2 px-6" })}
              >
                <ShoppingBag className="size-4 shrink-0" />
                <span>Start Shopping</span>
                <ArrowRight className="size-4 shrink-0" />
              </Link>

              <Link
                href="/contact-us"
                className={buttonVariants({ variant: "outline", size: "lg", className: "inline-flex items-center justify-center gap-2 px-6" })}
              >
                <Headphones className="size-4 shrink-0" />
                <span>Contact Sales</span>
              </Link>
            </div>
          </div>
        )}

        {/* Order Perks / Support Footer Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="size-5 shrink-0" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Track Shipments</p>
              <p className="text-[11px] text-muted-foreground">Real-time carrier tracking update on all dispatched items.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RotateCcw className="size-5 shrink-0" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Hassle-Free Returns</p>
              <p className="text-[11px] text-muted-foreground">30-day return policy for eligible wholesale merchandise.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5 shrink-0" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Volume Pricing</p>
              <p className="text-[11px] text-muted-foreground">Automatic tier discounts applied at checkout for bulk quantities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
