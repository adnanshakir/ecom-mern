"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Globe2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function ContactUsView() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fake pre-filled detailed contact form values for Indian context
  const [formData, setFormData] = useState({
    name: "Alex Rivera",
    email: "alex.rivera@apexretail.in",
    phone: "+91 98765 43210",
    company: "Apex Retail Solutions Pvt. Ltd.",
    inquiryType: "wholesale",
    subject: "Bulk Pricing & GST Inquiry for Festival Stock",
    message:
      "Hello Fibio Support Team,\n\nWe are looking to place a bulk order of 250+ units for upcoming festival stock. Could you please provide details on volume discount tiers, GST invoicing support, and shipping lead times to Mumbai?\n\nThank you,\nAlex Rivera",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  const resetForm = () => {
    setSubmitted(false);
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-muted/30 via-background to-background py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs font-semibold uppercase tracking-wide border-primary/30 text-primary bg-primary/5">
            <Sparkles className="mr-1.5 size-3.5" />
            24/7 Dedicated Support & Wholesale Desk (India)
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Get in Touch with <span className="text-primary">Fibio India</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Have questions about bulk orders, product availability, GST invoicing, shipping rates across India, or account management?
            Our team is here to assist you every step of the way.
          </p>
        </div>

        {/* Quick Contact Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Phone className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">Call Us Directly</h3>
            <p className="mt-1 text-xs text-muted-foreground">Mon - Sat, 9:00 AM - 7:00 PM IST</p>
            <p className="mt-3 text-sm font-semibold text-primary">+91 (1800) 555-FIBIO</p>
            <p className="text-xs text-muted-foreground">+91 98765 43210</p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">Email Support</h3>
            <p className="mt-1 text-xs text-muted-foreground">Average response under 2 hours</p>
            <p className="mt-3 text-sm font-semibold text-primary">support@fibio.in</p>
            <p className="text-xs text-muted-foreground">wholesale@fibio.in</p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">Headquarters</h3>
            <p className="mt-1 text-xs text-muted-foreground">Corporate Office & Showroom</p>
            <p className="mt-3 text-sm font-medium text-foreground">100 Commercial St, MG Road</p>
            <p className="text-xs text-muted-foreground">Bengaluru, Karnataka 560001, India</p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">Business Hours</h3>
            <p className="mt-1 text-xs text-muted-foreground">Fulfillment & Logistics Hub</p>
            <p className="mt-3 text-sm font-medium text-foreground">Mon - Sat: 9:00 AM - 8:00 PM</p>
            <p className="text-xs text-muted-foreground">Sunday: Closed</p>
          </div>
        </div>

        {/* Main Content: Form + Detailed Business Info Sidebar */}
        <div className="mt-12 grid gap-8 lg:grid-cols-12">
          {/* Contact Form Section */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Send Us a Message</h2>
                <p className="text-xs text-muted-foreground">Fill out the form below and a representative will get back to you shortly.</p>
              </div>
            </div>

            {submitted ? (
              <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
                <h3 className="mt-3 text-lg font-bold text-foreground">Message Sent Successfully!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thank you, <span className="font-semibold text-foreground">{formData.name}</span>. Your message regarding &quot;{formData.subject}&quot; has been received. Our team will contact you at <span className="font-semibold text-foreground">{formData.email}</span> within 2 hours.
                </p>
                <Button className="mt-5" variant="outline" onClick={resetForm}>
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Your Name *</label>
                    <Input
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Email Address *</label>
                    <Input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. rahul@company.in"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Phone Number</label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Company / Organization</label>
                    <Input
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="e.g. Apex Retail Solutions Pvt. Ltd."
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Inquiry Type</label>
                    <select
                      name="inquiryType"
                      value={formData.inquiryType}
                      onChange={handleChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="wholesale">Wholesale & Bulk Orders</option>
                      <option value="general">General Inquiry</option>
                      <option value="support">Product Support</option>
                      <option value="billing">GST & Invoicing</option>
                      <option value="returns">Returns & Exchanges</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">Subject *</label>
                    <Input
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Summary of inquiry"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Message Details *</label>
                  <Textarea
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Provide details about your inquiry..."
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" size="lg" className="w-full sm:w-auto px-8" disabled={submitting}>
                    {submitting ? (
                      "Sending Message..."
                    ) : (
                      <>
                        <Send className="mr-2 size-4" /> Send Message
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Business & FAQ Sidebar */}
          <div className="space-y-6 lg:col-span-5">
            {/* B2B Wholesale Card */}
            <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
              <div className="flex items-center gap-3 text-primary">
                <Building2 className="size-6" />
                <h3 className="font-bold text-foreground">Wholesale & Enterprise Buyers</h3>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Interested in volume purchases across India or establishing a trade account with custom pricing, credit terms, and GST invoicing?
              </p>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>GST business ordering & input tax credit enabled</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Globe2 className="size-4 text-primary" />
                  <span>Pan-India freight & bulk transport options available</span>
                </div>
              </div>
            </div>

            {/* Quick Answer FAQs */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-foreground">
                <HelpCircle className="size-5 text-primary" />
                <h3 className="font-bold">Frequently Asked Questions</h3>
              </div>

              <div className="mt-4 space-y-3 divide-y text-xs">
                <div className="pt-3 first:pt-0">
                  <p className="font-semibold text-foreground">What is the standard response time?</p>
                  <p className="mt-1 text-muted-foreground">Our team responds to all customer inquiries within 1 to 2 business hours.</p>
                </div>
                <div className="pt-3">
                  <p className="font-semibold text-foreground">How do I request a GST-compliant wholesale invoice?</p>
                  <p className="mt-1 text-muted-foreground">Provide your GSTIN during checkout or select &quot;GST & Invoicing&quot; in the form dropdown above.</p>
                </div>
                <div className="pt-3">
                  <p className="font-semibold text-foreground">Where can I track an existing order?</p>
                  <p className="mt-1 text-muted-foreground">You can use our Track Order tool at top navigation or view your Order History under your Account menu.</p>
                </div>
              </div>
            </div>

            {/* Interactive Office Location Preview */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="relative h-36 w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center border">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/30 opacity-70" />
                <div className="relative z-10 text-center p-4">
                  <MapPin className="mx-auto size-7 text-primary animate-bounce" />
                  <p className="mt-1 text-xs font-bold text-foreground">Fibio Distribution HQ (India)</p>
                  <p className="text-[10px] text-muted-foreground">Bengaluru, Karnataka • India</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
