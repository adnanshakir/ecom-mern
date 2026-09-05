import { betterAuth } from "better-auth/minimal";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { emailOTP } from "better-auth/plugins";
import { testUtils } from "better-auth/plugins";
import { toNodeHandler } from "better-auth/node";
import { APIError } from "better-auth/api";
import mongoose from "mongoose";

import { config } from "./config.js";
import { ALLOWED_ATTEMPTS } from "./customerAuth.js";
import { handleEmailMasterOtp, verifyOTP } from "./otpHelper.js";
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
    secret: config.betterAuth.secret,
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
        await handleEmailMasterOtp(ctx);
      },
    },
    plugins: [
      phoneNumber({
        verifyOTP: async ({ phoneNumber, code }, ctx) => {
          return verifyOTP({ phoneNumber, code }, ALLOWED_ATTEMPTS);
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
        changeEmail: {
          enabled: true,
        },
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
