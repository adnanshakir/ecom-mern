import customerApi from "@/services/storefront/customerAxios";

export const createPaymentOrderRequest = (addressId, checkoutItem) =>
  customerApi.post("/customers/payments/orders", { addressId, ...checkoutItem });

export const getCustomerOrdersRequest = () => customerApi.get("/customers/payments/orders");

export const verifyPaymentRequest = (payment) => customerApi.post("/customers/payments/verify", payment);

export const reconcilePaymentRequest = (payment) => customerApi.post("/customers/payments/reconcile", payment);
