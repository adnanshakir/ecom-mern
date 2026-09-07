import dotenv from "dotenv";

dotenv.config();

/**
 * Loads, trims, and validates environment variables.
 * Fails fast on boot if any required environment variable is missing or malformed.
 */
export const loadConfig = (envSource = process.env) => {
  const getEnv = (key, defaultValue = "") => {
    let val = envSource[key];
    if ((val === undefined || val === null || val === "") && key === "FRONTEND_URL") {
      val = envSource["FRONTEND"] || envSource["frontend"];
    }
    if ((val === undefined || val === null || val === "") && key === "TRUSTED_ORIGINS") {
      val = envSource["TRUSTED"] || envSource["trusted"] || envSource["TRUSTED_ORIGIN"] || envSource["trusted_origin"];
    }
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
  const rawPort = getEnv("PORT", "5000");
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT environment variable: "${rawPort}". Must be an integer between 1 and 65535.`);
  }

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
    get allowedOrigins() {
      const frontendOrigins = parseOrigins(getEnv("FRONTEND_URL"));
      const trustedOrigins = parseOrigins(getEnv("TRUSTED_ORIGINS"));
      return Array.from(new Set([...frontendOrigins, ...trustedOrigins]));
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
        const frontendOrigins = parseOrigins(getEnv("FRONTEND_URL"));
        const trustedOrigins = parseOrigins(getEnv("TRUSTED_ORIGINS"));
        const combined = Array.from(new Set([...frontendOrigins, ...trustedOrigins]));
        if (isProd() || isTestEnv()) {
          return combined;
        }
        return Array.from(new Set([...combined, ...initialTrustedOrigins]));
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
