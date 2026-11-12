import mongoose from 'mongoose';
import { config } from './config.js';

const LEGACY_ORDER_INDEXES = ['razorpayOrderId_1', 'razorpayPaymentId_1', 'status_1'];

/**
 * Drop stale top-level Order indexes left behind by an earlier schema version
 * where payment fields were stored at the root of Order documents.
 */
export const cleanupLegacyOrderIndexes = async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  const collections = await db.listCollections({ name: 'orders' }).toArray();
  if (!collections.length) return;

  const ordersCollection = db.collection('orders');
  const indexes = await ordersCollection.indexes();
  for (const indexName of LEGACY_ORDER_INDEXES) {
    if (indexes.some((idx) => idx.name === indexName)) {
      await ordersCollection.dropIndex(indexName);
    }
  }
};

export const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    await cleanupLegacyOrderIndexes();

    console.log("MongoDB Connected");
  } catch (error) {
    console.error('MongoDB Connection Failed');
    console.error(error.message);

    process.exit(1);
  }
};