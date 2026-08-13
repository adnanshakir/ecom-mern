"use client";

import { useState, useEffect, useCallback } from "react";
import { getImportJobs, rollbackImport } from "@/services/admin/csvImport";

export function useRecentImports() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rollingBackId, setRollingBackId] = useState(null);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    getImportJobs({ limit: 10 })
      .then(({ data }) => setJobs(data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load imports"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const rollback = async (job) => {
    setRollingBackId(job._id);
    try {
      await rollbackImport(job._id);
      fetchJobs(); // status now comes back as "rolled_back" from the server
    } catch (err) {
      alert(err.response?.data?.message || "Failed to roll back import");
    } finally {
      setRollingBackId(null);
    }
  };

  return { jobs, loading, error, rollingBackId, rollback, fetchJobs };
}
