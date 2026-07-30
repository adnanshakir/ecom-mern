import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import ProductVariant from "../models/productVariant.model.js";
import { config } from "../config/config.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const [totalProducts, totalCategories, totalBrands, lowStockVariants] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      Brand.countDocuments(),
      ProductVariant.find({ stock: { $lt: config.lowStockThreshold } })
        .populate("product", "name")
        .select("sku stock product"),
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
        // Not yet available — depends on modules not built yet (CSV Import, Activity Logs)
        recentUploads: [],
        csvImportStatus: null,
        latestActivity: [],
      },
    });
  } catch (err) {
    next(err);
  }
};