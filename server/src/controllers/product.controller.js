import Product from "../models/product.model.js";
import ProductVariant from "../models/productVariant.model.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import ApiError from "../utils/apiError.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import mongoose from "mongoose";

// ---------------- CREATE ----------------
// expects: { ...productFields, variants: [{ sku, price, stock, ... }, ...] }
export const createProduct = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { variants, ...productData } = req.body;

    if (!variants || variants.length === 0) {
      throw new ApiError(400, "At least one variant is required");
    }

    const categoryExists = await Category.findById(productData.category);
    if (!categoryExists) throw new ApiError(400, "Category not found");

    const brandExists = await Brand.findById(productData.brand);
    if (!brandExists) throw new ApiError(400, "Brand not found");

    const slug = await generateUniqueSlug(Product, productData.name);

    const [product] = await Product.create([{ ...productData, slug }], { session });

    const variantDocs = variants.map((v) => ({ ...v, product: product._id }));
    const createdVariants = await ProductVariant.insertMany(variantDocs, { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: { ...product.toObject(), variants: createdVariants },
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ---------------- GET ALL (with filters + population) ----------------
export const getProducts = async (req, res, next) => {
  try {
    const { category, brand, status, featured, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (status) filter.status = status;
    if (featured !== undefined) filter.featured = featured === "true";
    if (search) filter.name = { $regex: search, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .populate("brand", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: products,
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

// ---------------- GET ONE (with its variants) ----------------
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("brand", "name slug");

    if (!product) throw new ApiError(404, "Product not found");

    const variants = await ProductVariant.find({ product: product._id });

    res.status(200).json({
      success: true,
      data: { ...product.toObject(), variants },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- UPDATE ----------------
// updates product fields only — variants are managed via separate variant endpoints
export const updateProduct = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.variants; // variants aren't touched through this endpoint

    if (updates.category) {
      const categoryExists = await Category.findById(updates.category);
      if (!categoryExists) throw new ApiError(400, "Category not found");
    }

    if (updates.brand) {
      const brandExists = await Brand.findById(updates.brand);
      if (!brandExists) throw new ApiError(400, "Brand not found");
    }

    if (updates.name) {
      updates.slug = await generateUniqueSlug(Product, updates.name);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!product) throw new ApiError(404, "Product not found");

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ---------------- DELETE (product + all its variants) ----------------
export const deleteProduct = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findByIdAndDelete(req.params.id, { session });
    if (!product) throw new ApiError(404, "Product not found");

    await ProductVariant.deleteMany({ product: product._id }, { session });

    await session.commitTransaction();
    res.status(200).json({ success: true, message: "Product and its variants deleted" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};