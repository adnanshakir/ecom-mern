"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Products" value={stats.totalProducts} />
        <StatCard label="Categories" value={stats.totalCategories} />
        <StatCard label="Brands" value={stats.totalBrands} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Low stock ({stats.lowStock.count}, threshold {stats.lowStock.threshold})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.lowStock.items?.length ? (
            <ul className="grid gap-2 text-sm">
              {stats.lowStock.items.map((item) => (
                <li key={item._id || item.sku} className="flex justify-between border-b pb-1 last:border-0">
                  <span>{item.sku || item.name}</span>
                  <span className="text-muted-foreground">stock: {item.stock}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No low stock items.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}
