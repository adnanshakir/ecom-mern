import mongoose from "mongoose";
import Product from "../models/product.model.js";
import ProductVariant from "../models/productVariant.model.js";
import ImportJob from "../models/importJob.model.js";
import {
  findOrCreateCategoryPath,
  findOrCreateBrand,
  groupRowsByProduct,
  mapGroupToProduct,
} from "../utils/csvMapper.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { logActivity } from "../utils/activityLogger.js";
import { parseCsvBuffer } from "../utils/csvParser.js";
import ApiError from "../utils/apiError.utils.js";

export const previewCsvImport = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, "No CSV file provided");

    const rows = parseCsvBuffer(req.file.buffer);
    if (rows.length === 0) throw new ApiError(400, "CSV file is empty");

    const requiredColumns = ["Title", "URL handle", "SKU", "Price"];
    const actualColumns = Object.keys(rows[0]);
    const missingColumns = requiredColumns.filter((col) => !actualColumns.includes(col));
    if (missingColumns.length > 0) {
      throw new ApiError(400, `Missing required columns: ${missingColumns.join(", ")}`);
    }

    const groups = groupRowsByProduct(rows);
    const mappedProducts = await Promise.all(groups.map(mapGroupToProduct));

    const validCount = mappedProducts.filter((p) => p.valid).length;
    const invalidCount = mappedProducts.length - validCount;

    res.status(200).json({
      success: true,
      data: {
        totalRows: rows.length,
        totalProducts: mappedProducts.length,
        validCount,
        invalidCount,
        products: mappedProducts,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const confirmCsvImport = async (req, res, next) => {
  const { fileName, products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return next(new ApiError(400, "No products provided for import"));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const createdProductIds = [];
  const createdVariantIds = [];
  const createdCategoryIds = [];
  const createdBrandIds = [];
  const errors = [];
  let successCount = 0;

  try {
    for (const item of products) {
      if (!item.valid) {
        errors.push(`Skipped "${item.product?.name || item.handle}": marked invalid`);
        continue;
      }
      if (!item.product?.name || !item.variants?.length) {
        errors.push(`Skipped "${item.handle}": missing name or variants`);
        continue;
      }

      const categoryId = await findOrCreateCategoryPath(
        item.product.categoryPath?.map((p) => p.name).join(">"),
        session,
        createdCategoryIds
      );
      const brandId = await findOrCreateBrand(item.product.brandName, session, createdBrandIds);

      if (!categoryId || !brandId) {
        errors.push(`Skipped "${item.product.name}": could not resolve category/brand`);
        continue;
      }

      const slug = await generateUniqueSlug(Product, item.product.name);

      const [product] = await Product.create(
        [
          {
            name: item.product.name,
            slug,
            description: item.product.description,
            seoTitle: item.product.seoTitle,
            seoDescription: item.product.seoDescription,
            category: categoryId,
            brand: brandId,
            status: "draft", // imported products start as draft for admin review
          },
        ],
        { session }
      );
      createdProductIds.push(product._id);

      const variantDocs = item.variants.map((v) => ({
        product: product._id,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        salePrice: v.salePrice,
        stock: v.stock,
        options: v.options,
        weight: v.weight,
      }));

      const createdVariants = await ProductVariant.insertMany(variantDocs, { session });
      createdVariantIds.push(...createdVariants.map((v) => v._id));

      successCount++;
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err);
  }
  session.endSession();

  const importJob = await ImportJob.create({
    user: req.user.id,
    fileName: fileName || "unnamed-import.csv",
    status: "completed",
    totalRows: products.length,
    totalProducts: products.length,
    successCount,
    skippedCount: products.length - successCount,
    createdProductIds,
    createdVariantIds,
    createdCategoryIds,
    createdBrandIds,
    errors,
  });

  await logActivity({
    userId: req.user.id,
    action: "create",
    resource: "Product",
    resourceId: importJob._id,
    description: `CSV import: ${successCount}/${products.length} products imported from ${importJob.fileName}`,
  });

  res.status(201).json({
    success: true,
    data: {
      importJobId: importJob._id,
      successCount,
      skippedCount: importJob.skippedCount,
      errors,
    },
  });
};

export const rollbackCsvImport = async (req, res, next) => {
  const { id } = req.params;

  const importJob = await ImportJob.findById(id);
  if (!importJob) throw new ApiError(404, "Import job not found");

  if (importJob.status === "rolled_back") {
    throw new ApiError(400, "This import has already been rolled back");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await ProductVariant.deleteMany(
      { _id: { $in: importJob.createdVariantIds } },
      { session }
    );
    await Product.deleteMany(
      { _id: { $in: importJob.createdProductIds } },
      { session }
    );
    await Category.deleteMany(
      { _id: { $in: importJob.createdCategoryIds } },
      { session }
    );
    await Brand.deleteMany(
      { _id: { $in: importJob.createdBrandIds } },
      { session }
    );

    importJob.status = "rolled_back";
    await importJob.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err);
  }
  session.endSession();

  await logActivity({
    userId: req.user.id,
    action: "delete",
    resource: "Product",
    resourceId: importJob._id,
    description: `Rolled back CSV import: ${importJob.fileName} (${importJob.successCount} products removed)`,
  });

  res.status(200).json({
    success: true,
    message: `Rolled back ${importJob.successCount} products and their variants`,
  });
};