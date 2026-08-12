import api from "@/services/admin/axios";

export const uploadImages = (files) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("image", file));
  return api.post("/images/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};