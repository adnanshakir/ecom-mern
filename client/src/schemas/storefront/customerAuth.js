import { z } from "zod";

export const customerPhoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be 10 digits")
    .max(10, "Phone number must be 10 digits")
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

export const customerOtpSchema = z.object({
  code: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain digits only"),
});

export const customerEmailOtpSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});