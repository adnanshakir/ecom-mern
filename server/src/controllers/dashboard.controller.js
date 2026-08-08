import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import ProductVariant from "../models/productVariant.model.js";
import { config } from "../config/config.js";
import ActivityLog from "../models/activityLog.model.js";
import ImportJob from "../models/importJob.model.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const [totalProducts, totalCategories, totalBrands, lowStockVariants, latestActivity, recentImports] =
      await Promise.all([
        Product.countDocuments(),
        Category.countDocuments(),
        Brand.countDocuments(),
        ProductVariant.find({ stock: { $lt: config.lowStockThreshold } })
          .populate("product", "name")
          .select("sku stock product"),
        ActivityLog.find()
          .populate("user", "name")
          .sort({ createdAt: -1 })
          .limit(10),
        ImportJob.find()
          .select("fileName status successCount skippedCount totalProducts createdAt user")
          .populate("user", "name")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalCategories,
        totalBrands,
        lowStock: {
          threshold: config.lowStockThreshold,
          count: lowStockVariants.length,
          items: lowStockVariants,
        },
        latestActivity,
        recentImports, // last 5 ImportJob docs — status field drives rollback button state
        csvImportStatus: null,
      },
    });
  } catch (err) {
    next(err);
  }
};
