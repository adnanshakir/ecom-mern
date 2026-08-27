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
  try {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug || "";
    const product = await getProduct(slug);

    return generateProductMetadata(product, slug);
  } catch (err) {
    return generateProductMetadata(null, "");
  }
}

export default async function ProductPage({ params }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams?.slug || "";
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
