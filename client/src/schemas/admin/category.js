import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
  image: z
    .object({
      url: z.string().optional().or(z.literal("")),
      fileId: z.string().optional().or(z.literal("")),
    })
    .optional(),
});