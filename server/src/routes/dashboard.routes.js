import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";

const router = express.Router();

router.get("/stats", authenticate, getDashboardStats);

export default router;