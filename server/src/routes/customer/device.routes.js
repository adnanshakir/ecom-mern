import express from "express";
import { registerDevice, unregisterDevice } from "../../controllers/customer/deviceToken.controller.js";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";

const router = express.Router();

router.post("/", authenticateCustomer, registerDevice);
router.delete("/", authenticateCustomer, unregisterDevice);
router.post("/devices", authenticateCustomer, registerDevice);
router.delete("/devices", authenticateCustomer, unregisterDevice);

export default router;

