import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { createCustomerAuth } from "./src/config/customerAuth.js";
import { config } from "./src/config/config.js";
import { seedNotificationTemplates } from "./src/seed/notificationTemplates.js";
import { startNotificationScheduler } from "./src/services/notificationService.js";

const startServer = async () => {
  await connectDB();
  await createCustomerAuth();
  await seedNotificationTemplates();
  startNotificationScheduler();

  app.listen(config.port, () => {
    console.log(`Server running on - ${config.port}`);
  });
};

startServer();