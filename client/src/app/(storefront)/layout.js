import { ThemeProvider } from "@/components/theme-provider";
import { StorefrontChrome } from "@/components/storefront/layout/StorefrontChrome";

export default function StorefrontLayout({ children }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light">
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <StorefrontChrome>{children}</StorefrontChrome>
      </div>
    </ThemeProvider>
  );
}
