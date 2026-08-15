import { ProductCatalogFilterView } from "@/components/storefront/ProductCatalogFilterView";

export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams;
  const query = q || "";
  const title = query ? `Search: "${query}" | Fibio Wholesale` : "Search Products | Fibio Wholesale";

  return {
    title,
    description: `Search results for ${query || "wholesale products"} at Fibio Wholesale.`,
  };
}

export default async function SearchPage({ searchParams }) {
  const { q } = await searchParams;
  const query = q || "";

  return <ProductCatalogFilterView initialSearch={query} />;
}
