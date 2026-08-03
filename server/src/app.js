import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from "./routes/auth.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import imageRoutes from "./routes/image.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import userRoutes from "./routes/user.routes.js";
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Routes go here
app.use("/api/auth", authRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);


// Global error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;