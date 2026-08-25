"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Tags,
  BadgeCheck,
  AlertTriangle,
  RefreshCw,
  History,
} from "lucide-react";

import api from "@/services/admin/axios";
import { useRecentImports } from "@/hooks/admin/useRecentImports";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { LowStockCard } from "@/components/admin/dashboard/LowStockCard";
import { ActivityCard } from "@/components/admin/dashboard/ActivityCard";
import { ImportHistoryModal } from "@/components/admin/csv-import/ImportHistoryModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DashboardSkeleton } from "@/components/admin/dashboard/DashboardSkeleton";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const recentImports = useRecentImports();

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
    <div className="space-y-4 sm:space-y-5 pb-8 w-full max-w-full overflow-hidden">
      {/* Dashboard Header — clean & responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4 w-full">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
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

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryDialogOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium bg-background shadow-xs hover:bg-accent"
          >
            <History className="size-3.5 text-primary" />
            <span>Import History</span>
            {recentImports.jobs?.length > 0 && (
              <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {recentImports.jobs.length}
              </span>
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              fetchStats(true);
              recentImports.fetchJobs();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 h-8 px-2 rounded-md hover:bg-accent/50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            {refreshing ? "Syncing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* KPI Metric Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4 w-full min-w-0">
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

      {/* Main Panels — Low Stock Inventory & Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2 w-full min-w-0">
        <LowStockCard
          items={stats?.lowStock?.items}
          threshold={stats?.lowStock?.threshold}
          count={lowStockCount}
        />
        <ActivityCard
          items={stats?.latestActivity}
        />
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
