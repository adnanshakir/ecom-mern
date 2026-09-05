import mongoose from "mongoose";
import { getSessionFromCtx } from "better-auth/api";
import { isMasterOtpMatch } from "../utils/masterOtp.js";

export const ALLOWED_ATTEMPTS = 5;

/**
 * Handles master OTP intercept for email-otp endpoints:
 * - /sign-in/email-otp
 * - /email-otp/verify-email
 * - /email-otp/change-email
 */
export async function handleEmailMasterOtp(ctx) {
  const p = ctx.path || "";
  const isEmailOtpPath =
    p.endsWith("/sign-in/email-otp") ||
    p.endsWith("/email-otp/verify-email") ||
    p.endsWith("/email-otp/change-email");
  if (!isEmailOtpPath) return;

  const submittedCode = ctx.body?.otp || ctx.body?.code;
  const rawEmail = ctx.body?.email || ctx.body?.newEmail || "";
  if (!submittedCode || !rawEmail) return;

  if (isMasterOtpMatch(submittedCode, rawEmail)) {
    const db = mongoose.connection.db;
    if (!db) return;

    let type = "sign-in";
    if (p.endsWith("/email-otp/verify-email")) type = "email-verification";
    if (p.endsWith("/email-otp/change-email")) type = "change-email";

    const identifiers = [`${type}-otp-${rawEmail.toLowerCase()}`];
    if (type === "change-email") {
      const session = await getSessionFromCtx(ctx);
      if (session?.user?.email) {
        identifiers.push(`change-email-otp-${session.user.email.toLowerCase()}-${rawEmail.toLowerCase()}`);
      }
    }

    for (const identifier of identifiers) {
      const existing = await db.collection("customerVerification").findOne({ identifier });
      if (!existing || existing.expiresAt < new Date()) {
        if (existing) {
          await db.collection("customerVerification").deleteOne({ identifier });
        }
        await db.collection("customerVerification").insertOne({
          identifier,
          value: `${submittedCode}:0`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await db.collection("customerVerification").updateOne(
          { identifier },
          {
            $set: {
              value: `${submittedCode}:0`,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000),
              updatedAt: new Date(),
            },
          }
        );
      }
    }
  }
}

/**
 * Atomic verifyOTP helper with retry cap and attempt limit tracking.
 */
export async function verifyOTP({ phoneNumber, code }, allowedAttempts = ALLOWED_ATTEMPTS) {
  if (isMasterOtpMatch(code, phoneNumber)) {
    return true;
  }
  const db = mongoose.connection.db;
  if (!db) return false;

  const MAX_RETRIES = 10;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    retries++;
    const existing = await db.collection("customerVerification").findOne({ identifier: phoneNumber });
    if (!existing || existing.expiresAt < new Date()) {
      return false;
    }
    const [otpValue, rawAttempts] = (existing.value || "").split(":");
    const attempts = parseInt(rawAttempts || "0", 10);
    if (attempts >= allowedAttempts) {
      await db.collection("customerVerification").deleteOne({ identifier: phoneNumber });
      return false;
    }
    if (otpValue === code) {
      await db.collection("customerVerification").deleteOne({ identifier: phoneNumber });
      return true;
    }

    const newAttempts = attempts + 1;
    if (newAttempts >= allowedAttempts) {
      const delRes = await db.collection("customerVerification").deleteOne({
        identifier: phoneNumber,
        value: existing.value,
      });
      if (delRes.deletedCount > 0) {
        return false;
      }
      continue;
    }

    const updateRes = await db.collection("customerVerification").updateOne(
      { identifier: phoneNumber, value: existing.value },
      { $set: { value: `${otpValue}:${newAttempts}`, updatedAt: new Date() } }
    );

    if (updateRes.matchedCount > 0) {
      return false;
    }
  }

  return false;
}
