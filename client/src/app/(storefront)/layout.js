import { Navbar } from "@/components/storefront/Navbar";
import { CategoryNav } from "@/components/storefront/CategoryNav";
import { Footer } from "@/components/storefront/Footer";
import { ScrollToTop } from "@/components/storefront/ScrollToTop";

export default function StorefrontLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <CategoryNav />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
