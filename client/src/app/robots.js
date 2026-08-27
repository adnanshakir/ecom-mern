import { getSiteUrl } from "@/lib/seo";

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/cart",
          "/checkout",
          "/account",
          "/orders",
          "/admin",
          "/login",
          "/profile",
          "/wishlist",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
