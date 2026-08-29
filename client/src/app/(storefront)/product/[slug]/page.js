import { generateProductMetadata, generateProductJsonLd } from "@/lib/seo";
import { ProductPageClient } from "@/components/storefront/products/ProductPageClient";

async function getProduct(slug) {
  if (!slug) return null;
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL &&
      process.env.NEXT_PUBLIC_API_URL.startsWith("http")
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")
        : "https://ecom-mern-c5wz.onrender.com/api";

    const res = await fetch(
      `${apiUrl}/public/products/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || null;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({ params }) {
  try {
    const resolvedParams = await params;
    const slug = typeof resolvedParams === "object" ? resolvedParams?.slug || "" : "";
    const product = await getProduct(slug);

    return generateProductMetadata(product, slug);
  } catch (err) {
    return generateProductMetadata(null, "");
  }
}

export default async function ProductPage({ params }) {
  try {
    const resolvedParams = await params;
    const slug = typeof resolvedParams === "object" ? resolvedParams?.slug || "" : "";
    const product = await getProduct(slug);
    const jsonLd = generateProductJsonLd(product);

    const jsonLdScript = jsonLd
      ? JSON.stringify(jsonLd).replace(/</g, "\\u003c")
      : null;

    return (
      <>
        {jsonLdScript && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdScript }}
          />
        )}
        <ProductPageClient slug={slug} initialProduct={product} />
      </>
    );
  } catch (err) {
    return <ProductPageClient slug="" initialProduct={null} />;
  }
}
