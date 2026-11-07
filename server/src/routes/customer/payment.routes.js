import express from "express";
import {
  createPaymentOrder,
  getCustomerOrders,
  reconcilePayment,
  verifyPayment,
} from "../../controllers/customer/payment.controller.js";
import { authenticateCustomer } from "../../middleware/authenticateCustomer.middleware.js";

const router = express.Router();
router.use(authenticateCustomer);
router.post("/orders", createPaymentOrder);
router.get("/orders", getCustomerOrders);
router.post("/verify", verifyPayment);
router.post("/reconcile", reconcilePayment);

export default router;
