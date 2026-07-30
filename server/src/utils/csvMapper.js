import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import ProductVariant from "../models/productVariant.model.js";
import { slugify } from "./slugify.js";

// resolves "Apparel & Accessories > Clothing > T-Shirts" into a Category chain,
// checking which levels already exist vs would need to be created
const resolveCategoryPath = async (categoryPathString) => {
  if (!categoryPathString) return { exists: false, path: [], missing: [] };

  const levels = categoryPathString.split(">").map((s) => s.trim());
  const path = [];
  const missing = [];
  let parentId = null;

  for (const levelName of levels) {
    const slug = slugify(levelName);
    const existing = await Category.findOne({ slug, parent: parentId });
    if (existing) {
      path.push({ name: levelName, id: existing._id, existing: true });
      parentId = existing._id;
    } else {
      path.push({ name: levelName, id: null, existing: false });
      missing.push(levelName);
      parentId = null; // can't resolve deeper levels if this one doesn't exist yet
    }
  }

  return { path, missing, finalExists: missing.length === 0 };
};

const resolveBrand = async (vendorName) => {
  if (!vendorName) return { existing: false, id: null };
  const brand = await Brand.findOne({ name: vendorName.trim() });
  return brand ? { existing: true, id: brand._id } : { existing: false, id: null };
};

// groups raw CSV rows into { product, variants[] } structures by "URL handle"
export const groupRowsByProduct = (rows) => {
  const groups = new Map();

  for (const row of rows) {
    const handle = row["URL handle"];
    if (!handle) continue; // rows without a handle can't be grouped — flagged as an error elsewhere

    if (!groups.has(handle)) {
      groups.set(handle, { parentRow: null, variantRows: [] });
    }

    const group = groups.get(handle);

    // the parent row is the one carrying Title (Shopify leaves it blank on variant-only rows)
    if (row.Title && row.Title.trim() !== "") {
      group.parentRow = row;
    }
    group.variantRows.push(row);
  }

  return Array.from(groups.entries()).map(([handle, group]) => ({ handle, ...group }));
};

// converts one grouped { parentRow, variantRows } into your Product/Variant shape,
// with validation errors attached per field
export const mapGroupToProduct = async (group) => {
  const errors = [];
  const { parentRow, variantRows, handle } = group;

  if (!parentRow) {
    errors.push(`No parent row (row with Title) found for handle "${handle}"`);
  }

  const category = await resolveCategoryPath(parentRow?.["Product category"]);
  const brand = await resolveBrand(parentRow?.Vendor);

  if (!parentRow?.Vendor) errors.push("Missing Vendor (Brand)");
  if (!parentRow?.["Product category"]) errors.push("Missing Product category");

  const variants = variantRows.map((row, index) => {
    const variantErrors = [];
    if (!row.SKU) variantErrors.push("Missing SKU");
    if (!row.Price || isNaN(Number(row.Price))) variantErrors.push("Missing or invalid Price");
    if (row["Inventory quantity"] && isNaN(Number(row["Inventory quantity"]))) {
      variantErrors.push("Invalid Inventory quantity");
    }

    const options = [];
    if (row["Option1 name"] && row["Option1 value"]) {
      options.push({ name: row["Option1 name"], value: row["Option1 value"] });
    }
    if (row["Option2 name"] && row["Option2 value"]) {
      options.push({ name: row["Option2 name"], value: row["Option2 value"] });
    }
    if (row["Option3 name"] && row["Option3 value"]) {
      options.push({ name: row["Option3 name"], value: row["Option3 value"] });
    }

    return {
      rowIndex: index,
      sku: row.SKU,
      barcode: row.Barcode || undefined,
      price: Number(row.Price) || 0,
      salePrice: row["Compare-at price"] ? Number(row["Compare-at price"]) : undefined,
      stock: Number(row["Inventory quantity"]) || 0,
      options,
      weight: row["Weight value (grams)"]
        ? { value: Number(row["Weight value (grams)"]), unit: "g" }
        : undefined,
      errors: variantErrors,
      valid: variantErrors.length === 0,
    };
  });

  const productData = {
    name: parentRow?.Title,
    description: parentRow?.Description,
    seoTitle: parentRow?.["SEO title"],
    seoDescription: parentRow?.["SEO description"],
    categoryPath: category.path,
    categoryResolved: category.finalExists,
    brandName: parentRow?.Vendor,
    brandResolved: brand.existing,
    brandId: brand.id,
  };

  const allVariantsValid = variants.every((v) => v.valid);

  return {
    handle,
    product: productData,
    variants,
    errors,
    valid: errors.length === 0 && allVariantsValid,
  };
};

// like resolveCategoryPath, but actually creates missing levels — used at confirm time, not preview
export const findOrCreateCategoryPath = async (categoryPathString, session, createdCategoryIds) => {
  if (!categoryPathString) return null;

  const levels = categoryPathString.split(">").map((s) => s.trim());
  let parentId = null;
  let finalCategoryId = null;

  for (const levelName of levels) {
    const slug = slugify(levelName);
    let category = await Category.findOne({ slug, parent: parentId }).session(session);

    if (!category) {
      [category] = await Category.create(
        [{ name: levelName, slug, parent: parentId }],
        { session }
      );
      createdCategoryIds.push(category._id);
    }

    parentId = category._id;
    finalCategoryId = category._id;
  }

  return finalCategoryId;
};

export const findOrCreateBrand = async (vendorName, session, createdBrandIds) => {
  if (!vendorName) return null;

  let brand = await Brand.findOne({ name: vendorName.trim() }).session(session);

  if (!brand) {
    const slug = slugify(vendorName);
    [brand] = await Brand.create([{ name: vendorName.trim(), slug }], { session });
    createdBrandIds.push(brand._id);
  }

  return brand._id;
};