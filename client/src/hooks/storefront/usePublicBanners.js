"use client";

import { useEffect, useState } from "react";
import { getPublicBanners } from "@/services/storefront/publicBanners";

const FALLBACK_BANNERS = {
  hero: {
    key: "hero",
    title: "TRUSTED BY MILLIONS",
    subtitle: "Discover trending products, limited-time offers, and everyday essentials at unbeatable wholesale prices.",
    image: { url: "/hero-banner.png", fileId: "" },
    href: "/catalog/all",
    ctaText: "Shop Now",
    showGradient: true,
  },
  "secondary-left": {
    key: "secondary-left",
    title: "Jewellery",
    subtitle: "Premium collection for every occasion",
    image: { url: "/secondary-left.png", fileId: "" },
    href: "/catalog/jewellery",
    ctaText: "Explore Now",
    showGradient: true,
  },
  "secondary-right": {
    key: "secondary-right",
    title: "Mobile Accessories",
    subtitle: "Trendy accessories for smart devices",
    image: { url: "/secondary-ryt.png", fileId: "" },
    href: "/catalog/mobile-accessories",
    ctaText: "Explore Now",
    showGradient: true,
  },
  bottom: {
    key: "bottom",
    title: "Buying in Bulk?",
    subtitle: "Get special tier discounts, customized tax invoices, and personalized quotations for large wholesale orders.",
    image: { url: "/bottom-banner.png", fileId: "" },
    href: "/contact-us",
    ctaText: "Request a Quote",
    showGradient: true,
  },
};

export function usePublicBanners() {
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchBanners() {
      try {
        const { data } = await getPublicBanners();
        if (isMounted && data?.data) {
          setBanners((prev) => ({
            ...prev,
            ...data.data,
          }));
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load banners");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBanners();
    return () => {
      isMounted = false;
    };
  }, []);

  return { banners, loading, error };
}
