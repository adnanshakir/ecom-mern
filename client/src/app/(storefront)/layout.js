import { Navbar } from "@/components/storefront/Navbar";
import { CategoryNav } from "@/components/storefront/CategoryNav";
import { Footer } from "@/components/storefront/Footer";

export default function StorefrontLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <CategoryNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
