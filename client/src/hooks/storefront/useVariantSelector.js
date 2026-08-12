"use client";

import { useState, useMemo, useEffect } from "react";

export function useVariantSelector(product) {
  const variants = product?.variants || [];
  const optionTypes = product?.optionTypes || [];

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
    if (optionTypes.length === 0) return variants[0]; // no options — only one variant possible

    return (
      variants.find((v) =>
        optionTypes.every((ot) => {
          const match = v.options?.find((o) => o.name === ot.name);
          return match?.value === selectedOptions[ot.name];
        })
      ) || null
    );
  }, [variants, optionTypes, selectedOptions]);

  const setOption = (name, value) => {
    setSelectedOptions((prev) => ({ ...prev, [name]: value }));
  };

  return { optionTypes, selectedOptions, setOption, selectedVariant };
}