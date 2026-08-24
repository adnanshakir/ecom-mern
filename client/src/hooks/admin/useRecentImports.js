"use client";

import { useState, useEffect, useCallback } from "react";
import { getImportJobs, rollbackImport } from "@/services/admin/csvImport";
import { useConfirm } from "@/hooks/useConfirm";

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

  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  const rollback = (job) => {
    requestConfirm({
      title: "Roll back import?",
      description: `This will remove all products created by import "${job.fileName || job._id}".`,
      confirmLabel: "Roll back",
      destructive: true,
      onConfirm: async () => {
        setRollingBackId(job._id);
        try {
          await rollbackImport(job._id);
          fetchJobs();
        } finally {
          setRollingBackId(null);
        }
      },
    });
  };

  return { jobs, loading, error, rollingBackId, rollback, fetchJobs, confirmState, handleConfirm, handleCancel };
}
