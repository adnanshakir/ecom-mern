import { getPublicProductBySlug } from "@/services/storefront/publicCatalog";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ProductInteractiveSection } from "@/components/storefront/ProductInteractiveSection";
import { RelatedProducts } from "@/components/storefront/RelatedProducts";
import { ExploreProducts } from "@/components/storefront/ExploreProducts";
import { Breadcrumbs } from "@/components/storefront/Breadcrumbs";

async function fetchProduct(slug) {
  try {
    const res = await getPublicProductBySlug(slug);
    return res.data?.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found | Fibio Wholesale",
    };
  }

  const primaryImage = product.images?.[0]?.url;

  return {
    title: `${product.name} | Fibio Wholesale`,
    description: product.description?.slice(0, 160) || `Buy ${product.name} at wholesale prices.`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      images: primaryImage ? [{ url: primaryImage }] : [],
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) {
    return (
      <div className="py-20 text-center text-sm text-destructive">
        Product not found
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          {
            label: product.category?.name || "Catalog",
            href: `/catalog/${product.category?.slug || product.category?._id || "all"}`,
          },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[440px_1fr]">
        <ProductGallery productImages={product.images} />
        <ProductInteractiveSection product={product} />
      </div>

      {/* Section 1: Related Products */}
      <RelatedProducts categoryId={product.category?._id} excludeProductId={product._id} />

      {/* Section 2: Explore Other Products */}
      <ExploreProducts excludeProductId={product._id} excludeCategoryId={product.category?._id} />
    </div>
  );
}
