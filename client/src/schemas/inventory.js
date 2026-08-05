import { z } from "zod";

export const movementTypes = [
  "initial",
  "restock",
  "sale",
  "return",
  "damage",
  "correction",
];

export const movementSchema = z
  .object({
    type: z.enum(movementTypes),
    quantity: z.coerce.number(),
    reason: z.string().optional(),
  })
  .refine((data) => data.type === "correction" || data.quantity > 0, {
    message: "Quantity must be positive for this movement type",
    path: ["quantity"],
  });