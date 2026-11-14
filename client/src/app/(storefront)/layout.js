import { ThemeProvider } from "@/components/theme-provider";
import { StorefrontChrome } from "@/components/storefront/layout/StorefrontChrome";
import TickerBar from "@/components/storefront/TickerBar";

export default function StorefrontLayout({ children }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light">
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <TickerBar />
        <StorefrontChrome>{children}</StorefrontChrome>
      </div>
    </ThemeProvider>
  );
}
