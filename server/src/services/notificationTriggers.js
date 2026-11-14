import Wishlist from "../models/customer/wishlist.model.js";
import { sendTemplateToCustomer } from "./notificationService.js";

export async function notifyRestock(product) {
  const wishlists = await Wishlist.find({ products: product._id }).select("customer").lean();
  await Promise.allSettled(
    wishlists.map((w) =>
      sendTemplateToCustomer("restock", w.customer, {
        product: product.name,
        link: `/products/${product.slug}`,
      })
    )
  );
}

export default { notifyRestock };

