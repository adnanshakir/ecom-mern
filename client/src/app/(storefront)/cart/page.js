import { CartView } from "@/components/storefront/cart/CartView";

export const metadata = {
  title: "Shopping Cart | Fibio Wholesale",
  description: "View items in your shopping cart and proceed to bulk checkout.",
};

export default function CartPage() {
  return <CartView />;
}
