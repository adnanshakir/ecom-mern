import { z } from "zod";
import { objectId } from "../shared.js";

const imageSchema = z.object({
  url: z.string().url("Image URL must be a valid URL"),
  fileId: z.string().nullable().optional().default(null),
});

export const createReviewSchema = z.object({
  rating: z
    .number({ required_error: "Rating is required" })
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  title: z
    .string()
    .trim()
    .max(100, "Title cannot exceed 100 characters")
    .optional()
    .default(""),
  body: z
    .string()
    .trim()
    .max(2000, "Review body cannot exceed 2000 characters")
    .optional()
    .default(""),
  images: z
    .array(imageSchema)
    .max(4, "A review can have at most 4 images")
    .optional()
    .default([]),
});

export const updateReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5")
    .optional(),
  title: z
    .string()
    .trim()
    .max(100, "Title cannot exceed 100 characters")
    .optional(),
  body: z
    .string()
    .trim()
    .max(2000, "Review body cannot exceed 2000 characters")
    .optional(),
  images: z
    .array(imageSchema)
    .max(4, "A review can have at most 4 images")
    .optional(),
});
