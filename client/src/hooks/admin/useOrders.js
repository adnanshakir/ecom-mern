"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAdminOrder,
  getAdminOrderStats,
  getAdminOrders,
  markAdminOrderSeen,
  updateAdminOrderStatus,
} from "@/services/adminOrderService";

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ newCount: 0, todayCount: 0, todayRevenue: 0, pendingCount: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ search: "", status: "", paymentStatus: "", page: 1, limit: 10 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
      const [ordersResponse, statsResponse] = await Promise.all([getAdminOrders(params), getAdminOrderStats()]);
      setOrders(ordersResponse.data.data);
      setPagination(ordersResponse.data.pagination);
      setStats(statsResponse.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = setInterval(poll, 30000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [refresh]);

  const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value, page: name === "page" ? value : 1 }));

  const openOrder = async (id) => {
    setSheetOpen(true);
    try {
      const order = await getAdminOrder(id);
      setSelectedOrder(order);
      if (orders.find((item) => item._id === id && !item.adminSeen)) {
        await markAdminOrderSeen(id);
        setOrders((current) => current.map((item) => item._id === id ? { ...item, adminSeen: true } : item));
        setStats((current) => ({ ...current, newCount: Math.max(0, current.newCount - 1) }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load order");
    }
  };

  const changeStatus = async (status) => {
    if (!selectedOrder) return;
    try {
      const { data } = await updateAdminOrderStatus(selectedOrder._id, status);
      setSelectedOrder((current) => ({ ...current, orderStatus: data.data.orderStatus }));
      setOrders((current) => current.map((item) => item._id === selectedOrder._id ? { ...item, orderStatus: status } : item));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update order status");
    }
  };

  return {
    orders, stats, pagination, filters, selectedOrder, sheetOpen, loading, error,
    setSheetOpen, setFilter, refresh, openOrder, changeStatus,
  };
}
