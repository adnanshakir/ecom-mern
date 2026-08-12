import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});