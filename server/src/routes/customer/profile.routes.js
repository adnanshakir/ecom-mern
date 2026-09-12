import express from "express";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";
import { getCustomerProfile, updateCustomerProfile } from "../../controllers/customer/profile.controller.js";

const router = express.Router();

router.use(authenticateCustomer);

/**
 * @route   GET /api/customers/profile
 * @desc    Get current customer profile details & addresses
 * @access  Private (authenticateCustomer)
 */
router.get("/", getCustomerProfile);

/**
 * @route   PUT /api/customers/profile
 * @desc    Update customer profile details (name, email, address)
 * @access  Private (authenticateCustomer)
 */
router.put("/", updateCustomerProfile);

export default router;
