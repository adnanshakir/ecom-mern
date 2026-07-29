export const slugify = (text) => {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // replace anything not a-z/0-9 with a hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
};

// appends -1, -2, etc. if the base slug is already taken
export const generateUniqueSlug = async (Model, name) => {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (await Model.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};