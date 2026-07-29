import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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

app.use(notFound);
app.use(errorHandler);

export default app;