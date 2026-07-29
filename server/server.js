import app from './app.js';
import app from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/config.js';

const startServer = async () => {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`Server running on - ${config.port}`);
  });
};

startServer();