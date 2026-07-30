import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["PORT", "MONGO_URI", "JWT_SECRET", "IMAGEKIT_PRIVATE_KEY"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT),
  mongodbUri: process.env.MONGO_URI,
  imagekit: process.env.IMAGEKIT_PRIVATE_KEY,
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD) || 10,
  jwtSecret: {
    secret: process.env.JWT_SECRET,
    accessExpiry: "15m",
    refreshExpiry: "7d",
  },
  nodeEnv: process.env.NODE_ENV || "development",
};