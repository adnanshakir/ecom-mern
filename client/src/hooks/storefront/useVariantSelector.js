"use client";

import { useState, useMemo, useEffect } from "react";

export function useVariantSelector(product) {
  const variants = product?.variants || [];

  // Dynamically derive optionTypes if product.optionTypes is empty/missing
  const optionTypes = useMemo(() => {
    if (product?.optionTypes?.length > 0) return product.optionTypes;

    const map = new Map();
    (variants || []).forEach((v) => {
      (v.options || []).forEach((o) => {
        if (o.name && o.value) {
          if (!map.has(o.name)) map.set(o.name, new Set());
          map.get(o.name).add(o.value);
        }
      });
    });

    return Array.from(map.entries()).map(([name, valuesSet]) => ({
      name,
      values: Array.from(valuesSet),
    }));
  }, [product?.optionTypes, variants]);

  const [selectedOptions, setSelectedOptions] = useState({});

  // Default to the first variant's exact combination once the product loads.
  useEffect(() => {
    if (variants.length > 0 && Object.keys(selectedOptions).length === 0) {
      const initial = {};
      (variants[0].options || []).forEach((o) => {
        initial[o.name] = o.value;
      });
      setSelectedOptions(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants.length]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    if (optionTypes.length === 0) return variants[0];

    return (
      variants.find((v) =>
        optionTypes.every((ot) => {
          const match = v.options?.find((o) => o.name === ot.name);
          return match?.value === selectedOptions[ot.name];
        })
      ) || variants[0]
    );
  }, [variants, optionTypes, selectedOptions]);

  const setOption = (name, value) => {
    setSelectedOptions((prev) => ({ ...prev, [name]: value }));
  };

  return { optionTypes, selectedOptions, setOption, selectedVariant };
}