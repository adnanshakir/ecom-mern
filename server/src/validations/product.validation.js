import { z } from "zod";

// ----- Shared Validators ------

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const imageSchema = z.object({
  url: z.string().url("Invalid image URL"),
  altText: z.string().trim().optional(),
  position: z.number().int().min(0).optional(),
});

// ------ Brand ------

export const createBrandSchema = z.object({
  name: z.string().trim().min(2, "Brand name must be at least 2 characters").max(100, "Brand name cannot exceed 100 characters"),

  logo: z.string().url("Invalid logo URL").optional(),

  isActive: z.boolean().optional(),
});

export const updateBrandSchema = createBrandSchema.partial();

// ------- Category -------

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(100, "Category name cannot exceed 100 characters"),

  parent: objectId.nullable().optional(),

  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ------- Product --------

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters").max(200, "Product name cannot exceed 200 characters"),

  description: z.string().trim().optional(),

  category: objectId,

  brand: objectId,

  status: z.enum(["draft", "active", "archived"]).optional(),

  featured: z.boolean().optional(),

  images: z.array(imageSchema).optional(),

  seoTitle: z.string().trim().max(60).optional(),

  seoDescription: z.string().trim().max(160).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// --------- Product Variant ---------

export const createVariantSchema = z.object({
  product: objectId,

  sku: z.string().trim().min(1, "SKU is required").max(100),

  barcode: z.string().trim().optional(),

  options: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Option name is required"),
        value: z.string().trim().min(1, "Option value is required"),
      }),
    )
    .optional(),

  price: z
    .number({
      invalid_type_error: "Price must be a number",
    })
    .min(0, "Price cannot be negative"),

  salePrice: z
    .number({
      invalid_type_error: "Sale price must be a number",
    })
    .min(0)
    .optional(),

  stock: z
    .number({
      invalid_type_error: "Stock must be a number",
    })
    .int()
    .min(0, "Stock cannot be negative"),

  weight: z
    .object({
      value: z.number().positive("Weight must be greater than 0"),
      unit: z.enum(["g", "kg", "lb", "oz"]),
    })
    .optional(),

  image: z.string().url("Invalid image URL").optional(),

  isActive: z.boolean().optional(),
});

export const updateVariantSchema = createVariantSchema.partial();
