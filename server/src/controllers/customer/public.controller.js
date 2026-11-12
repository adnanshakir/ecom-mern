import mongoose from "mongoose";
import Product from "../../models/admin/product.model.js";
import ProductVariant from "../../models/admin/productVariant.model.js";
import Category from "../../models/admin/category.model.js";
import { mergeBannersWithDefaults } from "../admin/banner.controller.js";
import ApiError from "../../utils/apiError.js";
import { escapeRegex } from "../../utils/escapeRegex.js";

// ---------------- GET /api/public/products ----------------
// Browsable product list — active products only, trimmed shape.
export const getPublicProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20, sort, minPrice, maxPrice } = req.query;

    // Always restrict to active products
    const filter = { status: "active" };

    if (category) {
      // Find target category + all its subcategory IDs recursively
      const allCategories = await Category.find({ isActive: true }).select("_id parent slug");
      const target = allCategories.find(
        (c) => c._id.toString() === category || c.slug === category
      );

      if (target) {
        const categoryIds = [target._id];
        const queue = [target._id.toString()];
        while (queue.length > 0) {
          const parentId = queue.shift();
          const children = allCategories.filter(
            (c) => c.parent && c.parent.toString() === parentId
          );
          for (const child of children) {
            categoryIds.push(child._id);
            queue.push(child._id.toString());
          }
        }
        filter.category = { $in: categoryIds };
      } else if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        // Unknown category slug or non-existent category -> Return 0 products cleanly!
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: Number(page),
            pages: 0,
          },
        });
      }
    }

    if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };

    // Price range filtering via variants
    if (minPrice || maxPrice) {
      const priceQuery = {};
      if (minPrice) priceQuery.$gte = Number(minPrice);
      if (maxPrice) priceQuery.$lte = Number(maxPrice);

      const matchingVariants = await ProductVariant.find(
        { price: priceQuery },
        "product"
      );
      const matchedProductIds = [...new Set(matchingVariants.map((v) => v.product.toString()))];
      filter._id = { $in: matchedProductIds };
    }

    // Sort mapping
    if (sort && !["newest", "featured"].includes(sort)) {
      throw new ApiError(400, "Invalid sort option. Supported options: newest, featured");
    }
    let sortOption = { createdAt: -1 }; // default: newest
    if (sort === "featured") sortOption = { featured: -1, createdAt: -1 };
    // "newest" is already the default above

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Number(page) - 1) * safeLimit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("brand", "name")
        .populate("category", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(safeLimit)
        .select("name slug description images brand category featured"),
      Product.countDocuments(filter),
    ]);

    // Fetch variants for the returned products (trimmed: price, salePrice, stock only)
    const productIds = products.map((p) => p._id);
    const allVariants = await ProductVariant.find(
      { product: { $in: productIds } },
      "product price salePrice stock"
    );

    // Group variants by product id
    const variantMap = {};
    for (const v of allVariants) {
      const key = v.product.toString();
      if (!variantMap[key]) variantMap[key] = [];
      variantMap[key].push({
        _id: v._id,
        price: v.price,
        salePrice: v.salePrice,
        stock: v.stock,
      });
    }

    const data = products.map((p) => {
      const obj = p.toObject();
      return {
        _id: obj._id,
        name: obj.name,
        slug: obj.slug,
        description: obj.description,
        images: (obj.images || []).map((img) => ({ url: img.url })),
        brand: obj.brand ? { name: obj.brand.name } : null,
        category: obj.category ? { name: obj.category.name } : null,
        featured: obj.featured,
        variants: variantMap[obj._id.toString()] || [],
      };
    });

    res.status(200).json({
      success: true,
      data,
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

// ---------------- GET /api/public/products/:slug ----------------
// Single active product by slug — full detail for a product page.
export const getPublicProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate("brand", "name")
      .populate("category", "_id name");

    // 404 for missing or non-active products (don't leak draft/archived)
    if (!product || product.status !== "active") {
      throw new ApiError(404, "Product not found");
    }

    const variants = await ProductVariant.find(
      { product: product._id },
      "sku price salePrice stock images options"
    );

    // Strip fileId from variant images — only url is needed publicly
    const trimmedVariants = variants.map((v) => {
      const vo = v.toObject();
      return {
        _id: vo._id, // needed by the cart endpoint (addToCart sends variantId)
        sku: vo.sku,
        price: vo.price,
        salePrice: vo.salePrice,
        stock: vo.stock,
        images: (vo.images || []).map((img) => ({ url: img.url })),
        options: vo.options,
      };
    });

    const obj = product.toObject();
    const data = {
      _id: obj._id,
      name: obj.name,
      slug: obj.slug,
      description: obj.description,
      keyFeatures: obj.keyFeatures || "",
      productDimensions: obj.productDimensions || "",
      images: (obj.images || []).map((img) => ({ url: img.url })),
      brand: obj.brand ? { name: obj.brand.name } : null,
      category: obj.category ? { _id: obj.category._id, name: obj.category.name } : null,
      featured: obj.featured,
      optionTypes: obj.optionTypes,
      variants: trimmedVariants,
    };

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ---------------- GET /api/public/categories ----------------
// Returns active categories with subcategories nested inside each parent category,
// including subcategory images (url) for mobile apps and storefronts.
export const getPublicCategories = async (req, res, next) => {
  try {
    const { parentOnly, flat } = req.query;

    const allCategories = await Category.find({ isActive: true })
      .populate("parent", "_id name slug")
      .sort({ name: 1 })
      .lean();

    if (flat === "true") {
      const formattedFlat = allCategories.map((cat) => ({
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || "",
        image: {
          url: cat.image?.url || "",
        },
        isActive: cat.isActive,
        parent: cat.parent ? { _id: cat.parent._id, name: cat.parent.name, slug: cat.parent.slug } : null,
      }));
      return res.status(200).json({ success: true, data: formattedFlat });
    }

    if (parentOnly === "true") {
      const topLevelOnly = allCategories
        .filter((c) => !c.parent)
        .map((cat) => ({
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description || "",
          image: {
            url: cat.image?.url || "",
          },
          isActive: cat.isActive,
          subcategories: [],
        }));
      return res.status(200).json({ success: true, data: topLevelOnly });
    }

    // Default: Return hierarchy of categories with populated subcategories and subcategory images
    const treeData = buildCategoryHierarchy(allCategories);
    res.status(200).json({ success: true, data: treeData });
  } catch (err) {
    next(err);
  }
};

// Helper: build recursive category tree with subcategories and subcategory images
function buildCategoryHierarchy(categories) {
  const categoryMap = new Map();
  const roots = [];

  for (const cat of categories) {
    categoryMap.set(cat._id.toString(), {
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image: {
        url: cat.image?.url || "",
      },
      isActive: cat.isActive,
      parent: cat.parent ? { _id: cat.parent._id, name: cat.parent.name, slug: cat.parent.slug } : null,
      subcategories: [],
    });
  }

  for (const cat of categories) {
    const node = categoryMap.get(cat._id.toString());
    const rawParent = cat.parent?._id || cat.parent;
    const parentId = rawParent ? rawParent.toString() : null;

    if (parentId && categoryMap.has(parentId)) {
      const parent = categoryMap.get(parentId);
      parent.subcategories.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ---------------- GET /api/public/search/suggestions ----------------
// Fast autocomplete suggestions for product names and category names
export const getPublicSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: { products: [], categories: [] },
      });
    }

    const searchTerm = q.trim();
    const regex = new RegExp(escapeRegex(searchTerm), "i");

    const [products, categories] = await Promise.all([
      Product.find({ status: "active", name: regex })
        .populate("category", "name slug")
        .select("name slug images category")
        .limit(6),
      Category.find({ isActive: true, name: regex })
        .populate("parent", "name slug")
        .select("name slug parent")
        .limit(5),
    ]);

    const productIds = products.map((p) => p._id);
    const variants = await ProductVariant.find({ product: { $in: productIds } }, "product price salePrice");
    const priceMap = {};
    for (const v of variants) {
      const pid = v.product.toString();
      const p = v.salePrice || v.price;
      if (!priceMap[pid] || p < priceMap[pid]) {
        priceMap[pid] = p;
      }
    }

    const formattedProducts = products.map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      image: p.images?.[0]?.url || null,
      categoryName: p.category?.name || null,
      price: priceMap[p._id.toString()] || null,
    }));

    const formattedCategories = categories.map((c) => ({
      _id: c._id,
      name: c.name,
      slug: c.slug || c._id,
      parentName: c.parent?.name || null,
    }));

    res.status(200).json({
      success: true,
      data: {
        products: formattedProducts,
        categories: formattedCategories,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- GET /api/public/banners ----------------
// Returns active banner configurations for the storefront
export const getPublicBanners = async (req, res, next) => {
  try {
    const result = await mergeBannersWithDefaults({ isActive: true });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};


