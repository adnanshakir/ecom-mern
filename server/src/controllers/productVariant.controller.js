import ProductVariant from "../models/productVariant.model.js";
import Product from "../models/product.model.js";
import ApiError from "../utils/apiError.js";

// ---------------- ADD a variant to an existing product ----------------
export const createVariant = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, "Product not found");

    const variant = await ProductVariant.create({ ...req.body, product: productId });

    res.status(201).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
};

// ---------------- GET all variants for a product ----------------
export const getVariantsByProduct = async (req, res, next) => {
  try {
    const variants = await ProductVariant.find({ product: req.params.productId });
    res.status(200).json({ success: true, data: variants });
  } catch (err) {
    next(err);
  }
};

// ---------------- GET one variant ----------------
export const getVariantById = async (req, res, next) => {
  try {
    const variant = await ProductVariant.findById(req.params.id);
    if (!variant) throw new ApiError(404, "Variant not found");

    res.status(200).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
};

// ---------------- UPDATE a variant ----------------
export const updateVariant = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.product; // enforced at the validation layer too, but double-guarded here
    delete updates.stock;   // stock is ledger-only — use POST /inventory/movements instead


    const variant = await ProductVariant.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!variant) throw new ApiError(404, "Variant not found");

    res.status(200).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
};

// ---------------- DELETE a variant ----------------
export const deleteVariant = async (req, res, next) => {
  try {
    const variant = await ProductVariant.findById(req.params.id);
    if (!variant) throw new ApiError(404, "Variant not found");

    const variantCount = await ProductVariant.countDocuments({ product: variant.product });
    if (variantCount === 1) {
      throw new ApiError(400, "Cannot delete the only variant of a product. Delete the product instead.");
    }

    await variant.deleteOne();

    res.status(200).json({ success: true, message: "Variant deleted" });
  } catch (err) {
    next(err);
  }
};