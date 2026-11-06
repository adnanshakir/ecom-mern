import { OrdersView } from "@/components/storefront/account/OrdersView";

export const metadata = {
  title: "Your Orders | Fibio Wholesale",
  robots: { index: false, follow: false },
};

export default function OrderPage() {
  return <OrdersView />;
}
