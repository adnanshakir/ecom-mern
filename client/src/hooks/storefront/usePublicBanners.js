"use client";

import { useEffect, useState } from "react";
import { getPublicBanners } from "@/services/storefront/publicBanners";

const FALLBACK_BANNERS = {
  hero: {
    key: "hero",
    slides: [
      {
        image: { url: "/banner-1.webp", fileId: "" },
        href: "/category/all",
        order: 1,
        isActive: true,
      },
      {
        image: { url: "/banner-2.webp", fileId: "" },
        href: "/category/all",
        order: 2,
        isActive: true,
      },
      {
        image: { url: "/banner-3.webp", fileId: "" },
        href: "/category/all",
        order: 3,
        isActive: true,
      },
    ],
  },
  budget: {
    key: "budget",
    slides: [
      {
        image: { url: "/99.WEBP", fileId: "" },
        href: "/category/all?maxPrice=99",
        order: 1,
        isActive: true,
      },
      {
        image: { url: "/149.WEBP", fileId: "" },
        href: "/category/all?maxPrice=149",
        order: 2,
        isActive: true,
      },
      {
        image: { url: "/199.WEBP", fileId: "" },
        href: "/category/all?maxPrice=199",
        order: 3,
        isActive: true,
      },
      {
        image: { url: "/499.WEBP", fileId: "" },
        href: "/category/all?maxPrice=499",
        order: 4,
        isActive: true,
      },
    ],
  },
  bottom: {
    key: "bottom",
    title: "Buying in Bulk?",
    subtitle: "Get special tier discounts, customized tax invoices, and personalized quotations for large wholesale orders.",
    image: { url: "/bottom-banner.webp", fileId: "" },
    href: "/contact-us",
    ctaText: "Request a Quote",
    isActive: true,
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
