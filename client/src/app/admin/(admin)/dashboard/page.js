"use client";

import { useEffect, useState } from "react";
import { Package, Tags, BadgeCheck, Loader2 } from "lucide-react";

import api from "@/services/admin/axios";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { LowStockList } from "@/components/admin/dashboard/LowStockList";
import { ActivityLog } from "@/components/admin/dashboard/ActivityLog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ImportJobsList } from "@/components/admin/csv-import/ImportJobsList";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/dashboard/stats")
      .then(({ data }) => {
        if (!cancelled) setStats(data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Failed to load stats");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Products" value={stats.totalProducts} icon={Package} color="blue" />
        <StatCard label="Categories" value={stats.totalCategories} icon={Tags} color="violet" />
        <StatCard label="Brands" value={stats.totalBrands} icon={BadgeCheck} color="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Low stock ({stats.lowStock.count}, threshold {stats.lowStock.threshold})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockList items={stats.lowStock.items} threshold={stats.lowStock.threshold} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityLog items={stats.latestActivity} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent imports</CardTitle>
        </CardHeader>
        <CardContent>
          {/* dashboard is read-only overview — no rollback action here, that
              lives on the CSV Import page */}
          <ImportJobsList jobs={stats.recentImports} showRollback={false} />
        </CardContent>
      </Card>
    </div>
  );
}
