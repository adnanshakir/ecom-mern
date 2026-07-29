import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'IMAGEKIT_PUBLIC_KEY',
  'IMAGEKIT_PRIVATE_KEY',
  'IMAGEKIT_URL_ENDPOINT',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT),
  mongodbUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET,

  imagekit: {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  },

  nodeEnv: process.env.NODE_ENV || 'development',
};