import mongoose from "mongoose";
import { adjustStock } from "../../utils/inventory.js";
import InventoryMovement from "../../models/admin/inventoryMovement.model.js";
import ProductVariant from "../../models/admin/productVariant.model.js";
import Product from "../../models/admin/product.model.js";
import ApiError from "../../utils/apiError.js";
import { notifyRestock } from "../../services/notificationTriggers.js";

export const createMovement = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { variantId, type, quantity, reason } = req.body;

    const variantDoc = await ProductVariant.findById(variantId).session(session);
    let totalStockBefore = 0;
    let productId = null;
    if (variantDoc) {
      productId = variantDoc.product;
      const variantsBefore = await ProductVariant.find({ product: productId }).session(session);
      totalStockBefore = variantsBefore.reduce((sum, v) => sum + (v.stock || 0), 0);
    }

    const { variant, movement } = await adjustStock({
      variantId,
      type,
      quantity,
      reason,
      userId: req.user.id,
      session,
    });

    await session.commitTransaction();

    if (productId) {
      const variantsAfter = await ProductVariant.find({ product: productId });
      const totalStockAfter = variantsAfter.reduce((sum, v) => sum + (v.stock || 0), 0);
      if (totalStockBefore <= 0 && totalStockAfter > 0) {
        const product = await Product.findById(productId);
        if (product) notifyRestock(product).catch(console.error);
      }
    }

    res.status(201).json({
      success: true,
      data: { variant, movement },
    });
  } catch (err) {
    await session.abortTransaction();
    return next(err);
  } finally {
    session.endSession();
  }
};

export const getMovementsByVariant = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Number(page) - 1) * safeLimit;

    const [movements, total] = await Promise.all([
      InventoryMovement.find({ variant: req.params.variantId })
        .populate("user", "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      InventoryMovement.countDocuments({ variant: req.params.variantId }),
    ]);

    res.status(200).json({
      success: true,
      data: movements,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const reconcileStock = async (req, res, next) => {
  // recomputes a variant's stock by summing its full movement history —
  // used to detect/fix drift if variant.stock and the ledger ever disagree
  try {
    const { variantId } = req.params;

    const variant = await ProductVariant.findById(variantId).select("stock sku");
    if (!variant) throw new ApiError(404, "Variant not found");

    const result = await InventoryMovement.aggregate([
      { $match: { variant: new mongoose.Types.ObjectId(variantId) } },
      { $group: { _id: null, total: { $sum: "$quantityChange" } } },
    ]);

    const computedStock = result[0]?.total || 0;
    const currentStock = variant.stock;

    res.status(200).json({
      success: true,
      data: {
        variantId,
        sku: variant.sku,
        currentStock,          // what variant.stock field actually holds
        computedStock,         // what the movement ledger sums to
        hasDrift: currentStock !== computedStock,
      },
    });
  } catch (err) {
    next(err);
  }
};
