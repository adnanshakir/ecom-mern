import NotificationTemplate from "../models/NotificationTemplate.js";

const TEMPLATES = [
  { key: "sale", name: "Sale", type: "sale", channel: "both", titleTpl: "🔥 {{event}} is live!", bodyTpl: "Up to {{discount}}% off on {{category}}. Ends {{endDate}}." },
  { key: "flash_sale", name: "Flash Sale", type: "flash_sale", channel: "both", titleTpl: "⚡ Flash Sale: {{discount}}% off", bodyTpl: "Only for the next {{hours}} hours. Grab it now!" },
  { key: "tagline", name: "Store Tagline (ticker)", type: "tagline", channel: "web", titleTpl: "{{tagline}}", bodyTpl: "" },
  { key: "free_shipping", name: "Free Shipping", type: "free_shipping", channel: "both", titleTpl: "🚚 Free shipping on orders above ₹{{amount}}", bodyTpl: "" },
  { key: "new_arrival", name: "New Arrivals", type: "new_arrival", channel: "both", titleTpl: "✨ New arrivals just dropped", bodyTpl: "Check out the latest in {{category}}." },
  { key: "festive", name: "Festive Greeting", type: "festive", channel: "both", titleTpl: "🎊 Happy {{festival}}!", bodyTpl: "Celebrate with {{discount}}% off sitewide. Use code {{code}}." },
  { key: "coupon", name: "Coupon Code", type: "coupon", channel: "both", titleTpl: "🎟️ Use code {{code}}", bodyTpl: "Get {{discount}}% off. Valid till {{endDate}}." },
  { key: "win_back", name: "We Miss You", type: "win_back", channel: "app", titleTpl: "We miss you 💛", bodyTpl: "Come back and get {{discount}}% off with code {{code}}." },
  // auto-fired by backend
  { key: "restock", name: "Wishlist Item Back In Stock", type: "custom", channel: "app", auto: true, titleTpl: "🎉 {{product}} is back in stock!", bodyTpl: "It's in your wishlist. Grab it before it's gone again." },
  { key: "order_shipped", name: "Order Shipped", type: "custom", channel: "app", auto: true, titleTpl: "📦 Your order is on the way", bodyTpl: "Order {{orderNumber}} has been shipped." },
  { key: "order_delivered", name: "Order Delivered", type: "custom", channel: "app", auto: true, titleTpl: "✅ Order delivered", bodyTpl: "Order {{orderNumber}} was delivered. Enjoy!" },
];

export async function seedNotificationTemplates() {
  for (const t of TEMPLATES) {
    await NotificationTemplate.updateOne({ key: t.key }, { $setOnInsert: { ...t, isSystem: true } }, { upsert: true });
  }
}

export default { seedNotificationTemplates };

