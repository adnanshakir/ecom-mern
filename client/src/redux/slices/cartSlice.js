import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getCartRequest,
  addToCartRequest,
  updateCartItemRequest,
  removeCartItemRequest,
  clearCartRequest,
  mergeCartRequest,
} from "@/services/storefront/cart";
import {
  getGuestCart,
  saveGuestCart,
  clearGuestCart as clearGuestCartStorage,
} from "@/lib/guestStorage";

const initialState = {
  items: [], // [{variant: {_id, sku, price, salePrice, stock, product:{_id, name,slug,images}}, quantity}]
  status: "idle", // idle | loading | succeeded | failed
  error: null,
  pendingVariants: [],
};

// ── Thunks ────────────────────────────────────────────────────────────────────

/**
 * Fetch customer cart. If guest items exist in localStorage, automatically
 * merges them into the customer's account on the server first.
 */
export const fetchCart = createAsyncThunk("cart/fetch", async (_, { rejectWithValue }) => {
  try {
    const guestItems = getGuestCart();
    if (guestItems.length > 0) {
      const payload = guestItems.map((i) => ({
        variantId: i.variant?._id || i.variantId,
        quantity: i.quantity,
      }));
      const { data } = await mergeCartRequest(payload);
      clearGuestCartStorage();
      return data.data.items;
    }

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

export const mergeGuestCartThunk = createAsyncThunk(
  "cart/mergeGuest",
  async (_, { rejectWithValue }) => {
    try {
      const guestItems = getGuestCart();
      if (guestItems.length === 0) {
        const { data } = await getCartRequest();
        return data.data.items;
      }
      const payload = guestItems.map((i) => ({
        variantId: i.variant?._id || i.variantId,
        quantity: i.quantity,
      }));
      const { data } = await mergeCartRequest(payload);
      clearGuestCartStorage();
      return data.data.items;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to merge cart");
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Load unauthenticated cart from localStorage
    loadGuestCart(state) {
      const items = getGuestCart();
      state.items = items;
      state.status = "succeeded";
      state.error = null;
    },

    // Add item to guest cart in localStorage
    addGuestCartItem(state, action) {
      const { variant, quantity = 1 } = action.payload;
      if (!variant?._id) return;

      const variantId = variant._id.toString();
      const existingIndex = state.items.findIndex(
        (i) => (i.variant?._id || i.variantId)?.toString() === variantId
      );

      const maxStock = variant.stock ?? 999;

      if (existingIndex !== -1) {
        const desired = state.items[existingIndex].quantity + quantity;
        state.items[existingIndex].quantity = Math.min(desired, maxStock);
      } else {
        const clamped = Math.min(quantity, maxStock);
        if (clamped > 0) {
          state.items.push({
            variantId,
            variant,
            quantity: clamped,
          });
        }
      }

      saveGuestCart(state.items);
      state.status = "succeeded";
      state.error = null;
    },

    // Update quantity of guest cart item
    updateGuestCartItem(state, action) {
      const { variantId, quantity } = action.payload;
      const targetId = variantId?.toString();
      const existingIndex = state.items.findIndex(
        (i) => (i.variant?._id || i.variantId)?.toString() === targetId
      );

      if (existingIndex === -1) return;

      if (quantity <= 0) {
        state.items.splice(existingIndex, 1);
      } else {
        const item = state.items[existingIndex];
        const maxStock = item.variant?.stock ?? 999;
        item.quantity = Math.min(quantity, maxStock);
      }

      saveGuestCart(state.items);
    },

    // Remove item from guest cart
    removeGuestCartItem(state, action) {
      const targetId = action.payload?.toString();
      state.items = state.items.filter(
        (i) => (i.variant?._id || i.variantId)?.toString() !== targetId
      );
      saveGuestCart(state.items);
    },

    // Clear guest cart
    clearGuestCartAction(state) {
      state.items = [];
      clearGuestCartStorage();
    },

    // Called on customer logout to reset local state immediately and load any guest cart
    resetCart(state) {
      state.items = getGuestCart();
      state.status = "idle";
      state.error = null;
      state.pendingVariants = [];
    },

    // Used after a successful payment because the server clears the persisted cart.
    clearCartState(state) {
      state.items = [];
      state.error = null;
      clearGuestCartStorage();
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
    builder.addCase(clearCart.fulfilled, (state) => {
      state.items = [];
    });

    // mergeGuestCartThunk
    builder
      .addCase(mergeGuestCartThunk.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(mergeGuestCartThunk.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  loadGuestCart,
  addGuestCartItem,
  updateGuestCartItem,
  removeGuestCartItem,
  clearGuestCartAction,
  resetCart,
  clearCartState,
} = cartSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

/** Total number of line items (used for the navbar badge) */
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

export const selectCartItems = (state) => state.cart.items;
export const selectCartStatus = (state) => state.cart.status;
export const selectCartPendingVariants = (state) => state.cart.pendingVariants;

export default cartSlice.reducer;
