import { getDisplayPrice, isInStock } from "@/lib/productPrice";

export function getSiteUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null);

  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, "");
  }
  return "https://ecom-mern-blue.vercel.app";
}

export function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();
}

/**
 * Generates Next.js Metadata object for a product page
 */
export function generateProductMetadata(product, fallbackSlug = "") {
  const siteUrl = getSiteUrl();

  const brandName = product?.brand?.name || "";
  const categoryName = product?.category?.name || "";

  const title = product
    ? (product.seo?.metaTitle ||
       `${product.name}${brandName ? ` - ${brandName}` : ""}${categoryName ? ` (${categoryName})` : ""} | Fibio Wholesale`)
    : "Fibio Wholesale - Quality Products at Wholesale Prices";

  const cleanDescription = product
    ? (product.seo?.metaDescription ||
       stripHtml(product.description || "").slice(0, 160) ||
       `Buy ${product.name} at wholesale price on Fibio Wholesale.`)
    : "Explore Fibio Wholesale for top-rated products, bulk pricing, and unbeatable wholesale deals.";

  const canonicalUrl = `${siteUrl}/product/${product?.slug || fallbackSlug}`;
  const images = product?.images?.map((img) => img.url).filter(Boolean) || [];
  const primaryImage = images[0] || `${siteUrl}/banner-1.webp`;

  const keywords =
    product?.seo?.keywords?.length > 0
      ? product.seo.keywords
      : [
          product?.name,
          brandName,
          categoryName,
          "wholesale",
          "buy online",
          "e-commerce",
          "Fibio Wholesale",
        ].filter(Boolean);

  const price = product ? getDisplayPrice(product.variants) : null;
  const inStock = product ? isInStock(product.variants) : true;

  return {
    title,
    description: cleanDescription,
    keywords: keywords.join(", "),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: cleanDescription,
      url: canonicalUrl,
      siteName: "Fibio Wholesale",
      type: "website",
      images: [
        {
          url: primaryImage,
          alt: product?.name || "Fibio Wholesale Product",
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: cleanDescription,
      images: [primaryImage],
    },
    other: {
      ...(price ? { "product:price:amount": String(price) } : {}),
      "product:price:currency": "INR",
      "product:availability": inStock ? "in stock" : "out of stock",
    },
  };
}

/**
 * Generates Schema.org JSON-LD Structured Data for a product
 */
export function generateProductJsonLd(product) {
  if (!product) return null;

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/product/${product.slug}`;
  const price = getDisplayPrice(product.variants);
  const inStock = isInStock(product.variants);
  const images = product.images?.map((img) => img.url) || [];

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: stripHtml(product.description || product.name),
    image: images,
    sku: product.variants?.[0]?.sku || product._id,
    mpn: product._id,
    brand: {
      "@type": "Brand",
      name: product.brand?.name || "Fibio Wholesale",
    },
    ...(product.category?.name
      ? { category: product.category.name }
      : {}),
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "INR",
      price: price || 0,
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Fibio Wholesale",
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      ...(product.category?.name
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.category.name,
              item: `${siteUrl}/category/${product.category.slug || product.category._id}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.category?.name ? 3 : 2,
        name: product.name,
        item: canonicalUrl,
      },
    ],
  };

  return [productSchema, breadcrumbSchema];
}

/**
 * Generates Next.js Metadata object for a category page
 */
export function generateCategoryMetadata(categorySlug, categoryName) {
  const siteUrl = getSiteUrl();
  const title = categoryName
    ? `Buy ${categoryName} Online at Wholesale Rates | Fibio Wholesale`
    : "Product Categories | Fibio Wholesale";

  const description = categoryName
    ? `Explore our extensive collection of ${categoryName} at unbeatable wholesale prices. Fast delivery & trusted quality on Fibio Wholesale.`
    : "Browse all product categories on Fibio Wholesale.";

  const canonicalUrl = `${siteUrl}/category/${categorySlug || "all"}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Fibio Wholesale",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * Site-wide Schema.org Organization and WebSite JSON-LD
 */
export function generateSiteJsonLd() {
  const siteUrl = getSiteUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Fibio Wholesale",
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Fibio Wholesale",
      url: siteUrl,
      logo: `${siteUrl}/favicon.ico`,
    },
  ];
}
