import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getWishlistRequest,
  addToWishlistRequest,
  removeFromWishlistRequest,
} from "@/services/storefront/wishlist";

const initialState = {
  productIds: [],   // Set of product _id strings for O(1) membership checks
  products: [],     // Full populated product objects (for wishlist page rendering)
  status: "idle",
  error: null,
  pendingProducts: [], // productIds currently being toggled
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchWishlist = createAsyncThunk(
  "wishlist/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getWishlistRequest();
      return data.data.products; // array of populated product objects
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

// ── Slice ─────────────────────────────────────────────────────────────────────

const extractIds = (products) => products.map((p) => (p._id || p).toString());

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    resetWishlist(state) {
      state.productIds = [];
      state.products = [];
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
  },
});

export const { resetWishlist } = wishlistSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectWishlistProductIds = (state) => state.wishlist.productIds;
export const selectIsInWishlist = (productId) => (state) =>
  state.wishlist.productIds.includes(productId?.toString());
export const selectWishlistPending = (state) => state.wishlist.pendingProducts;
export const selectWishlistStatus = (state) => state.wishlist.status;

export default wishlistSlice.reducer;
