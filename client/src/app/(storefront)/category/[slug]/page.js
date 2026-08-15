import { ProductCatalogFilterView } from "@/components/storefront/ProductCatalogFilterView";
import { getPublicCategories } from "@/services/storefront/publicCatalog";

async function fetchCategoryBySlug(slug) {
  if (!slug || slug === "all" || slug === "allcategories") return null;
  try {
    const res = await getPublicCategories();
    const categories = res.data?.data || [];
    return categories.find((c) => c.slug === slug || c._id === slug) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const activeCategorySlug = (slug === "allcategories" || slug === "all") ? null : slug;

  if (!activeCategorySlug) {
    return {
      title: "All Wholesale Products | Fibio Wholesale",
      description: "Browse all wholesale products across all categories.",
    };
  }

  const currentCategory = await fetchCategoryBySlug(activeCategorySlug);
  const categoryName = currentCategory ? currentCategory.name : activeCategorySlug;

  return {
    title: `${categoryName} Wholesale Products | Fibio Wholesale`,
    description: `Shop bulk ${categoryName} at unbeatable wholesale prices.`,
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const activeCategorySlug = (slug === "allcategories" || slug === "all") ? null : slug;
  const currentCategory = await fetchCategoryBySlug(activeCategorySlug);

  return (
    <ProductCatalogFilterView
      initialCategory={activeCategorySlug}
      titleOverride={currentCategory ? currentCategory.name : undefined}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Catalog", href: "/catalog" },
        ...(currentCategory ? [{ label: currentCategory.name }] : []),
      ]}
    />
  );
}
