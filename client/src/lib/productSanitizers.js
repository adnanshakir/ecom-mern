/**
 * Shared product payload sanitizers to deduplicate transformation logic
 * between useCreateProduct, useEditProduct, and useProductVariants.
 */

export function cleanOptionTypes(optionTypes) {
  if (!optionTypes?.length) return undefined;
  const filtered = optionTypes.filter((ot) => ot?.name && ot.values?.length);
  if (!filtered.length) return undefined;
  return filtered.map((ot) => ({
    name: ot.name,
    values: ot.values.map((v) => (typeof v === "object" ? v.value : v)).filter(Boolean),
  }));
}

export function cleanVariantPayload(variant) {
  const cleanOptions = variant.options?.filter((o) => o.name && o.value);
  return {
    ...variant,
    salePrice: variant.salePrice || undefined,
    costPrice: variant.costPrice || undefined,
    barcode: variant.barcode || undefined,
    weight: variant.weight?.value
      ? { value: variant.weight.value, unit: variant.weight.unit || "g" }
      : undefined,
    images: variant.images?.length ? variant.images : undefined,
    options: cleanOptions?.length ? cleanOptions : undefined,
  };
}
