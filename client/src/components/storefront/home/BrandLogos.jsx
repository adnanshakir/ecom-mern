"use client";

export function BrandLogos() {
  const brands = [
    { name: "Wild Stone", logo: "/wildstone.webp" },
    { name: "Xiaomi Mi", logo: "/mi.webp" },
    { name: "Himalaya", logo: "/himalaya.webp" },
    { name: "Nivea", logo: "/nivea.webp" },
    { name: "Plum", logo: "/plam.webp" },
    { name: "Bata", logo: "/bata.webp" },
    { name: "WOW Skin Science", logo: "/wow.webp" },
  ];

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col items-center justify-between gap-2 sm:flex-row">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Trusted Brand Partners
          </h3>
          <p className="text-xs text-muted-foreground">
            Original, authentic products directly from certified manufacturers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {brands.map((brand) => (
          <div
            key={brand.name}
            className="flex h-24 items-center justify-center rounded-2xl border bg-background p-4 shadow-xs transition-all duration-200 hover:border-[#033936] hover:shadow-md sm:h-28"
            title={brand.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.logo}
              alt={brand.name}
              className="max-h-14 max-w-full object-contain transition-transform duration-200 hover:scale-105 sm:max-h-16"
            />
          </div>
        ))}

        {/* More Brands Pill */}
        <div className="flex h-24 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/40 p-3 text-center sm:h-28">
          <span className="text-xl font-extrabold text-[#033936] sm:text-2xl">+50</span>
          <span className="text-xs font-semibold text-muted-foreground">More Brands</span>
        </div>
      </div>
    </section>
  );
}
