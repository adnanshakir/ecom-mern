import api from "@/services/admin/axios";

export const previewImport = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/products/import/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const confirmImport = (fileName, products) => api.post("/products/import/confirm", { fileName, products });

export const rollbackImport = (importJobId) => api.post(`/products/import/${importJobId}/rollback`);

export const getImportJobs = (params) => api.get("/products/import", { params });

export const getImportJob = (id) => api.get(`/products/import/${id}`);
