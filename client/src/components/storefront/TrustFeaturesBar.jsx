"use client";

import { ShieldCheck, Tag, Truck, Lock } from "lucide-react";

export function TrustFeaturesBar() {
  const features = [
    {
      icon: ShieldCheck,
      title: "100% Genuine Products",
      desc: "Sourced from trusted brands",
    },
    {
      icon: Tag,
      title: "Best Wholesale Prices",
      desc: "Unbeatable bulk pricing",
    },
    {
      icon: Truck,
      title: "Pan India Shipping",
      desc: "Fast & reliable delivery",
    },
    {
      icon: Lock,
      title: "Secure Payments",
      desc: "Safe & encrypted transactions",
    },
  ];

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const IconComponent = feature.icon;
          return (
            <div key={feature.title} className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#033936]/10 text-[#033936] dark:bg-[#033936]/30 dark:text-emerald-400">
                <IconComponent className="size-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
