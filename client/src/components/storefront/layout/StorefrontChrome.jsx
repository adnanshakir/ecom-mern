"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { CategoryNav } from "./CategoryNav";
import { StorefrontFooter } from "./StorefrontFooter";
import { ScrollToTop } from "./ScrollToTop";

export function StorefrontChrome({ children }) {
  const checkout = usePathname() === "/checkout";

  return (
    <>
      {!checkout && <Navbar />}
      {!checkout && <CategoryNav />}
      <main className="flex-1">{children}</main>
      {!checkout && <StorefrontFooter />}
      {!checkout && <ScrollToTop />}
    </>
  );
}
