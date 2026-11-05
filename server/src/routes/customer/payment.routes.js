import express from "express";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";
import {
  createPaymentOrder,
  getCustomerOrders,
  verifyPayment,
} from "../../controllers/customer/payment.controller.js";

const router = express.Router();

router.post("/orders", authenticateCustomer, createPaymentOrder);
router.get("/orders", authenticateCustomer, getCustomerOrders);
router.post("/verify", authenticateCustomer, verifyPayment);

export default router;
