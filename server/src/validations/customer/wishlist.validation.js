import { z } from "zod";
import { objectId } from "../shared.js";


export const addToWishlistSchema = z.object({
  productId: objectId,
});

export const mergeWishlistSchema = z.object({
  productIds: z.array(objectId).default([]),
});
