"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Tags,
  BadgeCheck,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  Activity,
  Layers,
  FileUp,
} from "lucide-react";

import api from "@/services/admin/axios";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { LowStockList } from "@/components/admin/dashboard/LowStockList";
import { ActivityLog } from "@/components/admin/dashboard/ActivityLog";
import { ImportJobsList } from "@/components/admin/csv-import/ImportJobsList";
import { DashboardSkeleton } from "@/components/admin/dashboard/DashboardSkeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const { data } = await api.get("/dashboard/stats");
      setStats(data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 rounded-xl border border-destructive/20 bg-destructive/5 p-8">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Dashboard Failed to Load</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => fetchStats(true)} variant="outline" size="sm">
          <RefreshCw className="mr-2 size-4" /> Try Again
        </Button>
      </div>
    );
  }

  const lowStockCount = stats?.lowStock?.count || 0;

  return (
    <div className="space-y-5 pb-8">
      {/* Dashboard Header — clean & minimal */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Catalog metrics, inventory alerts, and activity overview.
          </p>
        </div>

        {/* Subtle refresh action — no big buttons */}
        <button
          type="button"
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          {refreshing ? "Syncing…" : "Refresh data"}
        </button>
      </div>

      {/* KPI Metric Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Products"
          value={stats?.totalProducts}
          icon={Package}
          color="blue"
          subtitle="Active catalog"
        />
        <StatCard
          label="Categories"
          value={stats?.totalCategories}
          icon={Tags}
          color="violet"
          subtitle="Taxonomy groups"
        />
        <StatCard
          label="Brands"
          value={stats?.totalBrands}
          icon={BadgeCheck}
          color="emerald"
          subtitle="Brand partners"
        />
        <StatCard
          label="Low Stock"
          value={lowStockCount}
          icon={AlertTriangle}
          color={lowStockCount > 0 ? "rose" : "amber"}
          alertCount={lowStockCount}
          subtitle={`Threshold: < ${stats?.lowStock?.threshold ?? 5} units`}
        />
      </div>

      {/* Main Panels — stack on mobile, side-by-side on lg */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Low Stock Inventory */}
        <Card className="flex flex-col border-border/80 shadow-xs min-h-[360px] max-h-[520px]">
          <CardHeader className="shrink-0 border-b px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Low Stock Inventory</span>
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Below {stats?.lowStock?.threshold} units
                </CardDescription>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  lowStockCount > 0
                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-500"
                }`}
              >
                {lowStockCount}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden p-4">
            <LowStockList items={stats?.lowStock?.items} threshold={stats?.lowStock?.threshold} />
          </CardContent>
          <CardFooter className="shrink-0 border-t py-2 px-4">
            <Link
              href="/admin/products"
              className="text-[11px] font-medium text-muted-foreground hover:text-primary flex items-center gap-1 ml-auto transition-colors"
            >
              All products <ArrowUpRight className="size-3" />
            </Link>
          </CardFooter>
        </Card>

        {/* System Activity Stream */}
        <Card className="flex flex-col border-border/80 shadow-xs min-h-[360px] max-h-[520px]">
          <CardHeader className="shrink-0 border-b px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="size-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Recent Activity</span>
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Audit log &amp; user operations
                </CardDescription>
              </div>
              <span className="shrink-0 rounded-full bg-blue-500/10 text-blue-500 text-[11px] font-bold px-2 py-0.5 border border-blue-500/20">
                Latest 10
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden p-4">
            <ActivityLog items={stats?.latestActivity} />
          </CardContent>
          <CardFooter className="shrink-0 border-t py-2 px-4">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Layers className="size-3" /> Auto-recorded operations
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* Recent Imports — full width, no quick actions box */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="border-b px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileUp className="size-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Recent CSV Imports</span>
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Recent batch upload jobs overview
              </CardDescription>
            </div>
            <Link
              href="/admin/csv-import"
              className="text-[11px] font-medium text-muted-foreground hover:text-primary flex items-center gap-1 shrink-0 transition-colors"
            >
              Import Center <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ImportJobsList jobs={stats?.recentImports} showRollback={false} />
        </CardContent>
      </Card>
    </div>
  );
}
