import ApiError from "./apiError.js";

const getRazorpayAuthHeader = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) {
    throw new ApiError(503, "Payment gateway is not configured");
  }
  return `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;
};

export const createRazorpayOrder = async (amount, receipt) => {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: getRazorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "INR", receipt }),
  });
  if (!response.ok) {
    throw new ApiError(502, "Unable to create payment order");
  }
  return response.json();
};

export const fetchRazorpayPayment = async (razorpayPaymentId) => {
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`,
    {
      headers: {
        Authorization: getRazorpayAuthHeader(),
      },
    }
  );
  if (!response.ok) {
    throw new ApiError(502, "Unable to verify payment status");
  }
  return response.json();
};

export const createRazorpayRefund = async (razorpayPaymentId, amount, notes = {}) => {
  const payload = { notes };
  if (Number.isInteger(amount) && amount > 0) {
    payload.amount = amount;
  }

  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: getRazorpayAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    throw new ApiError(502, "Unable to initiate payment refund");
  }
  return response.json();
};

