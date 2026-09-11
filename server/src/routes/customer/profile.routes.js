import express from "express";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";
import { getCustomerProfile, updateCustomerProfile } from "../../controllers/customer/profile.controller.js";

const router = express.Router();

router.use(authenticateCustomer);

router.get("/", getCustomerProfile);
router.put("/", updateCustomerProfile);

export default router;
