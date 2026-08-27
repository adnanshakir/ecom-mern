import { getPublicProducts, getPublicCategories } from "@/services/storefront/publicCatalog";
import { getSiteUrl } from "@/lib/seo";

export default async function sitemap() {
  const siteUrl = getSiteUrl();

  const staticRoutes = ["", "/category", "/contact-us"].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.7,
  }));

  let productRoutes = [];
  try {
    const productsRes = await getPublicProducts({ limit: 100 });
    const products = productsRes.data?.data || [];
    productRoutes = products.map((prod) => ({
      url: `${siteUrl}/product/${prod.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    }));
  } catch (err) {
    // Fallback if backend offline during build
    console.error("Sitemap product fetch warning:", err.message);
  }

  let categoryRoutes = [];
  try {
    const categoriesRes = await getPublicCategories();
    const categories = categoriesRes.data?.data || [];
    categoryRoutes = categories.map((cat) => ({
      url: `${siteUrl}/category/${cat.slug || cat._id}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (err) {
    // Fallback if backend offline during build
    console.error("Sitemap category fetch warning:", err.message);
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
