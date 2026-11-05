import customerApi from "@/services/storefront/customerAxios";

export const createPaymentOrderRequest = (addressId) =>
  customerApi.post("/customers/payments/orders", { addressId });

export const getCustomerOrdersRequest = () => customerApi.get("/customers/payments/orders");

export const verifyPaymentRequest = (payment) => customerApi.post("/customers/payments/verify", payment);
