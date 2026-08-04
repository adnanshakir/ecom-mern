import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import StoreProvider from "@/redux/StoreProvider";

export const metadata = {
  title: "Ecom Admin",
  description: "E-Commerce admin panel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
