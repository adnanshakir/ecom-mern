/**
 * Normalizes Indian phone numbers to canonical E.164 (+91XXXXXXXXXX) format.
 * Accepts bare 10-digit numbers, numbers with 91 prefix, or +91 prefix.
 * If the input is not a valid Indian 10-digit number, returns the original input unchanged.
 */
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return phone;
  const digits = phone.replace(/\D/g, "");
  let localDigits = "";
  if (digits.length === 10) {
    localDigits = digits;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    localDigits = digits.slice(2);
  } else {
    return phone;
  }
  return /^[6-9]\d{9}$/.test(localDigits) ? `+91${localDigits}` : phone;
}
