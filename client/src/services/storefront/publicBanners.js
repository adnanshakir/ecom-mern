import publicApi from "@/services/publicApi";

export function getPublicBanners() {
  return publicApi.get("/public/banners");
}

