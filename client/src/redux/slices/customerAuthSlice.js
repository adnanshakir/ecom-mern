import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authClient } from "@/lib/authClient";

const initialState = {
  user: null,
  status: "idle", // idle | loading | authenticated | unauthenticated
  error: null,
  authReady: false,
};

/**
 * Restores session on application load or post-auth verification.
 * Queries Better Auth session cookie.
 */
export const restoreCustomerSession = createAsyncThunk(
  "customerAuth/restoreSession",
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await authClient.getSession();
      if (error) {
        return rejectWithValue(error.message || "Failed to restore session");
      }
      if (!data?.session || !data?.user) {
        return null;
      }
      return data.user;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to restore session");
    }
  }
);

/**
 * Customer Sign-Out thunk.
 * Always clears client-side state even if remote request fails.
 */
export const customerSignOut = createAsyncThunk(
  "customerAuth/signOut",
  async (_, { rejectWithValue }) => {
    try {
      await authClient.signOut();
      return true;
    } catch (err) {
      // Return rejectWithValue so thunk completes, but extraReducer will still clear state
      return rejectWithValue(err.message || "Sign out failed");
    }
  }
);

const customerAuthSlice = createSlice({
  name: "customerAuth",
  initialState,
  reducers: {
    clearCustomerAuth: (state) => {
      state.user = null;
      state.status = "unauthenticated";
      state.authReady = true;
      state.error = null;
    },
    setCustomerAuthSession: (state, action) => {
      state.user = action.payload;
      state.status = action.payload ? "authenticated" : "unauthenticated";
      state.authReady = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // restoreCustomerSession
      .addCase(restoreCustomerSession.pending, (state) => {
        state.status = "loading";
      })
      .addCase(restoreCustomerSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
          state.status = "authenticated";
        } else {
          state.user = null;
          state.status = "unauthenticated";
        }
        state.authReady = true;
      })
      .addCase(restoreCustomerSession.rejected, (state) => {
        state.status = state.user ? "authenticated" : "unauthenticated";
        state.authReady = true;
      })
      // customerSignOut — ALWAYS clear local state on both fulfilled and rejected
      .addCase(customerSignOut.fulfilled, (state) => {
        state.user = null;
        state.status = "unauthenticated";
        state.authReady = true;
      })
      .addCase(customerSignOut.rejected, (state) => {
        state.user = null;
        state.status = "unauthenticated";
        state.authReady = true;
      });
  },
});

export const { clearCustomerAuth, setCustomerAuthSession } = customerAuthSlice.actions;

// Aliases for backwards compatibility during migration if needed
export const customerLogout = customerSignOut;

export default customerAuthSlice.reducer;