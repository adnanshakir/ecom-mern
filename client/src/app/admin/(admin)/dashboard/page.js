"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  History,
  IndianRupee,
  LayoutGrid,
  Package,
  Printer,
  RefreshCw,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";

import { useDashboard } from "@/hooks/admin/useDashboard";
import KpiCard from "@/components/admin/dashboard/KpiCard";
import SectionCard from "@/components/admin/dashboard/SectionCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LowStockCard } from "@/components/admin/dashboard/LowStockCard";
import { ActivityCard } from "@/components/admin/dashboard/ActivityCard";
import { DashboardSkeleton } from "@/components/admin/dashboard/DashboardSkeleton";
import { ImportHistoryModal } from "@/components/admin/csv-import/ImportHistoryModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatCurrency";
import { timeAgo } from "@/lib/time";

function truncateMiddle(str, maxLength = 16) {
  if (!str || str.length <= maxLength) return str || "";
  const half = Math.floor((maxLength - 1) / 2);
  return `${str.slice(0, half)}…${str.slice(-half)}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    stats,
    orderStats,
    recentOrders,
    recentImports,
    loading,
    refreshing,
    error,
    historyDialogOpen,
    setHistoryDialogOpen,
    refresh,
  } = useDashboard();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="surface flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <TriangleAlert className="h-6 w-6 text-muted-foreground mb-2" strokeWidth={1.75} />
        <h2 className="text-sm font-medium text-foreground">Dashboard Failed to Load</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
        <Button
          onClick={() => refresh(true)}
          variant="ghost"
          size="sm"
          className="mt-4 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Try Again</span>
        </Button>
      </div>
    );
  }

  const latestOrders = (recentOrders || []).slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 w-full max-w-full overflow-hidden">
      {/* 1. Header: title "Dashboard" (small green dot + no "Live" pill), right side: "Import History" ghost button + Refresh icon button */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <span className="size-2 rounded-full bg-emerald-500 inline-block" />
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryDialogOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <History className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Import History</span>
            {recentImports.jobs?.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {recentImports.jobs.length}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refresh(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={1.75}
            />
          </Button>
        </div>
      </div>

      {/* 2. KPI row: 4 KpiCards (grid-cols-2 on mobile, 4 on lg) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          icon={ShoppingBag}
          label="New orders"
          value={orderStats?.newCount ?? 0}
          hint="Awaiting review"
          href="/admin/orders"
        />
        <KpiCard
          icon={IndianRupee}
          label="Today's revenue"
          value={formatCurrency(orderStats?.todayRevenue ?? 0)}
          hint={`${orderStats?.todayCount ?? 0} orders today`}
          href="/admin/orders"
        />
        <KpiCard
          icon={Package}
          label="To ship"
          value={orderStats?.pendingCount ?? 0}
          hint="Placed, not shipped yet"
          href="/admin/orders"
        />
        <KpiCard
          icon={LayoutGrid}
          label="Catalog"
          value={stats?.totalProducts ?? 0}
          hint={`${stats?.totalCategories ?? 0} categories · ${stats?.totalBrands ?? 0} brands`}
          href="/admin/products"
        />
      </div>

      {/* 3. Recent orders (full width, SectionCard icon ShoppingBag, action "View all") */}
      <SectionCard
        title="Recent orders"
        icon={ShoppingBag}
        action={
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        }
      >
        {latestOrders.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            <span>No orders yet</span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-normal py-2 px-3">Order</th>
                  <th className="text-left font-normal py-2 px-3 hidden sm:table-cell">Customer</th>
                  <th className="text-right font-normal py-2 px-3">Total</th>
                  <th className="text-left font-normal py-2 px-3">Status</th>
                  <th className="text-left font-normal py-2 px-3 hidden sm:table-cell">Time</th>
                  <th className="py-2 px-2 text-right w-10">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {latestOrders.map((order) => (
                  <tr
                    key={order._id}
                    onClick={() => router.push("/admin/orders")}
                    className="cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/5 rounded-lg"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <span>{truncateMiddle(order.orderNumber)}</span>
                        {order.adminSeen === false && (
                          <span
                            className="size-1.5 rounded-full bg-blue-500 shrink-0"
                            title="New"
                          />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {order.customer?.phoneNumber ||
                          order.customer?.phone ||
                          order.shippingAddress?.phone ||
                          "—"}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 hidden sm:table-cell">
                      <span className="truncate text-foreground block max-w-[140px] md:max-w-[200px]">
                        {order.customer?.name ||
                          order.shippingAddress?.fullName ||
                          "Customer"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium text-foreground">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={order.orderStatus} />
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                      {timeAgo(order.createdAt)}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Print invoice"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `/admin/orders/${order._id}/invoice`,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
                      >
                        <Printer className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 4. Below, two cards side by side on lg (stacked on mobile) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LowStockCard
          items={stats?.lowStock?.items}
          count={stats?.lowStock?.count}
        />
        <ActivityCard items={stats?.latestActivity} />
      </div>

      {/* Import History Modal Dialog */}
      <ImportHistoryModal
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        loading={recentImports.loading}
        error={recentImports.error}
        jobs={recentImports.jobs}
        rollingBackId={recentImports.rollingBackId}
        onRollback={recentImports.rollback}
      />

      {/* Rollback Confirmation Dialog */}
      <ConfirmDialog
        {...recentImports.confirmState}
        onConfirm={recentImports.handleConfirm}
        onCancel={recentImports.handleCancel}
      />
    </div>
  );
}
