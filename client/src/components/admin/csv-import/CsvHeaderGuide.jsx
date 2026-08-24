"use client";

import { useState } from "react";
import { Download, HelpCircle, Info, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const HEADER_SPEC = [
  {
    field: "Product Title",
    required: true,
    headers: ["Title", "Product Name", "Name"],
    example: "Nike Air Max 270",
    note: "Defines the product name. Required on parent rows.",
  },
  {
    field: "URL Handle",
    required: true,
    headers: ["URL handle", "Handle", "Slug"],
    example: "nike-air-max-270",
    note: "Unique slug used to group variants under one product.",
  },
  {
    field: "SKU",
    required: true,
    headers: ["SKU", "Variant SKU"],
    example: "NAM-270-BLK-09",
    note: "Unique Stock Keeping Unit code per variant.",
  },
  {
    field: "Regular Price (MRP)",
    required: true,
    headers: ["Compare-at price", "Regular Price", "Original Price"],
    example: "5499",
    note: "Original price before discount (strikethrough price).",
  },
  {
    field: "Sale Price (Selling)",
    required: true,
    headers: ["Price", "Sale Price", "Discount Price"],
    example: "4499",
    note: "Final discounted price paid by the customer.",
  },
  {
    field: "Cost per Item (Seller)",
    required: false,
    headers: ["Cost per item", "Cost Per Item", "Cost Price", "Cost"],
    example: "2800",
    note: "Wholesale cost for seller reference only (never shown to customers).",
  },
  {
    field: "Inventory / Stock",
    required: false,
    headers: ["Inventory quantity", "Stock", "Quantity"],
    example: "25",
    note: "Initial stock count available for this variant.",
  },
  {
    field: "Brand / Vendor",
    required: false,
    headers: ["Vendor", "Brand"],
    example: "Nike",
    note: "Manufacturer or brand name. Auto-created if missing.",
  },
  {
    field: "Product Category",
    required: false,
    headers: ["Product category", "Category"],
    example: "Footwear > Sneakers",
    note: "Hierarchical category path separated by '>'.",
  },
  {
    field: "Category Image URL",
    required: false,
    headers: ["Category Image URL", "Category Image"],
    example: "https://example.com/footwear-banner.jpg",
    note: "Image URL attached to the top-level Parent Category.",
  },
  {
    field: "Product Image URL",
    required: false,
    headers: ["Product Image URL", "Image Src", "Image URL"],
    example: "https://example.com/shoe-front.jpg",
    note: "Main product image link. Up to 4 images supported.",
  },
  {
    field: "Variant Image URL",
    required: false,
    headers: ["Variant Image URL", "Variant Image"],
    example: "https://example.com/shoe-black.jpg",
    note: "Specific image URL for this variant option.",
  },
  {
    field: "Variant Options",
    required: false,
    headers: ["Option1 name / Option1 value", "Option2 name / Option2 value"],
    example: "Option1 name: Color, Option1 value: Black",
    note: "Variant attributes like Size, Color, or Material.",
  },
  {
    field: "Weight (grams)",
    required: false,
    headers: ["Weight value (grams)", "Weight"],
    example: "450",
    note: "Weight in grams for shipping calculations.",
  },
];

const SAMPLE_CSV_CONTENT = `Title,URL handle,Description,Vendor,Product category,Category Image URL,SKU,Barcode,Option1 name,Option1 value,Price,Compare-at price,Cost per item,Inventory quantity,Weight value (grams),Product Image URL,Image position
Nike Air Max 270,nike-air-max-270,Premium lifestyle sneakers with max air unit.,Nike,Footwear > Sneakers,https://images.unsplash.com/photo-1549298916-b41d501d3772,NAM270-BLK-9,883412345,Color,Black,4499,5499,2800,15,450,https://images.unsplash.com/photo-1542291026-7eec264c27ff,1
,nike-air-max-270,,Nike,Footwear > Sneakers,https://images.unsplash.com/photo-1549298916-b41d501d3772,NAM270-WHT-9,883412346,Color,White,4499,5499,2800,10,450,https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a,2
Urban Graphic Hoodie,urban-graphic-hoodie,Soft heavyweight fleece hoodie.,Puma,Apparel > Hoodies,https://images.unsplash.com/photo-1516257984-b1b4d707412e,UGH-BLK-M,883412347,Size,Medium,2999,3999,1800,30,650,https://images.unsplash.com/photo-1556905055-8f358a7a47b2,1
`;

export function CsvHeaderGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample-product-import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HelpCircle className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">CSV Column Naming Guide</CardTitle>
              <p className="text-xs text-muted-foreground">
                Accepted headers (2–4 options per field) and 3-price calculation rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSampleCsv}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Download className="size-3.5 text-primary" />
              Download Sample CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-8 gap-1 text-xs text-muted-foreground"
            >
              {isOpen ? (
                <>
                  Hide details <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  Show guide <ChevronDown className="size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 grid gap-4">
        {/* Pricing Rules Banner */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
            <div className="grid gap-1">
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                3-Price System & Parent Category Image Rules
              </span>
              <p className="leading-relaxed text-emerald-700/90 dark:text-emerald-300/90">
                1. <strong>Prices Supported:</strong> Selling Price (<code>Price</code>), Regular Price (<code>Compare-at price</code>), and Wholesale Cost (<code>Cost per item</code> — seller only). Higher price is auto-assigned to Regular Price and lower to Selling Price.
                <br />
                2. <strong>Category Image Rule:</strong> Attached to top-level <em>Parent Category</em> (e.g. &quot;Footwear&quot; in &quot;Footwear &gt; Sneakers&quot;). If parent category already has an image set, existing image is kept and admin is notified in logs.
              </p>
            </div>
          </div>
        </div>

        {/* Collapsible Table Section */}
        {isOpen && (
          <div className="grid gap-3 pt-1 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Info className="size-3.5" />
                Each field accepts any of the 2–4 listed header options (case-insensitive)
              </span>
            </div>

            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-45">Field</TableHead>
                    <TableHead className="w-25">Type</TableHead>
                    <TableHead className="min-w-55">Accepted Headers (Choose any)</TableHead>
                    <TableHead>Sample Value & Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {HEADER_SPEC.map((spec) => (
                    <TableRow key={spec.field} className="hover:bg-muted/20">
                      <TableCell className="font-semibold">{spec.field}</TableCell>
                      <TableCell>
                        <Badge
                          variant={spec.required ? "default" : "secondary"}
                          className={`text-[10px] font-medium px-2 py-0.5 ${
                            spec.required
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-muted text-muted-foreground border-transparent"
                          }`}
                        >
                          {spec.required ? "Required" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {spec.headers.map((h) => (
                            <code
                              key={h}
                              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium border border-border/50 text-foreground"
                            >
                              {h}
                            </code>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="grid gap-0.5">
                          <span className="text-foreground font-mono text-[11px]">
                            {spec.example}
                          </span>
                          <span className="text-[11px] text-muted-foreground/80">{spec.note}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
