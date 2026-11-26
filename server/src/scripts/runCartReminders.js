// Manual test helper, do not commit to production use.
import "../config/config.js";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { runCartReminders } from "../services/notificationService.js";

async function main() {
  await connectDB();
  try {
    await runCartReminders();
  } finally {
    await mongoose.connection.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
