import dotenv from "dotenv";

dotenv.config();

/**
 * Loads, trims, and validates environment variables.
 * Fails fast on boot if any required environment variable is missing or malformed.
 */
export const loadConfig = (envSource = process.env) => {
  const getEnv = (key, defaultValue = "") => {
    const val = envSource[key];
    if (val === undefined || val === null) return defaultValue;
    return String(val).trim();
  };

  const requiredEnv = [
    "PORT",
    "MONGO_URI",
    "JWT_SECRET",
    "BETTER_AUTH_SECRET",
    "IMAGEKIT_PUBLIC_KEY",
    "IMAGEKIT_PRIVATE_KEY",
    "IMAGEKIT_URL_ENDPOINT",
    "FRONTEND_URL",
  ];

  for (const key of requiredEnv) {
    if (!getEnv(key)) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const currentNodeEnv = () => getEnv("NODE_ENV", "development");
  const isProd = () => currentNodeEnv() === "production";
  const isTestEnv = () => currentNodeEnv() === "test";
  const port = Number(getEnv("PORT", "5000")) || 5000;

  const validateProductionBetterAuthUrl = (url) => {
    if (!url) {
      throw new Error("BETTER_AUTH_URL environment variable is required in production");
    }
    try {
      const parsedUrl = new URL(url);
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
      throw new Error(`Invalid BETTER_AUTH_URL in production: ${url}`);
    }
  };

  let initialBetterAuthUrl = getEnv("BETTER_AUTH_URL");
  if (isProd()) {
    validateProductionBetterAuthUrl(initialBetterAuthUrl);
  } else {
    initialBetterAuthUrl = initialBetterAuthUrl || `http://localhost:${port}`;
  }

  const parseOrigins = (str) =>
    str
      ? str
          .split(",")
          .map((o) => o.trim().replace(/\/$/, ""))
          .filter(Boolean)
      : [];

  const initialFrontendUrl = getEnv("FRONTEND_URL");
  const initialFrontendUrls = parseOrigins(initialFrontendUrl);
  const initialTrustedOrigins = getEnv("TRUSTED_ORIGINS")
    ? parseOrigins(getEnv("TRUSTED_ORIGINS"))
    : [
        (initialFrontendUrl || "http://localhost:3000").replace(/\/$/, ""),
        "http://localhost:3000",
        "http://localhost:5173",
      ];

  const configObj = {
    port,
    mongodbUri: getEnv("MONGO_URI"),
    get nodeEnv() {
      return currentNodeEnv();
    },
    get isProduction() {
      return isProd();
    },
    get isTest() {
      return isTestEnv();
    },

    get frontendUrl() {
      return getEnv("FRONTEND_URL");
    },
    get frontendUrls() {
      return parseOrigins(getEnv("FRONTEND_URL"));
    },

    betterAuth: {
      get url() {
        const current = getEnv("BETTER_AUTH_URL");
        if (isProd()) {
          validateProductionBetterAuthUrl(current);
          return current;
        }
        return current || initialBetterAuthUrl;
      },
      get secret() {
        return getEnv("BETTER_AUTH_SECRET");
      },
      get trustedOrigins() {
        const currentTrusted = getEnv("TRUSTED_ORIGINS");
        if (currentTrusted) return parseOrigins(currentTrusted);
        const frontendOrigins = parseOrigins(getEnv("FRONTEND_URL"));
        if (isProd()) {
          return frontendOrigins;
        }
        return Array.from(new Set([...frontendOrigins, ...initialTrustedOrigins]));
      },
    },

    jwtSecret: {
      get secret() {
        return getEnv("JWT_SECRET");
      },
      accessExpiry: "15m",
      refreshExpiry: "7d",
    },

    masterOtp: {
      get isAllowed() {
        return getEnv("ALLOW_MASTER_OTP") === "true";
      },
      get masterCode() {
        return getEnv("MASTER_OTP_CODE");
      },
    },

    imagekit: {
      get publicKey() {
        return getEnv("IMAGEKIT_PUBLIC_KEY");
      },
      get privateKey() {
        return getEnv("IMAGEKIT_PRIVATE_KEY");
      },
      get urlEndpoint() {
        return getEnv("IMAGEKIT_URL_ENDPOINT");
      },
    },

    get lowStockThreshold() {
      return Number(getEnv("LOW_STOCK_THRESHOLD", "10")) || 10;
    },

    get cookieOptions() {
      const prod = isProd();
      return {
        httpOnly: true,
        secure: prod,
        sameSite: prod ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };
    },
  };

  return Object.freeze(configObj);
};

export const config = loadConfig();
