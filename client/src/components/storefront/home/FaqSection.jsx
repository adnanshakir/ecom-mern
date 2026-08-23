"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    id: "delivery",
    question: "How long does delivery take across India?",
    answer:
      "Metro cities usually receive orders in 2–4 business days, and the rest of India within 4–7 business days. You’ll get a tracking link by SMS and email once your order ships.",
  },
  {
    id: "cod",
    question: "Is Cash on Delivery available everywhere?",
    answer:
      "COD is available across most serviceable pincodes in India. If your pincode is COD-eligible, the option will appear at checkout; otherwise you can pay via UPI, cards or wallets.",
  },
  {
    id: "prices",
    question: "Why are your prices so much lower than other stores?",
    answer:
      "We work directly with manufacturing partners across Gujarat and Mumbai and skip the layers of middlemen. That factory-direct sourcing is what lets us offer wholesale rates with no minimum order.",
  },
  {
    id: "tracking",
    question: "How can I track my order status?",
    answer:
      "Once dispatched, you'll receive a live tracking link via WhatsApp, SMS, and email. You can also view real-time updates directly in the 'My Orders' section of your account.",
  },
  {
    id: "returns",
    question: "What is your return or replacement policy?",
    answer:
      "We offer a hassle-free 7-day return and replacement policy for damaged, defective, or incorrect items. Simply raise a request under 'My Orders' or contact our support team.",
  },
];

export function FaqSection() {
  // First item open by default
  const [openId, setOpenId] = useState("delivery");

  const toggleItem = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="py-8 border-t border-border/50">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Huge Light Heading & Caption */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:sticky lg:top-24">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground/20 leading-[1.08] select-none">
              Frequently
              <br />
              asked
              <br />
              questions.
            </h2>
            <p className="text-sm text-muted-foreground font-medium max-w-sm pt-2">
              Transparent answers about factory-direct pricing, pan-India delivery, COD options, and returns.
            </p>
          </div>

          <div className="pt-2 text-xs font-semibold text-muted-foreground/80">
            Built with transparency for wholesale shoppers.
          </div>
        </div>

        {/* Right Column: Q&A List & Social Icons */}
        <div className="lg:col-span-7 space-y-6">
          {/* Questions Accordion */}
          <div className="space-y-3">
            {FAQ_ITEMS.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 bg-card overflow-hidden ${
                    isOpen
                      ? "border-[#033936]/40 dark:border-emerald-500/40 shadow-xs ring-1 ring-[#033936]/15 dark:ring-emerald-500/20"
                      : "border-border/70 hover:border-foreground/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(faq.id)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-4 cursor-pointer select-none"
                    aria-expanded={isOpen}
                  >
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">{faq.question}</h3>
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/70 transition-transform duration-200 ${
                        isOpen
                          ? "rotate-180 bg-[#033936]/10 text-[#033936] dark:bg-[#033936]/30 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      <ChevronDown className="size-4" />
                    </div>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
