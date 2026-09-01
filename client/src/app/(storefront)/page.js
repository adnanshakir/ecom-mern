import { PageContainer } from "@/components/layout/PageContainer";
import { HeroBanner } from "@/components/storefront/home/HeroBanner";
import { PopularProductsSection } from "@/components/storefront/home/PopularProductsSection";
import { ShopByCategory } from "@/components/storefront/home/ShopByCategory";
import { ShopByBudget } from "@/components/storefront/home/ShopByBudget";
import { BrandLogos } from "@/components/storefront/home/BrandLogos";
import { BottomBanner } from "@/components/storefront/home/BottomBanner";
import { TrustFeaturesBar } from "@/components/storefront/home/TrustFeaturesBar";
import { FaqSection } from "@/components/storefront/home/FaqSection";
import { RecentlyViewedProducts } from "@/components/storefront/products/RecentlyViewedProducts";
import { ExploreProducts } from "@/components/storefront";
import { getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

export const metadata = {
  title: "Fibio Wholesale - Quality Products at Wholesale Prices",
  description:
    "Explore Fibio Wholesale for top-rated products, bulk pricing, and unbeatable wholesale deals across electronics, footwear, apparel, and more.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Fibio Wholesale - Quality Products at Wholesale Prices",
    description:
      "Explore Fibio Wholesale for top-rated products, bulk pricing, and unbeatable wholesale deals across electronics, footwear, apparel, and more.",
    url: siteUrl,
    siteName: "Fibio Wholesale",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fibio Wholesale - Quality Products at Wholesale Prices",
    description:
      "Explore Fibio Wholesale for top-rated products, bulk pricing, and unbeatable wholesale deals across electronics, footwear, apparel, and more.",
  },
};

export default function Home() {
  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      <HeroBanner />
      <PageContainer className="space-y-10">
        <ShopByBudget />
        <PopularProductsSection />
        <RecentlyViewedProducts />
        <ShopByCategory />
        <ExploreProducts/>
        <BrandLogos />
        <BottomBanner />
        <TrustFeaturesBar />
        <FaqSection />
      </PageContainer>
    </div>
  );
}
