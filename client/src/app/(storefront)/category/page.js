import { generateCategoryMetadata } from "@/lib/seo";
import { CategoryIndexClient } from "@/components/storefront/category/CategoryIndexClient";

export const metadata = generateCategoryMetadata("all", null);

export default function CategoryIndexPage() {
  return <CategoryIndexClient />;
}
