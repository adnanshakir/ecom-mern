"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProductCatalogFilterView } from "@/components/storefront/ProductCatalogFilterView";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-[#033936]" />
          Loading search results...
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  return <ProductCatalogFilterView initialSearch={query} />;
}
