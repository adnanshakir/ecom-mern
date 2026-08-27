import { getPublicProductBySlug } from "@/services/storefront/publicCatalog";
import { generateProductMetadata, generateProductJsonLd } from "@/lib/seo";
import { ProductPageClient } from "@/components/storefront/products/ProductPageClient";

async function getProduct(slug) {
  try {
    const res = await getPublicProductBySlug(slug);
    return res.data?.data || null;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const product = await getProduct(slug);

  return generateProductMetadata(product, slug);
}

export default async function ProductPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const product = await getProduct(slug);
  const jsonLd = generateProductJsonLd(product);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductPageClient slug={slug} initialProduct={product} />
    </>
  );
}
