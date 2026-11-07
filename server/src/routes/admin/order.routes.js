import express from "express";
import {
  getAdminOrder,
  getAdminOrderStats,
  getAdminOrders,
  markAdminOrderSeen,
  updateAdminOrderStatus,
} from "../../controllers/admin/order.controller.js";
import { authenticate } from "../../middleware/authenticate.middleware.js";

const router = express.Router();
router.use(authenticate);
router.get("/stats", getAdminOrderStats);
router.get("/", getAdminOrders);
router.get("/:id", getAdminOrder);
router.patch("/:id/status", updateAdminOrderStatus);
router.patch("/:id/seen", markAdminOrderSeen);

export default router;
