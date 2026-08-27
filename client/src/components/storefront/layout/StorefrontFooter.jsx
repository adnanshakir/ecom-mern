"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

const HIDDEN_FOOTER_PATHS = [
  "/cart",
  "/wishlist",
  "/account/profile",
  "/account/orders",
  "/profile",
  "/orders",
];

export function StorefrontFooter() {
  const pathname = usePathname();

  const isHidden = HIDDEN_FOOTER_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`)
  );

  if (isHidden) return null;

  return <Footer />;
}
