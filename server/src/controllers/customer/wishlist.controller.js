import Wishlist from "../../models/customer/wishlist.model.js";
import Product from "../../models/admin/product.model.js";
import ApiError from "../../utils/apiError.js";

// ---------------- GET /api/customers/wishlist ----------------
export const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ customer: req.customer.id }).populate(
      "products",
      "name slug images brand category"
    );

    if (!wishlist) {
      // find-or-create: return empty wishlist instead of 404
      wishlist = await Wishlist.create({ customer: req.customer.id, products: [] });
    }

    res.status(200).json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
};

// ---------------- POST /api/customers/wishlist/items ----------------
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");
    if (product.status !== "active") throw new ApiError(400, "Product is not available");

    let wishlist = await Wishlist.findOne({ customer: req.customer.id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ customer: req.customer.id, products: [] });
    }

    const alreadyPresent = wishlist.products.some(
      (id) => id.toString() === productId
    );

    if (!alreadyPresent) {
      wishlist.products.push(productId);
      await wishlist.save();
    }

    const populated = await Wishlist.findById(wishlist._id).populate(
      "products",
      "name slug images brand category"
    );

    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ---------------- DELETE /api/customers/wishlist/items/:productId ----------------
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ customer: req.customer.id });
    if (!wishlist) throw new ApiError(404, "Wishlist not found");

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id).populate(
      "products",
      "name slug images brand category"
    );

    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};
