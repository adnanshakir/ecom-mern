"use client";

import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#033936] text-white shadow-xl">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bottom-banner.png"
          alt="Buying in Bulk Banner"
          className="size-full object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#033936]/95 via-[#033936]/80 to-transparent sm:w-2/3" />
      </div>

      {/* Banner Content */}
      <div className="relative z-10 flex flex-col items-start p-8 sm:p-12 md:max-w-2xl">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300 backdrop-blur-md border border-white/20">
          <ClipboardList className="size-6" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
          Buying in Bulk?
        </h2>

        <p className="mt-2 text-sm font-normal text-slate-200 sm:text-base">
          Get special tier discounts, customized tax invoices, and personalized quotations for large wholesale orders.
        </p>

        <div className="mt-6">
          <Button
            asChild
            size="lg"
            className="h-11 rounded-full bg-white px-7 text-sm font-bold text-[#033936] shadow-md transition-all hover:bg-slate-100 hover:scale-105"
          >
            <Link href="/contact-us" className="flex items-center gap-2">
              <span>Request a Quote</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
