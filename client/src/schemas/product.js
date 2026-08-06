import { z } from "zod";

export const weightUnits = ["g", "kg", "lb", "oz"];

export const variantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  stock: z.coerce.number().int().min(0, "Stock can't be negative"),
  salePrice: z.coerce.number().positive().optional().or(z.literal("")),
  barcode: z.string().optional(),
  weight: z
    .object({
      value: z.coerce.number().positive(),
      unit: z.enum(weightUnits).default("g"),
    })
    .optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  images: z.string().optional(), // newline-separated URLs in the UI, split into an array on submit
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
});

// Used on the Edit page — PUT /products/:id never touches variants,
// so this mirrors productSchema minus the variants array.
export const productDetailsSchema = productSchema.omit({ variants: true });
