import { z } from "zod";

export const weightUnits = ["g", "kg", "lb", "oz"];

const optionSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  value: z.string().trim().min(1, "Required"),
});

export const variantSchema = z
  .object({
    sku: z.string().min(1, "SKU is required"),
    price: z.coerce.number().positive("Price must be greater than 0"),
    stock: z.coerce.number().int().min(0, "Stock can't be negative"),
    salePrice: z.coerce.number().positive().optional().or(z.literal("")),
    costPrice: z.coerce.number().min(0).optional().or(z.literal("")),
    barcode: z.string().optional(),
    weight: z
      .object({
        value: z.coerce.number().optional(),
        unit: z.enum(weightUnits).default("g"),
      })
      .optional()
      .refine((w) => !w?.value || w.value > 0, {
        message: "Weight must be greater than 0",
        path: ["value"],
      }),
    images: z
      .array(
        z.object({
          url: z.string().url("Invalid image URL"),
          fileId: z.string().optional(),
        })
      )
      .max(4, "A variant can have at most 4 images")
      .optional()
      .default([]),
    options: z.array(optionSchema).optional(),
  })
  .refine((data) => !data.salePrice || data.salePrice <= data.price, {
    message: "Sale price cannot be greater than price",
    path: ["salePrice"],
  });

const optionTypeSchema = z.object({
  name: z.string().min(1, "Required"),
  values: z.array(z.object({ value: z.string().min(1) })).min(1, "Add at least one value"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  optionTypes: z.array(optionTypeSchema).optional().default([]),
  category: z.string().min(1, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean(),
  seoTitle: z.string().max(120, "SEO title must be 120 characters or fewer").optional(),
  seoDescription: z.string().max(350, "SEO description must be 350 characters or fewer").optional(),
  images: z
    .array(
      z.object({
        url: z.string().url("Invalid image URL"),
        fileId: z.string().min(1),
      })
    )
    .optional()
    .default([]),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
});

export const productDetailsSchema = productSchema.omit({ variants: true });
