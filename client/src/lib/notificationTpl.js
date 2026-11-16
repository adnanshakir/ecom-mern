export const VAR_META = {
  discount:    { label: "Discount %",     placeholder: "50",             sample: "50" },
  hours:       { label: "Hours left",     placeholder: "6",              sample: "6" },
  event:       { label: "Sale name",      placeholder: "Diwali Sale",    sample: "Mega Sale" },
  category:    { label: "Category",       placeholder: "Shirts",         sample: "all categories" },
  endDate:     { label: "End date",       placeholder: "Sunday",         sample: "Sunday" },
  amount:      { label: "Minimum amount", placeholder: "999",            sample: "999" },
  festival:    { label: "Festival",       placeholder: "Diwali",         sample: "Diwali" },
  code:        { label: "Coupon code",    placeholder: "FIBIO50",        sample: "FIBIO50" },
  tagline:     { label: "Tagline",        placeholder: "Wear your story", sample: "Wear your story" },
  product:     { label: "Product name",   placeholder: "Denim Jacket",   sample: "Denim Jacket" },
  orderNumber: { label: "Order number",   placeholder: "ORD-1001",       sample: "ORD-1001" },
};

const humanize = (k) =>
  k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

export const varLabel = (k) => VAR_META[k]?.label || humanize(k);
export const varPlaceholder = (k) => (VAR_META[k]?.placeholder ? `e.g. ${VAR_META[k].placeholder}` : "");
export const varSample = (k) => VAR_META[k]?.sample || humanize(k);

export const extractVars = (...tpls) =>
  [...new Set(tpls.flatMap((t) => [...(t || "").matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])))];

// mode: "strict" keeps {{x}} when empty (used for the final text, blocks sending),
//       "label" shows [Label] (live preview), "sample" shows example values (template cards)
export const fillTpl = (tpl, vars = {}, mode = "strict") =>
  (tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const hasProp = Boolean(vars && Object.prototype.hasOwnProperty.call(vars, k));
    const rawVal = hasProp ? vars[k] : undefined;
    const v = (typeof rawVal === "string" ? rawVal : rawVal != null ? String(rawVal) : "").trim();
    if (v) return v;
    if (mode === "sample") return varSample(k);
    if (mode === "label") return `[${varLabel(k)}]`;
    return `{{${k}}}`;
  });

export const hasPlaceholders = (...texts) => texts.some((t) => /\{\{/.test(t || ""));

export const TYPE_LABELS = {
  sale: "Sale", flash_sale: "Flash sale", tagline: "Tagline", free_shipping: "Free shipping",
  new_arrival: "New arrivals", festive: "Festive", coupon: "Coupon", win_back: "Win back", custom: "Custom",
};
export const CHANNEL_LABELS = { app: "App", web: "Website", both: "App + Website" };
export const SCREEN_LABELS = { home: "Home", product: "A product", category: "A category", orders: "My orders", custom: "Custom link" };
