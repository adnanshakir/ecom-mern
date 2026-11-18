"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/services/admin/axios";
import { getAdminOrders, getAdminOrderStats } from "@/services/adminOrderService";
import { useRecentImports } from "@/hooks/admin/useRecentImports";

export function useDashboard() {
  const [stats, setStats] = useState(null);
  const [orderStats, setOrderStats] = useState({
    newCount: 0,
    todayCount: 0,
    todayRevenue: 0,
    pendingCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const recentImports = useRecentImports();

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [dashRes, ordersRes, orderStatsRes] = await Promise.all([
        api.get("/dashboard/stats"),
        getAdminOrders({ limit: 5 }),
        getAdminOrderStats(),
      ]);
      setStats(dashRes.data?.data || null);
      setRecentOrders(ordersRes.data?.data || []);
      setOrderStats(
        orderStatsRes.data?.data || {
          newCount: 0,
          todayCount: 0,
          todayRevenue: 0,
          pendingCount: 0,
        }
      );
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchDashboardData(false), 0);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  // Polling: auto-refresh every 60 seconds only while the tab is visible
  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData(false);
      }
    };
    const interval = setInterval(poll, 60000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [fetchDashboardData]);

  const refresh = useCallback(
    async (isManual = false) => {
      await fetchDashboardData(isManual);
      if (recentImports.fetchJobs) {
        recentImports.fetchJobs();
      }
    },
    [fetchDashboardData, recentImports]
  );

  return {
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
  };
}
