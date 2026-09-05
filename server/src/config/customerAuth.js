import { betterAuth } from "better-auth/minimal";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { emailOTP } from "better-auth/plugins";
import { toNodeHandler } from "better-auth/node";
import { APIError } from "better-auth/api";
import mongoose from "mongoose";

let customerAuthInstance = null;
let customerAuthHandler = null;

export async function createCustomerAuth() {
  const db = mongoose.connection.db;
  const client = mongoose.connection.getClient();

  if (!db || !client) {
    throw new Error(
      "Mongoose database connection is not established. Ensure connectDB() has resolved before calling createCustomerAuth()."
    );
  }

  try {
    await db
      .collection("customerUser")
      .createIndex({ phoneNumber: 1 }, { unique: true, sparse: true });
  } catch (err) {
    console.error(
      "[CUSTOMER AUTH INDEX ERROR] Failed to create unique sparse index on customerUser.phoneNumber:",
      err
    );
    throw err;
  }

  let baseURL = process.env.BETTER_AUTH_URL;

  if (process.env.NODE_ENV === "production") {
    if (!baseURL) {
      throw new Error("BETTER_AUTH_URL environment variable is required in production");
    }

    try {
      const parsedUrl = new URL(baseURL);
      const isLocalhost =
        parsedUrl.hostname === "localhost" ||
        parsedUrl.hostname === "127.0.0.1" ||
        parsedUrl.hostname === "::1" ||
        parsedUrl.hostname === "0.0.0.0";

      if (parsedUrl.protocol !== "https:" || isLocalhost) {
        throw new Error("BETTER_AUTH_URL must be a valid public HTTPS origin in production");
      }
    } catch (err) {
      if (err.message.includes("BETTER_AUTH_URL")) throw err;
      throw new Error(`Invalid BETTER_AUTH_URL in production: ${baseURL}`);
    }
  } else {
    baseURL = baseURL || `http://localhost:${process.env.PORT || 5000}`;
  }

  const allowedOrigins = process.env.TRUSTED_ORIGINS
    ? process.env.TRUSTED_ORIGINS.split(",").map((o) => o.trim())
    : [
        (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, ""),
        "http://localhost:3000",
        "http://localhost:5173",
      ];

  customerAuthInstance = betterAuth({
    logger: {
      level: process.env.NODE_ENV === "production" ? "error" : "debug",
      disabled: false,
    },
    basePath: "/api/v1/customers/auth",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET,
    database: mongodbAdapter(db, {
      client: client,
      // TODO(better-auth): re-enable transactions once upstream fixes nested
      // transaction handling (tracked: PR #10070 fixed this for 1.6.19, unclear
      // if 1.7.x has it — recheck on next better-auth upgrade).
      // Confirmed bug on 1.7.2: phoneNumber plugin nested writes throw
      // "Cannot call abortTransaction after calling commitTransaction".
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
    plugins: [
      phoneNumber({
        // DEVELOPMENT MODE: Logging phone OTP code to terminal during dev phase.
        // Later on, this will be replaced with an SMS gateway integration (e.g. MSG91 / Twilio).
        sendOTP: async (data, _request) => {
          const targetPhone = data.phoneNumber || data.phone || data;
          const otpCode = data.code || data.otp;

          if (process.env.NODE_ENV === "production") {
            // TODO(MSG91): Implement MSG91 SMS gateway integration for production
            throw new Error("MSG91 SMS gateway not configured for production environment yet.");
          }
          console.log("\n========================================================");
          console.log("[DEV OTP LOG - PHONE SMS]");
          console.log(`Target Phone : ${targetPhone}`);
          console.log(`OTP Code     : ${otpCode}`);
          console.log("========================================================\n");
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
            const canonical = /^[6-9]\d{9}$/.test(localDigits) ? `+91${localDigits}` : phoneNumber;
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
        changeEmail: {
          enabled: true,
        },
        // DEVELOPMENT MODE: Logging email OTP code to terminal during dev phase.
        // Later on, this will be replaced with an email provider integration (e.g. Resend / SendGrid).
        sendVerificationOTP: async (data, _request) => {
          const targetEmail = data.email;
          const otpCode = data.otp || data.code;
          const otpType = data.type || "email-verification";

          if (process.env.NODE_ENV === "production") {
            // TODO(email-provider): same pattern as phone SMS — provider not chosen yet
            throw new Error("Email provider not configured for production environment yet.");
          }

          console.log("\n========================================================");
          console.log("[DEV OTP LOG - EMAIL]");
          console.log(`Target Email : ${targetEmail}`);
          console.log(`OTP Code     : ${otpCode}`);
          console.log(`OTP Type     : ${otpType}`);
          console.log("========================================================\n");
        },
      }),
    ],
    trustedOrigins: allowedOrigins,
  });

  customerAuthHandler = toNodeHandler(customerAuthInstance);
  return customerAuthInstance;
}

export function getCustomerAuth() {
  if (!customerAuthInstance) {
    throw new Error(
      "CustomerAuth has not been initialized. Ensure connectDB() and createCustomerAuth() have resolved before making customer auth requests."
    );
  }
  return customerAuthInstance;
}

export function getCustomerAuthHandler() {
  if (!customerAuthHandler) {
    throw new Error(
      "CustomerAuth handler has not been initialized. Ensure connectDB() and createCustomerAuth() have resolved before handling customer auth routes."
    );
  }
  return customerAuthHandler;
}
