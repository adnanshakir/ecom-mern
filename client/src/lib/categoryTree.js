// Builds a depth-first ordered list from a flat category array. Categories
// whose parent isn't found in the list (deleted parent, bad data) are
// treated as top-level, so nothing silently disappears from the table.
export function buildCategoryTree(categories) {
  const byParent = new Map();
  const validIds = new Set(categories.map((c) => c._id));

  categories.forEach((c) => {
    const rawParentId = c.parent?._id || c.parent || null;
    const parentId = rawParentId && validIds.has(rawParentId) ? rawParentId : null;
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(c);
  });

  const result = [];
  const visited = new Set();

  const visit = (parentId, depth) => {
    const children = byParent.get(parentId) || [];
    children
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((c) => {
        if (visited.has(c._id)) return; // guards against a bad cyclic parent chain
        visited.add(c._id);
        result.push({ ...c, depth });
        visit(c._id, depth + 1);
      });
  };

  visit(null, 0);
  return result;
}

// All descendant ids of `id` — used to stop a category from being
// reassigned under its own child/grandchild, which would create a cycle.
export function getDescendantIds(categories, id) {
  const childrenOf = new Map();
  categories.forEach((c) => {
    const parentId = c.parent?._id || c.parent || null;
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId).push(c._id);
  });

  const descendants = new Set();
  const stack = [...(childrenOf.get(id) || [])];
  while (stack.length) {
    const next = stack.pop();
    if (descendants.has(next)) continue;
    descendants.add(next);
    stack.push(...(childrenOf.get(next) || []));
  }
  return descendants;
}

// Helper to flatten nested categories tree into a single array
export function flattenCategories(categories) {
  const result = [];
  const seen = new Set();

  function walk(list) {
    if (!Array.isArray(list)) return;
    for (const c of list) {
      if (!c || seen.has(c._id)) continue;
      seen.add(c._id);
      result.push(c);
      if (c.subcategories && c.subcategories.length > 0) {
        walk(c.subcategories);
      }
    }
  }

  walk(categories);
  return result;
}

// Groups categories by their direct parent id (null = top-level). Used for
// collapsible rendering — unlike buildCategoryTree, this doesn't flatten
// everything up front, so children can be rendered only when expanded.
export function buildChildrenMap(categories) {
  const allList = flattenCategories(categories);
  const validIds = new Set(allList.map((c) => c._id));
  const map = new Map();

  const addUniqueChild = (parentKey, child) => {
    if (!child?._id) return;
    if (!map.has(parentKey)) map.set(parentKey, []);
    const bucket = map.get(parentKey);
    if (!bucket.some((existing) => existing._id === child._id)) {
      bucket.push(child);
    }
  };

  allList.forEach((c) => {
    const rawParentId = c.parent?._id || c.parent || null;
    const parentId = rawParentId && validIds.has(rawParentId) ? rawParentId : null;
    addUniqueChild(parentId, c);

    // Also link subcategories if attached directly
    if (Array.isArray(c.subcategories) && c.subcategories.length > 0) {
      for (const sub of c.subcategories) {
        addUniqueChild(c._id, sub);
      }
    }
  });

  map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
  return map;
}