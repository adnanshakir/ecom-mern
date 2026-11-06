import express from "express";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";
import {
  createPaymentOrder,
  getCustomerOrders,
  reconcilePayment,
  verifyPayment,
} from "../../controllers/customer/payment.controller.js";

const router = express.Router();

router.post("/orders", authenticateCustomer, createPaymentOrder);
router.get("/orders", authenticateCustomer, getCustomerOrders);
router.post("/verify", authenticateCustomer, verifyPayment);
router.post("/reconcile", authenticateCustomer, reconcilePayment);

export default router;
