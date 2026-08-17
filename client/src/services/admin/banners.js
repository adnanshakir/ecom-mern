import api from "@/services/admin/axios";

export function getAdminBanners() {
  return api.get("/banners");
}

export function updateAdminBanner(key, bannerData) {
  return api.put(`/banners/${key}`, bannerData);
}
