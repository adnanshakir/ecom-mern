import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "test-secret-key-min-32-chars-long!";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-min-32-chars-long!";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
process.env.IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || "test_pub_key";
process.env.IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || "test_priv_key";
process.env.IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/test";
process.env.PORT = process.env.PORT || "5000";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/test";

let mongoServer;

export const connectTestDB = async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

export const closeTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

export const clearTestDB = async () => {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
};