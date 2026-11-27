import express from "express";
import {
  resolveImage,
  getAudienceCount,
  createNotification,
  cancelNotification,
  endTicker,
  listNotifications,
} from "../../controllers/adminNotificationController.js";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";

const router = express.Router();

router.use(authenticate, authorize("super_admin", "admin"));

router.get("/", listNotifications);
router.post("/", createNotification);
router.post("/audience-count", getAudienceCount);
router.post("/resolve-image", resolveImage);
router.patch("/:id/cancel", cancelNotification);
router.patch("/:id/end-ticker", endTicker);

export default router;
