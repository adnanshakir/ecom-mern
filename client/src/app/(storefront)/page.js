import { PageContainer } from "@/components/layout/PageContainer";
import { HeroBanner } from "@/components/storefront/HeroBanner";
import { CategoryBanners } from "@/components/storefront/CategoryBanners";
import { PopularProductsSection } from "@/components/storefront/PopularProductsSection";
import { BrandLogos } from "@/components/storefront/BrandLogos";
import { BottomBanner } from "@/components/storefront/BottomBanner";
import { TrustFeaturesBar } from "@/components/storefront/TrustFeaturesBar";

export default function Home() {
  return (
    <div className="space-y-10 pb-12">
      <HeroBanner />
      <PageContainer className="space-y-10">
        <CategoryBanners />
        <PopularProductsSection />
        <BrandLogos />
        <BottomBanner />
        <TrustFeaturesBar />
      </PageContainer>
    </div>
  );
}
