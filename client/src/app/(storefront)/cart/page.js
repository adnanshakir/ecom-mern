import { CartView } from "@/components/storefront/cart/CartView";

export const metadata = {
  title: "Shopping Cart | Fibio Wholesale",
  description: "View items in your shopping cart and proceed to bulk checkout.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartView />;
}
