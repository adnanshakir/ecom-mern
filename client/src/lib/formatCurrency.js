// Formats numeric price into Indian Rupees (INR) format (e.g. 499 -> "₹499", 12500 -> "₹12,500")
export function formatPrice(amount) {
  if (amount == null || amount === "" || isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function formatCurrency(amount) {
  return formatPrice(amount);
}
