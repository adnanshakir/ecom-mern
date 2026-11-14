import express from "express";
import {
  createNotification,
  cancelNotification,
  endTicker,
  listNotifications,
} from "../../controllers/adminNotificationController.js";
import { authenticate } from "../../middleware/authenticate.middleware.js";

const router = express.Router();

router.get("/", authenticate, listNotifications);
router.post("/", authenticate, createNotification);
router.patch("/:id/cancel", authenticate, cancelNotification);
router.patch("/:id/end-ticker", authenticate, endTicker);

export default router;

