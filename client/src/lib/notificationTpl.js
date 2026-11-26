export const VAR_META = {
  discount:    { label: "Discount %",     placeholder: "50",              sample: "50" },
  hours:       { label: "Hours left",     placeholder: "6",               sample: "6" },
  event:       { label: "Sale name",      placeholder: "Diwali Sale",     sample: "Mega Sale" },
  category:    { label: "Category",       placeholder: "Shirts",          sample: "all categories" },
  endDate:     { label: "End date",       placeholder: "Sunday",          sample: "Sunday" },
  amount:      { label: "Minimum amount", placeholder: "999",             sample: "999" },
  festival:    { label: "Festival",       placeholder: "Diwali",          sample: "Diwali" },
  code:        { label: "Coupon code",    placeholder: "FIBIO50",         sample: "FIBIO50" },
  tagline:     { label: "Tagline",        placeholder: "Wear your story", sample: "Wear your story" },
  name:        { label: "Customer name",  placeholder: "Aisha",           sample: "Aisha" },
  product:     { label: "Product name",   placeholder: "Denim Jacket",    sample: "Denim Jacket" },
  count:       { label: "Item count",     placeholder: "3",               sample: "3" },
  orderNumber: { label: "Order number",   placeholder: "ORD-1001",        sample: "ORD-1001" },
};

export const AUTO_VARS = ["name", "product", "count"];
export const AUTO_VAR_SAMPLES = { name: "Aisha", product: "Denim Jacket", count: "3" };

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

export const hasNonAutoPlaceholders = (...texts) =>
  texts.some((t) =>
    [...(t || "").matchAll(/\{\{(\w*)\}\}/g)].some((m) => !AUTO_VARS.includes(m[1]))
  );

export const hasAutoPlaceholders = (...texts) =>
  texts.some((t) =>
    [...(t || "").matchAll(/\{\{(\w+)\}\}/g)].some((m) => AUTO_VARS.includes(m[1]))
  );

export const SEGMENT_OPTIONS = [
  { value: "cart", label: "Has items in cart" },
  { value: "wishlist", label: "Has items in wishlist" },
  { value: "category", label: "Interested in a category" },
  { value: "inactive_30d", label: "Not active for 30 days" },
  { value: "never_ordered", label: "Never ordered" },
  { value: "bought_before", label: "Ordered before" },
];

export const SEGMENT_LABELS = Object.fromEntries(SEGMENT_OPTIONS.map((o) => [o.value, o.label]));
export const PERSONAL_IMAGE_SEGMENTS = ["cart", "wishlist", "category"];

export const AUTO_TEMPLATE_DESCRIPTIONS = {
  cart_reminder: "Sent 24–72h after items are left in cart",
  price_drop: "Sent when a product in someone's cart or wishlist gets cheaper",
};

export const TYPE_LABELS = {
  sale: "Sale", flash_sale: "Flash sale", tagline: "Tagline", free_shipping: "Free shipping",
  new_arrival: "New arrivals", festive: "Festive", coupon: "Coupon", win_back: "Win back", custom: "Custom",
};
export const CHANNEL_LABELS = { app: "App", web: "Website", both: "App + Website" };
export const SCREEN_LABELS = { home: "Home", product: "A product", category: "A category", orders: "My orders", custom: "Custom link" };
