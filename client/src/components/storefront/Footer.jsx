import Link from "next/link";

const FOOTER_SECTIONS = [
  {
    title: "Shop",
    links: [
      { label: "All Products", href: "/products" },
      { label: "Categories", href: "/category" },
      { label: "Deals", href: "/deals" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Us", href: "/contact-us" },
      { label: "Track Your Order", href: "/track-order" },
      { label: "Returns & Refunds", href: "/returns" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <span className="text-lg font-bold">Fibio</span>
          <span className="ml-1.5 text-xs text-muted-foreground">Wholesale</span>
          <p className="mt-2 text-sm text-muted-foreground">Quality products, wholesale prices.</p>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-sm font-medium">{section.title}</p>
            <ul className="mt-3 grid gap-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Fibio. All rights reserved.
        <Link href="/admin/login" className="ml-3 hover:text-foreground">
          Seller Login
        </Link>
      </div>
    </footer>
  );
}
