import { Navbar } from "@/components/storefront/layout/Navbar";
import { CategoryNav } from "@/components/storefront/layout/CategoryNav";
import { Footer } from "@/components/storefront/layout/Footer";
import { ScrollToTop } from "@/components/storefront/layout/ScrollToTop";

export default function StorefrontLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <CategoryNav />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
