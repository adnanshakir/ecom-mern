import Product from "../models/product.model.js";
import ProductVariant from "../models/productVariant.model.js";
import Category from "../models/category.model.js";
import ApiError from "../utils/apiError.js";

// ---------------- GET /api/public/products ----------------
// Browsable product list — active products only, trimmed shape.
export const getPublicProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20, sort } = req.query;

    // Always restrict to active products
    const filter = { status: "active" };
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    // Sort mapping
    let sortOption = { createdAt: -1 }; // default: newest
    if (sort === "price_asc") sortOption = { "variants.price": 1 };
    else if (sort === "price_desc") sortOption = { "variants.price": -1 };
    // "newest" is already the default above

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("brand", "name")
        .populate("category", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
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
        pages: Math.ceil(total / Number(limit)),
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
      .populate("category", "name")
      .select("-seoTitle -seoDescription");

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
      images: (obj.images || []).map((img) => ({ url: img.url })),
      brand: obj.brand ? { name: obj.brand.name } : null,
      category: obj.category ? { name: obj.category.name } : null,
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
// All active categories as a flat array with parent populated as { _id, name }.
// The frontend already has tree-building logic and can consume this as-is.
export const getPublicCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate("parent", "_id name")
      .sort({ name: 1 });

    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};
