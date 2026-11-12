import ApiError from "./apiError.js";

const RAZORPAY_TIMEOUT_MS = Number(process.env.RAZORPAY_TIMEOUT_MS) || 10_000;

const getRazorpayAuthHeader = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) {
    throw new ApiError(503, "Payment gateway is not configured");
  }
  return `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;
};

const razorpayFetch = async (
  url,
  options = {},
  fallbackErrorMessage = "Payment gateway request failed"
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RAZORPAY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
    if (!response.ok) {
      throw new ApiError(502, fallbackErrorMessage);
    }
    return await response.json();
  } catch (error) {
    if (
      error?.name === "AbortError" ||
      error?.name === "TimeoutError" ||
      controller.signal.aborted
    ) {
      throw new ApiError(504, "Payment gateway request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const createRazorpayOrder = async (amount, receipt) =>
  razorpayFetch(
    "https://api.razorpay.com/v1/orders",
    {
      method: "POST",
      headers: {
        Authorization: getRazorpayAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency: "INR", receipt }),
    },
    "Unable to create payment order"
  );

export const fetchRazorpayPayment = async (razorpayPaymentId) =>
  razorpayFetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`,
    {
      headers: {
        Authorization: getRazorpayAuthHeader(),
      },
    },
    "Unable to verify payment status"
  );

export const fetchRazorpayRefunds = async (razorpayPaymentId) =>
  razorpayFetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}/refunds`,
    {
      headers: {
        Authorization: getRazorpayAuthHeader(),
      },
    },
    "Unable to fetch payment refunds"
  );

export const createRazorpayRefund = async (razorpayPaymentId, amount, notes = {}) => {
  const payload = { notes };
  if (Number.isInteger(amount) && amount > 0) {
    payload.amount = amount;
  }

  return razorpayFetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: getRazorpayAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Unable to initiate payment refund"
  );
};
