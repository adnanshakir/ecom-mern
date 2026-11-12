"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Loader2, MapPin, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/hooks/storefront/useCart";
import { clearCartState } from "@/redux/slices/cartSlice";
import {
  createPaymentOrderRequest,
  reconcilePaymentRequest,
  verifyPaymentRequest,
} from "@/services/storefront/payments";
import { getCustomerProfileRequest, updateCustomerProfileRequest } from "@/services/storefront/customerAuth";
import { formatPrice } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const RECONCILIATION_STORAGE_KEY = "fibio:pending-reconciliation";
const RECONCILIATION_POLL_MS = 4000;
const DELIVERY_CHARGE = 100;
const EMPTY_ADDRESS = {
  label: "Home",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  phone: "",
};

const ADDRESS_FIELD_CONFIG = [
  { key: "label", placeholder: "Label (e.g. Home, Office)" },
  { key: "fullName", placeholder: "Full name *" },
  { key: "line1", placeholder: "House / flat / street *" },
  { key: "line2", placeholder: "Landmark / area (optional)" },
  { key: "city", placeholder: "City *" },
  { key: "state", placeholder: "State" },
  { key: "postalCode", placeholder: "Postal code *" },
  { key: "phone", placeholder: "Phone" },
];

const getDefaultFullName = (currentUser) => {
  const candidate = currentUser?.name?.trim();
  if (!candidate) return "";
  if (candidate === currentUser?.phoneNumber || candidate === currentUser?.phone) return "";
  if (/^\+?91?\d{10}$/.test(candidate.replace(/\s/g, ""))) return "";
  return candidate;
};

/** Load the Razorpay checkout constructor once it is available in the browser. */
const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Unable to load payment gateway"));
    document.body.appendChild(script);
  });

export function CheckoutView() {
  const router = useRouter();
  const dispatch = useDispatch();
  const authStatus = useSelector((state) => state.customerAuth.status);
  const authReady = useSelector((state) => state.customerAuth.authReady);
  const user = useSelector((state) => state.customerAuth.user);
  const { items, status } = useCart();
  const [directCheckoutItem, setDirectCheckoutItem] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [paymentReconciliation, setPaymentReconciliation] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const idempotencyKeyRef = useRef("");
  const reconcilingRef = useRef(false);

  const persistPendingReconciliation = (recoveryState) => {
    if (!recoveryState) {
      sessionStorage.removeItem(RECONCILIATION_STORAGE_KEY);
      setPaymentReconciliation(null);
      return;
    }
    const payload = {
      razorpayOrderId: recoveryState.razorpayOrderId,
      razorpayPaymentId: recoveryState.razorpayPaymentId,
      status: recoveryState.status || "pending",
      idempotencyKey: recoveryState.idempotencyKey || idempotencyKeyRef.current || "",
    };
    sessionStorage.setItem(RECONCILIATION_STORAGE_KEY, JSON.stringify(payload));
    setPaymentReconciliation(payload);
  };

  useEffect(() => {
    const storedReconciliation = sessionStorage.getItem(RECONCILIATION_STORAGE_KEY);
    if (storedReconciliation) {
      try {
        const parsed = JSON.parse(storedReconciliation);
        if (parsed?.razorpayOrderId && parsed?.razorpayPaymentId) {
          if (parsed.idempotencyKey) {
            idempotencyKeyRef.current = parsed.idempotencyKey;
          }
          queueMicrotask(() => setPaymentReconciliation(parsed));
        } else {
          sessionStorage.removeItem(RECONCILIATION_STORAGE_KEY);
        }
      } catch {
        sessionStorage.removeItem(RECONCILIATION_STORAGE_KEY);
      }
    }

    if (new URLSearchParams(window.location.search).get("buyNow") !== "1") return;
    const storedItem = sessionStorage.getItem("fibio:buy-now");
    if (!storedItem) return;
    try {
      const parsedItem = JSON.parse(storedItem);
      if (parsedItem?.variant?._id && Number.isInteger(parsedItem.quantity) && parsedItem.quantity > 0) {
        queueMicrotask(() => setDirectCheckoutItem(parsedItem));
      }
    } catch {
      sessionStorage.removeItem("fibio:buy-now");
    }
  }, []);

  useEffect(() => {
    if (authReady && authStatus !== "authenticated") {
      const params = new URLSearchParams(window.location.search);
      const returnPath =
        params.get("buyNow") === "1" ? "/checkout?buyNow=1" : "/checkout";
      router.replace(`/sign-in?from=${encodeURIComponent(returnPath)}`);
    }
  }, [authReady, authStatus, router]);

  useEffect(() => {
    if (!authReady || authStatus !== "authenticated") return;
    getCustomerProfileRequest()
      .then(({ data }) => {
        const savedAddresses = data.data?.addresses || [];
        setAddresses(savedAddresses);
        setSelectedAddressId(savedAddresses.find((address) => address.isDefault)?._id || savedAddresses[0]?._id || "");
      })
      .catch(() => toast.error("Unable to load saved addresses"))
      .finally(() => setAddressLoading(false));
  }, [authReady, authStatus]);

  const checkoutItems = directCheckoutItem ? [directCheckoutItem] : items;
  const checkoutCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = checkoutItems.reduce((sum, item) => {
    const price = item.variant?.salePrice ?? item.variant?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
  const total = subtotal + DELIVERY_CHARGE;
  const cartSignature = checkoutItems.map((item) => `${item.variant?._id || ""}:${item.quantity}`).join("|");

  useEffect(() => {
    if (!paymentReconciliation && !sessionStorage.getItem(RECONCILIATION_STORAGE_KEY)) {
      idempotencyKeyRef.current = "";
    }
  }, [selectedAddressId, cartSignature, paymentReconciliation]);

  const applyPaymentOutcome = ({
    outcomeStatus,
    orderId,
    message,
    razorpayOrderId,
    razorpayPaymentId,
    fallbackErrorMessage,
    notifyPending = true,
  }) => {
    if (outcomeStatus === "paid") {
      idempotencyKeyRef.current = "";
      persistPendingReconciliation(null);
      if (!directCheckoutItem) dispatch(clearCartState());
      sessionStorage.removeItem("fibio:buy-now");
      toast.success("Payment successful");
      router.replace(`/order?orderId=${orderId}`);
      return true;
    }
    if (outcomeStatus === "refunded") {
      idempotencyKeyRef.current = "";
      persistPendingReconciliation(null);
      toast.error(
        message || "An item went out of stock after checkout began. Your payment has been refunded."
      );
      return true;
    }
    if (outcomeStatus === "failed") {
      idempotencyKeyRef.current = "";
      persistPendingReconciliation(null);
      toast.error(fallbackErrorMessage || "Payment was unsuccessful. You can try again.");
      return true;
    }
    if (outcomeStatus === "refund_pending") {
      persistPendingReconciliation({
        razorpayOrderId,
        razorpayPaymentId,
        status: "refund_pending",
        idempotencyKey: idempotencyKeyRef.current,
      });
      if (notifyPending) {
        toast.error(
          message || "Item went out of stock after checkout; confirming your refund before allowing a new order."
        );
      }
      return false;
    }

    persistPendingReconciliation({
      razorpayOrderId,
      razorpayPaymentId,
      status: "pending",
      idempotencyKey: idempotencyKeyRef.current,
    });
    if (notifyPending) {
      toast.error("Payment is still being confirmed. Please do not retry yet.");
    }
    return false;
  };

  const runSingleReconciliation = async (targetReconciliation, { notifyPending = false } = {}) => {
    if (!targetReconciliation?.razorpayOrderId || !targetReconciliation?.razorpayPaymentId) return;
    if (reconcilingRef.current) return;
    reconcilingRef.current = true;
    setIsReconciling(true);
    try {
      const { data: reconciliation } = await reconcilePaymentRequest({
        razorpayOrderId: targetReconciliation.razorpayOrderId,
        razorpayPaymentId: targetReconciliation.razorpayPaymentId,
      });
      applyPaymentOutcome({
        outcomeStatus: reconciliation.data?.status,
        orderId: reconciliation.data?.orderId,
        message: reconciliation.message,
        razorpayOrderId: targetReconciliation.razorpayOrderId,
        razorpayPaymentId: targetReconciliation.razorpayPaymentId,
        notifyPending,
      });
    } catch {
      if (notifyPending) {
        toast.error("Still waiting for payment gateway confirmation.");
      }
    } finally {
      reconcilingRef.current = false;
      setIsReconciling(false);
    }
  };

  useEffect(() => {
    if (!authReady || authStatus !== "authenticated" || !paymentReconciliation) return;
    let cancelled = false;
    const immediateTimer = setTimeout(() => {
      if (!cancelled) {
        runSingleReconciliation(paymentReconciliation, { notifyPending: false });
      }
    }, 300);
    const interval = setInterval(() => {
      if (!cancelled) {
        runSingleReconciliation(paymentReconciliation, { notifyPending: false });
      }
    }, RECONCILIATION_POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(immediateTimer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authStatus, paymentReconciliation?.razorpayOrderId, paymentReconciliation?.razorpayPaymentId, paymentReconciliation?.status]);

  /** Save an address against the profile version currently displayed in this tab. */
  const saveAddress = async (event) => {
    event.preventDefault();
    const nextAddress = { ...addressForm };
    if (
      !nextAddress.fullName?.trim() ||
      !nextAddress.line1.trim() ||
      !nextAddress.city.trim() ||
      !nextAddress.postalCode.trim()
    ) {
      toast.error("Full name, house/street, city, and postal code are required");
      return;
    }

    const nextAddresses = nextAddress._id
      ? addresses.map((address) => (address._id === nextAddress._id ? nextAddress : address))
      : [...addresses, { ...nextAddress, isDefault: addresses.length === 0 }];

    try {
      const { data } = await updateCustomerProfileRequest({ addresses: nextAddresses });
      const saved = data.data.addresses || nextAddresses;
      setAddresses(saved);
      setSelectedAddressId(nextAddress._id || saved[saved.length - 1]?._id || "");
      setAddressForm(null);
      toast.success("Address saved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save address");
    }
  };

  /** Remove an address using the same optimistic profile-version guard as saves. */
  const removeAddress = async (addressId) => {
    try {
      const { data } = await updateCustomerProfileRequest({
        addresses: addresses.filter((address) => address._id !== addressId),
      });
      const saved = data.data.addresses || [];
      setAddresses(saved);
      setSelectedAddressId(saved[0]?._id || "");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove address");
    }
  };

  /** Load and validate the gateway before creating an order or opening checkout. */
  const pay = async () => {
    if (!selectedAddressId || paymentReconciliation) {
      if (paymentReconciliation) {
        toast.error(
          paymentReconciliation.status === "refund_pending"
            ? "Please wait while your refund is confirmed before starting a new checkout"
            : "Please wait while we confirm the previous payment"
        );
      }
      if (!selectedAddressId) toast.error("Select or add a delivery address first");
      return;
    }

    setIsPaying(true);
    try {
      const Razorpay = await loadRazorpay();
      if (typeof Razorpay !== "function") throw new Error("Payment gateway is unavailable");
      const checkoutItem = directCheckoutItem
        ? { variantId: directCheckoutItem.variant._id, quantity: directCheckoutItem.quantity }
        : undefined;
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `chk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      }
      const { data: orderResponse } = await createPaymentOrderRequest(
        selectedAddressId,
        checkoutItem,
        idempotencyKeyRef.current
      );
      const order = orderResponse.data;
      const selectedAddress = addresses.find((address) => address._id === selectedAddressId);
      const razorpay = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Fibio Wholesale",
        description: `${checkoutCount} item${checkoutCount === 1 ? "" : "s"}`,
        order_id: order.razorpayOrderId,
        prefill: { name: selectedAddress?.fullName || user?.name || "", email: user?.email || "" },
        theme: { color: "#033936" },
        handler: async (payment) => {
          try {
            const { data: verifyResponse } = await verifyPaymentRequest(payment);
            const verifiedStatus = verifyResponse.data?.status;
            applyPaymentOutcome({
              outcomeStatus: verifiedStatus,
              orderId: verifyResponse.data?.orderId || order.orderId,
              message: verifyResponse.message,
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
            });
          } catch (error) {
            persistPendingReconciliation({
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              status: "pending",
              idempotencyKey: idempotencyKeyRef.current,
            });
            reconcilingRef.current = true;
            try {
              const { data: reconciliation } = await reconcilePaymentRequest({
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
              });
              applyPaymentOutcome({
                outcomeStatus: reconciliation.data?.status,
                orderId: reconciliation.data?.orderId,
                message: reconciliation.message,
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
              });
            } catch (reconciliationError) {
              toast.error(
                reconciliationError.response?.data?.message ||
                  error.response?.data?.message ||
                  "Payment outcome is still being confirmed"
              );
            } finally {
              reconcilingRef.current = false;
            }
          } finally {
            setIsPaying(false);
          }
        },
        modal: { ondismiss: () => setIsPaying(false) },
      });
      razorpay.on("payment.failed", (response) => {
        setIsPaying(false);
        const paymentId = response.error?.metadata?.payment_id;
        const paymentOrderId = response.error?.metadata?.order_id || order.razorpayOrderId;
        if (!paymentId) {
          idempotencyKeyRef.current = "";
          persistPendingReconciliation(null);
          toast.error(response.error?.description || "Payment failed");
          return;
        }

        persistPendingReconciliation({
          razorpayOrderId: paymentOrderId,
          razorpayPaymentId: paymentId,
          status: "pending",
          idempotencyKey: idempotencyKeyRef.current,
        });
        reconcilingRef.current = true;
        reconcilePaymentRequest({
          razorpayOrderId: paymentOrderId,
          razorpayPaymentId: paymentId,
        })
          .then(({ data: reconciliation }) => {
            applyPaymentOutcome({
              outcomeStatus: reconciliation.data?.status,
              orderId: reconciliation.data?.orderId,
              message: reconciliation.message,
              razorpayOrderId: paymentOrderId,
              razorpayPaymentId: paymentId,
              fallbackErrorMessage: response.error?.description || "Payment failed",
            });
          })
          .catch(() => {
            toast.error("Payment outcome is still being confirmed. Please do not retry yet.");
          })
          .finally(() => {
            reconcilingRef.current = false;
          });
      });
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to start payment");
      setIsPaying(false);
    }
  };

  if (!authReady || authStatus === "loading" || status === "loading") {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="size-5 animate-spin text-[#033936]" />
      </div>
    );
  }
  if (authStatus !== "authenticated") return null;
  if (!checkoutItems.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-medium">Your cart is empty.</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Continue shopping
        </Button>
      </div>
    );
  }

  const openNewAddressForm = () => {
    setAddressForm({ ...EMPTY_ADDRESS, fullName: getDefaultFullName(user) });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/cart");
            }
          }}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Delivery address</h1>
            <button
              className="inline-flex items-center gap-1 text-sm text-[#033936]"
              onClick={openNewAddressForm}
            >
              <Plus className="size-4" /> Add address
            </button>
          </div>
          {addressLoading ? (
            <Loader2 className="mt-8 size-5 animate-spin text-[#033936]" />
          ) : !addresses.length ? (
            <button
              className="mt-6 flex w-full items-center gap-3 rounded-lg border border-dashed p-4 text-left text-sm"
              onClick={openNewAddressForm}
            >
              <MapPin className="size-5 text-[#033936]" /> Add a delivery address
            </button>
          ) : (
            <div className="mt-5 grid gap-3">
              {addresses.map((address) => (
                <div
                  key={address._id}
                  className={`rounded-lg border p-4 ${selectedAddressId === address._id ? "border-[#033936] ring-1 ring-[#033936]" : ""}`}
                >
                  <label className="flex cursor-pointer gap-3">
                    <input
                      type="radio"
                      checked={selectedAddressId === address._id}
                      onChange={() => setSelectedAddressId(address._id)}
                    />
                    <span className="min-w-0 text-sm">
                      <strong>{address.label || "Address"}</strong>
                      {address.fullName && (
                        <span className="mt-0.5 block font-medium text-foreground">
                          {address.fullName}
                        </span>
                      )}
                      <span className="mt-1 block text-muted-foreground">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} -{" "}
                        {address.postalCode}
                      </span>
                      <span className="block text-muted-foreground">
                        {address.country} · {address.phone}
                      </span>
                    </span>
                  </label>
                  <div className="mt-3 flex gap-3 pl-6 text-xs">
                    <button
                      className="inline-flex items-center gap-1 text-[#033936]"
                      onClick={() =>
                        setAddressForm({
                          ...EMPTY_ADDRESS,
                          ...address,
                          fullName: address.fullName || getDefaultFullName(user),
                        })
                      }
                    >
                      <Pencil className="size-3" /> Edit
                    </button>
                    <button
                      className="inline-flex items-center gap-1 text-destructive"
                      onClick={() => removeAddress(address._id)}
                    >
                      <Trash2 className="size-3" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {addressForm && (
            <form onSubmit={saveAddress} className="mt-5 grid gap-3 rounded-lg border bg-muted/20 p-4">
              {ADDRESS_FIELD_CONFIG.map(({ key, placeholder }) => (
                <input
                  key={key}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  placeholder={placeholder}
                  value={addressForm[key] || ""}
                  onChange={(event) => setAddressForm({ ...addressForm, [key]: event.target.value })}
                />
              ))}
              <div className="flex gap-2">
                <Button type="submit">Save address</Button>
                <Button type="button" variant="outline" onClick={() => setAddressForm(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="h-fit rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <div className="mt-6 grid gap-3 border-b pb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {checkoutCount} item{checkoutCount === 1 ? "" : "s"}
              </span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>{formatPrice(DELIVERY_CHARGE)}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {paymentReconciliation && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
              <p className="font-medium text-foreground">
                {paymentReconciliation.status === "refund_pending"
                  ? "Refund confirmation in progress"
                  : "Confirming payment status…"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {paymentReconciliation.status === "refund_pending"
                  ? "An item went out of stock after checkout. Please wait for refund confirmation before placing a new order."
                  : "We are checking with the payment gateway. Do not retry payment yet."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                disabled={isReconciling}
                onClick={() => runSingleReconciliation(paymentReconciliation, { notifyPending: true })}
              >
                {isReconciling ? (
                  <>
                    <Loader2 className="mr-1.5 size-3 animate-spin" />
                    Checking…
                  </>
                ) : (
                  "Check status now"
                )}
              </Button>
            </div>
          )}
          <Button
            className="mt-6 w-full bg-[#033936] text-white hover:bg-[#022826]"
            size="lg"
            onClick={pay}
            disabled={isPaying || addressLoading || Boolean(paymentReconciliation)}
          >
            {isPaying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Opening payment…
              </>
            ) : paymentReconciliation ? (
              "Reconciling previous checkout…"
            ) : (
              "Pay securely"
            )}
          </Button>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" />
            Payments secured by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}
