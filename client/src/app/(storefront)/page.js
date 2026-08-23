import { PageContainer } from "@/components/layout/PageContainer";
import { HeroBanner } from "@/components/storefront/home/HeroBanner";
import { CategoryBanners } from "@/components/storefront/home/CategoryBanners";
import { PopularProductsSection } from "@/components/storefront/home/PopularProductsSection";
import { ShopByCategory } from "@/components/storefront/home/ShopByCategory";
import { ShopByBudget } from "@/components/storefront/home/ShopByBudget";
import { BrandLogos } from "@/components/storefront/home/BrandLogos";
import { BottomBanner } from "@/components/storefront/home/BottomBanner";
import { TrustFeaturesBar } from "@/components/storefront/home/TrustFeaturesBar";

export default function Home() {
  return (
    <div className="space-y-10 pb-12">
      <HeroBanner />
      <PageContainer className="space-y-10">
        <CategoryBanners />
        <PopularProductsSection />
        <ShopByCategory />
        <ShopByBudget />
        <BrandLogos />
        <BottomBanner />
        <TrustFeaturesBar />
      </PageContainer>
    </div>
  );
}
