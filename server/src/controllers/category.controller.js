import Category from "../models/category.model.js";
import ApiError from "../utils/apiError.utils.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import Product from "../models/product.model.js";

export const createCategory = async (req, res, next) => {
  try {
    const { name, parent, isActive } = req.body;

    if (parent) {
      const parentExists = await Category.findById(parent);
      if (!parentExists) throw new ApiError(400, "Parent category not found");
    }

    const slug = await generateUniqueSlug(Category, name);

    const category = await Category.create({ name, slug, parent: parent || null, isActive });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) throw new ApiError(404, "Category not found");

    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const updates = { ...req.body };

    if (updates.parent) {
      if (updates.parent === req.params.id) {
        throw new ApiError(400, "A category cannot be its own parent");
      }
      const parentExists = await Category.findById(updates.parent);
      if (!parentExists) throw new ApiError(400, "Parent category not found");
    }

    if (updates.name) {
      updates.slug = await generateUniqueSlug(Category, updates.name);
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!category) throw new ApiError(404, "Category not found");

    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const hasChildren = await Category.exists({ parent: req.params.id });
    if (hasChildren) {
      throw new ApiError(400, "Cannot delete a category that has subcategories");
    }

    const inUse = await Product.exists({ category: req.params.id });
    if (inUse) {
      throw new ApiError(400, "Cannot delete a category that has products assigned to it");
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw new ApiError(404, "Category not found");

    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (err) {
    next(err);
  }
};