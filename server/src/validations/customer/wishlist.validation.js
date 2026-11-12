import { z } from "zod";
import { objectId } from "../shared.js";


export const addToWishlistSchema = z.object({
  productId: objectId,
});

export const MAX_WISHLIST_MERGE_ITEMS = 100;

export const mergeWishlistSchema = z.object({
  productIds: z
    .array(objectId)
    .max(MAX_WISHLIST_MERGE_ITEMS, `Cannot merge more than ${MAX_WISHLIST_MERGE_ITEMS} items at once`)
    .default([]),
});
