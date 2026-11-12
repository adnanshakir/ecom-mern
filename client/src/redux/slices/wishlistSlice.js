import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getWishlistRequest,
  addToWishlistRequest,
  removeFromWishlistRequest,
  mergeWishlistRequest,
} from "@/services/storefront/wishlist";
import {
  readGuestWishlist,
  getGuestWishlist,
  saveGuestWishlist,
  reconcileGuestWishlistAfterMerge,
} from "@/lib/guestStorage";

const MAX_WISHLIST_MERGE_ITEMS = 100;

const extractIds = (products) =>
  (products || []).map((p) => (p?._id || p)?.toString()).filter(Boolean);

async function syncCustomerWishlist() {
  const guestItems = getGuestWishlist();

  if (guestItems.length === 0) {
    const { data } = await getWishlistRequest();
    return data.data.products; // array of populated product objects
  }

  const uniqueProductIds = [
    ...new Set(guestItems.map((p) => (p?._id || p)?.toString()).filter(Boolean)),
  ];

  if (uniqueProductIds.length === 0) {
    const { data } = await getWishlistRequest();
    return data.data.products;
  }

  let latestProducts = null;
  for (let i = 0; i < uniqueProductIds.length; i += MAX_WISHLIST_MERGE_ITEMS) {
    const batchIds = uniqueProductIds.slice(i, i + MAX_WISHLIST_MERGE_ITEMS);
    const { data } = await mergeWishlistRequest(batchIds);
    latestProducts = data.data.products;
    reconcileGuestWishlistAfterMerge(batchIds);
  }

  return latestProducts;
}

const initialState = {
  productIds: [], // Set of product _id strings for O(1) membership checks
  products: [], // Full populated product objects (for wishlist page rendering)
  status: "idle",
  error: null,
  pendingProducts: [], // productIds currently being toggled
};

// ── Thunks ────────────────────────────────────────────────────────────────────

/**
 * Fetch customer wishlist. If guest items exist in localStorage, automatically
 * merges them into the customer's account on the server first.
 */
export const fetchWishlist = createAsyncThunk(
  "wishlist/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await syncCustomerWishlist();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load wishlist");
    }
  }
);

export const addToWishlist = createAsyncThunk(
  "wishlist/add",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await addToWishlistRequest(productId);
      return data.data.products;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add to wishlist");
    }
  }
);

export const removeFromWishlist = createAsyncThunk(
  "wishlist/remove",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await removeFromWishlistRequest(productId);
      return data.data.products;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to remove from wishlist");
    }
  }
);

export const mergeGuestWishlistThunk = createAsyncThunk(
  "wishlist/mergeGuest",
  async (_, { rejectWithValue }) => {
    try {
      return await syncCustomerWishlist();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to merge wishlist");
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    // Load unauthenticated wishlist from localStorage
    loadGuestWishlist(state) {
      const readResult = readGuestWishlist();
      if (readResult.ok) {
        state.products = readResult.items;
        state.productIds = extractIds(readResult.items);
      }
      state.status = "succeeded";
      state.error = null;
    },

    // Toggle product in guest wishlist
    toggleGuestWishlist(state, action) {
      const product = action.payload;
      if (!product?._id) return;

      const readResult = readGuestWishlist();
      if (readResult.ok) {
        state.products = readResult.items;
        state.productIds = extractIds(readResult.items);
      }

      const pid = product._id.toString();
      const exists = state.productIds.includes(pid);
      if (exists) {
        state.products = state.products.filter(
          (p) => (p._id || p).toString() !== pid
        );
        state.productIds = state.productIds.filter((id) => id !== pid);
      } else {
        state.products.push(product);
        state.productIds.push(pid);
      }

      saveGuestWishlist(state.products);
      state.status = "succeeded";
    },

    // Remove from guest wishlist
    removeGuestWishlist(state, action) {
      const pid = action.payload?.toString();
      if (!pid) return;

      const readResult = readGuestWishlist();
      if (readResult.ok) {
        state.products = readResult.items;
      }
      state.products = state.products.filter(
        (p) => (p._id || p).toString() !== pid
      );
      state.productIds = extractIds(state.products);
      saveGuestWishlist(state.products);
    },

    // Reset on logout
    resetWishlist(state) {
      const guestProducts = getGuestWishlist();
      state.products = guestProducts;
      state.productIds = extractIds(guestProducts);
      state.status = "idle";
      state.error = null;
      state.pendingProducts = [];
    },
  },
  extraReducers: (builder) => {
    // fetchWishlist
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.products = action.payload;
        state.productIds = extractIds(action.payload);
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // addToWishlist
    builder
      .addCase(addToWishlist.pending, (state, action) => {
        state.pendingProducts.push(action.meta.arg);
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.products = action.payload;
        state.productIds = extractIds(action.payload);
        state.pendingProducts = state.pendingProducts.filter(
          (id) => id !== action.meta.arg
        );
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.error = action.payload;
        state.pendingProducts = state.pendingProducts.filter(
          (id) => id !== action.meta.arg
        );
      });

    // removeFromWishlist
    builder
      .addCase(removeFromWishlist.pending, (state, action) => {
        state.pendingProducts.push(action.meta.arg);
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.products = action.payload;
        state.productIds = extractIds(action.payload);
        state.pendingProducts = state.pendingProducts.filter(
          (id) => id !== action.meta.arg
        );
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.error = action.payload;
        state.pendingProducts = state.pendingProducts.filter(
          (id) => id !== action.meta.arg
        );
      });

    // mergeGuestWishlistThunk
    builder
      .addCase(mergeGuestWishlistThunk.fulfilled, (state, action) => {
        state.products = action.payload;
        state.productIds = extractIds(action.payload);
        state.status = "succeeded";
      })
      .addCase(mergeGuestWishlistThunk.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  loadGuestWishlist,
  toggleGuestWishlist,
  removeGuestWishlist,
  resetWishlist,
} = wishlistSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectWishlistProductIds = (state) => state.wishlist.productIds;
export const selectIsInWishlist = (productId) => (state) =>
  state.wishlist.productIds.includes(productId?.toString());
export const selectWishlistPending = (state) => state.wishlist.pendingProducts;
export const selectWishlistStatus = (state) => state.wishlist.status;

export default wishlistSlice.reducer;
