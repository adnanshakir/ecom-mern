import { z } from "zod";

export const deleteAccountSchema = z.object({
  otp: z.string().min(1, "Verification code is required"),
});
