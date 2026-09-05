import { betterAuth } from "better-auth/minimal";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { emailOTP } from "better-auth/plugins";
import { testUtils } from "better-auth/plugins";
import { toNodeHandler } from "better-auth/node";
import { APIError } from "better-auth/api";
import mongoose from "mongoose";

import { config } from "./config.js";
import { isMasterOtpMatch } from "../utils/masterOtp.js";
import { setSessionCookie } from "better-auth/cookies";
import { getSessionFromCtx } from "better-auth/api";

let testCustomerAuthInstance = null;
let testCustomerAuthHandler = null;

export async function createTestCustomerAuth() {
  const db = mongoose.connection.db;
  const client = mongoose.connection.getClient();

  if (!db || !client) {
    throw new Error(
      "Mongoose database connection is not established. Ensure connectTestDB() has resolved before calling createTestCustomerAuth()."
    );
  }

  try {
    await db
      .collection("customerUser")
      .createIndex({ phoneNumber: 1 }, { unique: true, sparse: true });
  } catch (err) {
    console.error(
      "[CUSTOMER AUTH TEST INDEX ERROR] Failed to create unique sparse index on customerUser.phoneNumber:",
      err
    );
    throw err;
  }

  testCustomerAuthInstance = betterAuth({
    logger: {
      level: "debug",
      disabled: false,
    },
    basePath: "/api/v1/customers/auth",
    baseURL: config.betterAuth.url,
    secret: config.betterAuth.secret || "test-secret-key-min-32-chars-long!",
    database: mongodbAdapter(db, {
      client: client,
      // TODO(better-auth): re-enable transactions once upstream fixes nested
      // transaction handling (tracked: PR #10070 fixed this for 1.6.19, unclear
      // if 1.7.x has it — recheck on next better-auth upgrade).
      // Confirmed bug on 1.7.2: sign-up/email + phoneNumber plugin nested writes
      // throw "Cannot call abortTransaction after calling commitTransaction".
      transaction: false,
    }),
    user: {
      modelName: "customerUser",
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (user.phoneNumber) {
              const digits = user.phoneNumber.replace(/\D/g, "");
              const localDigits =
                digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
              if (/^[6-9]\d{9}$/.test(localDigits)) {
                user.phoneNumber = `+91${localDigits}`;
              }
              const db = mongoose.connection.db;
              if (db) {
                const existingUser = await db.collection("customerUser").findOne({
                  phoneNumber: user.phoneNumber,
                });
                if (existingUser) {
                  throw new APIError("BAD_REQUEST", {
                    message: "User with this phone number already exists",
                  });
                }
              }
            }
          },
        },
      },
    },
    session: {
      modelName: "customerSession",
    },
    account: {
      modelName: "customerAccount",
    },
    verification: {
      modelName: "customerVerification",
    },
    hooks: {
      before: async (ctx) => {
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

          let identifier = `${type}-otp-${rawEmail.toLowerCase()}`;
          if (type === "change-email") {
            const { getSessionFromCtx } = await import("better-auth/api");
            const session = await getSessionFromCtx(ctx);
            if (session?.user?.email) {
              identifier = `change-email-otp-${session.user.email.toLowerCase()}-${rawEmail.toLowerCase()}`;
            }
          }

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
      },
    },
    plugins: [
      phoneNumber({
        verifyOTP: async ({ phoneNumber, code }, ctx) => {
          if (isMasterOtpMatch(code, phoneNumber)) {
            return true;
          }
          const db = mongoose.connection.db;
          if (!db) return false;
          const allowedAttempts = 3;

          while (true) {
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
        },
        sendOTP: ({ phoneNumber, code }) => {
          console.log(`[TEST OTP] Phone: ${phoneNumber} | Code: ${code}`);
        },
        // Indian phone validation: accept supported 10- or 12-digit inputs with optional + prefix
        // (local digits matching ^[6-9]\d{9}$) and normalize to canonical E.164 (+91XXXXXXXXXX).
        phoneNumberValidator: async (phone) => {
          if (!phone || typeof phone !== "string") return false;
          const digits = phone.replace(/\D/g, "");
          let localDigits = "";
          if (digits.length === 10) {
            localDigits = digits;
          } else if (digits.length === 12 && digits.startsWith("91")) {
            localDigits = digits.slice(2);
          } else {
            return false;
          }
          return /^[6-9]\d{9}$/.test(localDigits);
        },
        signUpOnVerification: {
          getTempEmail: (phoneNumber) => {
            const digits = phoneNumber.replace(/\D/g, "");
            const localDigits =
              digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
            const canonical = /^[6-9]\d{9}$/.test(localDigits)
              ? `+91${localDigits}`
              : phoneNumber;
            return `${canonical.replace(/[^0-9]/g, "")}@customer.local`;
          },
          getTempName: (phoneNumber) => {
            const digits = phoneNumber.replace(/\D/g, "");
            const localDigits =
              digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
            return /^[6-9]\d{9}$/.test(localDigits) ? `+91${localDigits}` : phoneNumber;
          },
        },
      }),
      emailOTP({
        disableSignUp: true,
        sendVerificationOTP: ({ email, otp, type }) => {
          console.log(`[TEST EMAIL OTP] Email: ${email} | Type: ${type} | Code: ${otp}`);
        },
      }),
      testUtils({ captureOTP: true }),
    ],
  });

  testCustomerAuthHandler = toNodeHandler(testCustomerAuthInstance);
  return testCustomerAuthInstance;
}

export function getTestCustomerAuth() {
  if (!testCustomerAuthInstance) {
    throw new Error(
      "TestCustomerAuth has not been initialized. Ensure connectTestDB() and createTestCustomerAuth() have resolved."
    );
  }
  return testCustomerAuthInstance;
}

export function getTestCustomerAuthHandler() {
  if (!testCustomerAuthHandler) {
    throw new Error(
      "TestCustomerAuth handler has not been initialized. Ensure connectTestDB() and createTestCustomerAuth() have resolved."
    );
  }
  return testCustomerAuthHandler;
}
