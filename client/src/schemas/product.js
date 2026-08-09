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
  image: z.string().optional(), // single ImageKit URL, matches variant model
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean(),
  seoTitle: z.string().max(120, "SEO Title must be 120 characters or fewer").optional(),
  seoDescription: z
  .string()
  .max(350, "SEO description must be 200 characters or fewer")
  .optional(),
  images: z
    .array(z.object({ url: z.string(), fileId: z.string() }))
    .optional()
    .default([]),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
});

export const productDetailsSchema = productSchema.omit({ variants: true });
