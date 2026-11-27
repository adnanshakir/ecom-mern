import express from "express";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../controllers/adminNotificationController.js";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";

const router = express.Router();

router.use(authenticate, authorize("super_admin", "admin"));

router.get("/", listTemplates);
router.post("/", createTemplate);
router.patch("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

export default router;
