import { z } from "zod";
import { objectId } from "../shared.js";


export const addToCartSchema = z.object({
  variantId: objectId,
  quantity: z.number().int().positive("Quantity must be at least 1"),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
});

export const MAX_CART_MERGE_ITEMS = 100;

export const mergeCartSchema = z.object({
  batchId: z.string().trim().min(1).max(128).optional(),
  items: z
    .array(
      z.object({
        variantId: objectId,
        quantity: z.number().int().positive("Quantity must be at least 1"),
      })
    )
    .max(MAX_CART_MERGE_ITEMS, `Cannot merge more than ${MAX_CART_MERGE_ITEMS} items at once`)
    .default([]),
});
