import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/storefront/layout/Navbar";
import { CategoryNav } from "@/components/storefront/layout/CategoryNav";
import { StorefrontFooter } from "@/components/storefront/layout/StorefrontFooter";
import { ScrollToTop } from "@/components/storefront/layout/ScrollToTop";

export default function StorefrontLayout({ children }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light">
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <CategoryNav />
        <main className="flex-1">{children}</main>
        <StorefrontFooter />
        <ScrollToTop />
      </div>
    </ThemeProvider>
  );
}

