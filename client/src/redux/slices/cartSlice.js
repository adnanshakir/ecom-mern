import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getCartRequest,
  addToCartRequest,
  updateCartItemRequest,
  removeCartItemRequest,
  clearCartRequest,
} from "@/services/storefront/cart";

const initialState = {
  items: [],       // [{variant: {_id, sku, price, salePrice, stock, product:{name,slug,images}}, quantity}]
  status: "idle",  // idle | loading | succeeded | failed
  error: null,
  // Optimistic: track which variantIds are currently being mutated so buttons
  // can show a spinner without blocking the whole cart
  pendingVariants: [],
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchCart = createAsyncThunk("cart/fetch", async (_, { rejectWithValue }) => {
  try {
    const { data } = await getCartRequest();
    return data.data.items;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to load cart");
  }
});

export const addToCart = createAsyncThunk(
  "cart/addItem",
  async ({ variantId, quantity }, { rejectWithValue }) => {
    try {
      const { data } = await addToCartRequest(variantId, quantity);
      return { items: data.data.items, message: data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add to cart");
    }
  }
);

export const updateCartItem = createAsyncThunk(
  "cart/updateItem",
  async ({ variantId, quantity }, { rejectWithValue }) => {
    try {
      const { data } = await updateCartItemRequest(variantId, quantity);
      return data.data.items;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update cart");
    }
  }
);

export const removeCartItem = createAsyncThunk(
  "cart/removeItem",
  async (variantId, { rejectWithValue }) => {
    try {
      const { data } = await removeCartItemRequest(variantId);
      return data.data.items;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to remove item");
    }
  }
);

export const clearCart = createAsyncThunk("cart/clear", async (_, { rejectWithValue }) => {
  try {
    await clearCartRequest();
    return [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to clear cart");
  }
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Called on customer logout to reset local state immediately
    resetCart(state) {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.pendingVariants = [];
    },
  },
  extraReducers: (builder) => {
    // fetchCart
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });

    // addToCart
    builder
      .addCase(addToCart.pending, (state, action) => {
        state.pendingVariants.push(action.meta.arg.variantId);
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.pendingVariants = state.pendingVariants.filter(
          (id) => id !== action.meta.arg.variantId
        );
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.error = action.payload;
        state.pendingVariants = state.pendingVariants.filter(
          (id) => id !== action.meta.arg.variantId
        );
      });

    // updateCartItem
    builder
      .addCase(updateCartItem.pending, (state, action) => {
        state.pendingVariants.push(action.meta.arg.variantId);
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.items = action.payload;
        state.pendingVariants = state.pendingVariants.filter(
          (id) => id !== action.meta.arg.variantId
        );
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.error = action.payload;
        state.pendingVariants = state.pendingVariants.filter(
          (id) => id !== action.meta.arg.variantId
        );
      });

    // removeCartItem
    builder
      .addCase(removeCartItem.pending, (state, action) => {
        state.pendingVariants.push(action.meta.arg);
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.items = action.payload;
        state.pendingVariants = state.pendingVariants.filter(
          (id) => id !== action.meta.arg
        );
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.error = action.payload;
        state.pendingVariants = state.pendingVariants.filter(
          (id) => id !== action.meta.arg
        );
      });

    // clearCart
    builder
      .addCase(clearCart.fulfilled, (state) => {
        state.items = [];
      });
  },
});

export const { resetCart } = cartSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

/** Total number of line items (used for the navbar badge) */
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartItems = (state) => state.cart.items;
export const selectCartStatus = (state) => state.cart.status;
export const selectCartPendingVariants = (state) => state.cart.pendingVariants;

export default cartSlice.reducer;
