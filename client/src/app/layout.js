import "./globals.css";
import StoreProvider from "@/redux/StoreProvider";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { getSiteUrl, generateSiteJsonLd } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["monospace"],
});

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Fibio Wholesale - Premium Products at Wholesale Prices",
    template: "%s | Fibio Wholesale",
  },
  description:
    "Fibio Wholesale is your premier e-commerce destination for high-quality wholesale products, unbeatable prices, and fast delivery.",
  keywords: [
    "Fibio Wholesale",
    "wholesale e-commerce",
    "buy wholesale online",
    "bulk buying",
    "online store",
  ],
  authors: [{ name: "Fibio Wholesale" }],
  creator: "Fibio Wholesale",
  publisher: "Fibio Wholesale",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Fibio Wholesale",
    title: "Fibio Wholesale - Premium Products at Wholesale Prices",
    description:
      "Fibio Wholesale is your premier e-commerce destination for high-quality wholesale products, unbeatable prices, and fast delivery.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fibio Wholesale - Premium Products at Wholesale Prices",
    description:
      "Fibio Wholesale is your premier e-commerce destination for high-quality wholesale products, unbeatable prices, and fast delivery.",
  },
};

export default function RootLayout({ children }) {
  const siteJsonLd = generateSiteJsonLd();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {siteJsonLd.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <StoreProvider>{children}</StoreProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
