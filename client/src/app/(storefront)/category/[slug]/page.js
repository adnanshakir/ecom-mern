import { getPublicCategories } from "@/services/storefront/publicCatalog";
import { generateCategoryMetadata } from "@/lib/seo";
import { CategoryPageClient } from "@/components/storefront/category/CategoryPageClient";

async function getCategory(slug) {
  if (!slug || slug === "allcategories" || slug === "all") return null;
  try {
    const res = await getPublicCategories();
    const categories = res.data?.data || [];
    return categories.find((c) => c.slug === slug || c._id === slug) || null;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const category = await getCategory(slug);

  return generateCategoryMetadata(slug, category?.name);
}

export default async function CategoryPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  return <CategoryPageClient slug={slug} />;
}
