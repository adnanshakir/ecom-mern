import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProductGrid } from "@/components/storefront/ProductGrid";

export default function Home() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold">All Products</h1>
        <ProductGrid />
      </div>
    </PageContainer>
  );
}
