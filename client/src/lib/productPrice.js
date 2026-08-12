// Computes a display price from a trimmed variant list — the lowest
// effective price (salePrice if set, else price) across all variants.
export function getDisplayPrice(variants) {
  if (!variants?.length) return null;
  const prices = variants.map((v) => v.salePrice || v.price);
  return Math.min(...prices);
}

export function isInStock(variants) {
  return variants?.some((v) => v.stock > 0) ?? false;
}