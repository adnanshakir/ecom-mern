import { z } from "zod";

export const userRoles = ["super_admin", "admin", "staff"];

export const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum(userRoles),
  isActive: z.boolean(),
});