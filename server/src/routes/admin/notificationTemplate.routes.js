import express from "express";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../controllers/adminNotificationController.js";
import { authenticate } from "../../middleware/authenticate.middleware.js";

const router = express.Router();

router.get("/", authenticate, listTemplates);
router.post("/", authenticate, createTemplate);
router.patch("/:id", authenticate, updateTemplate);
router.delete("/:id", authenticate, deleteTemplate);

export default router;

