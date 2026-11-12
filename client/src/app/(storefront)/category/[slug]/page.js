import { getPublicCategories } from "@/services/storefront/publicCatalog";
import { generateCategoryMetadata } from "@/lib/seo";
import { CategoryPageClient } from "@/components/storefront/category/CategoryPageClient";

async function getCategory(slug) {
  if (!slug || slug === "allcategories" || slug === "all") return null;
  try {
    const res = await getPublicCategories();
    const categories = res.data?.data || [];

    function findInTree(list, target) {
      if (!Array.isArray(list)) return null;
      for (const c of list) {
        if (!c) continue;
        if (c.slug === target || c._id === target) return c;
        if (Array.isArray(c.subcategories) && c.subcategories.length > 0) {
          const found = findInTree(c.subcategories, target);
          if (found) return found;
        }
      }
      return null;
    }

    return findInTree(categories, slug);
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
