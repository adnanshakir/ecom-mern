import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  logo: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  isActive: z.boolean(),
});
