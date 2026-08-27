import { OrdersView } from "@/components/storefront/account/OrdersView";

export const metadata = {
  title: "Your Orders | Fibio Wholesale",
  description: "Track, manage, and view your wholesale order history and shipment status.",
  robots: { index: false, follow: false },
};

export default function AccountOrdersPage() {
  return <OrdersView />;
}
