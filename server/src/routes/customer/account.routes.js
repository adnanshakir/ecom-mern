import express from "express";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { deleteMyAccount } from "../../controllers/customer/account.controller.js";
import { deleteAccountSchema } from "../../validations/customer/account.validation.js";

const router = express.Router();

/**
 * @route   DELETE /api/customers/me
 * @desc    Delete the authenticated customer's account after phone OTP verification
 * @access  Private (authenticateCustomer)
 */
router.delete("/me", authenticateCustomer, validate(deleteAccountSchema), deleteMyAccount);

export default router;
