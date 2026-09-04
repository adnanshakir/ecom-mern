import { betterAuth } from "better-auth/minimal";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { emailOTP } from "better-auth/plugins";
import { testUtils } from "better-auth/plugins";
import { toNodeHandler } from "better-auth/node";
import { APIError } from "better-auth/api";
import mongoose from "mongoose";

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
    await db.collection("customerUser").createIndex(
      { phoneNumber: 1 },
      { unique: true, sparse: true }
    );
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
    baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 5000}`,
    secret:
      process.env.BETTER_AUTH_SECRET ||
      process.env.JWT_SECRET ||
      "test-secret-key-min-32-chars-long!",
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
    plugins: [
      phoneNumber({
        sendOTP: ({ phoneNumber, code }) => {
          console.log(`[TEST OTP] Phone: ${phoneNumber} | Code: ${code}`);
        },
        // Indian phone validation: accept 10 bare digits (local) or +91 prefix
        // (12 digits starting with 91 after stripping non-digits).
        phoneNumberValidator: async (phone) => {
          const digits = phone.replace(/\D/g, "");
          if (digits.length === 10) return true;
          if (digits.length === 12 && digits.startsWith("91")) return true;
          return false;
        },
        signUpOnVerification: {
          getTempEmail: (phoneNumber) => `${phoneNumber.replace(/[^0-9]/g, "")}@customer.local`,
          getTempName: (phoneNumber) => phoneNumber,
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
