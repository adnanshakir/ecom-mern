import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  registerCustomerRequest,
  loginCustomerRequest,
  refreshCustomerRequest,
  logoutCustomerRequest,
} from "@/services/storefront/customerAuth";

const initialState = {
  user: null,
  accessToken: null,
  status: "idle", // idle | loading | authenticated | unauthenticated
  error: null,
  authReady: false,
};

export const registerCustomer = createAsyncThunk(
  "customerAuth/register",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await registerCustomerRequest(payload);
      return data.data; // {accessToken, user} — register logs the customer in immediately
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Unable to register");
    }
  }
);

export const loginCustomer = createAsyncThunk(
  "customerAuth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await loginCustomerRequest(payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Unable to log in");
    }
  }
);

export const refreshCustomerToken = createAsyncThunk(
  "customerAuth/refresh",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await refreshCustomerRequest();
      return data.data; // {accessToken}
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Session expired");
    }
  }
);

export const customerLogout = createAsyncThunk(
  "customerAuth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await logoutCustomerRequest();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Logout failed");
    }
  }
);

const customerAuthSlice = createSlice({
  name: "customerAuth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(registerCustomer.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerCustomer.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.authReady = true;
      })
      .addCase(registerCustomer.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.error = action.payload;
      })
      .addCase(loginCustomer.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginCustomer.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.authReady = true;
      })
      .addCase(loginCustomer.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.error = action.payload;
      })
      .addCase(refreshCustomerToken.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.authReady = true;
      })
      .addCase(refreshCustomerToken.rejected, (state) => {
        state.status = "unauthenticated";
        state.accessToken = null;
        state.user = null;
        state.authReady = true;
      })
      .addCase(customerLogout.fulfilled, (state) => {
        state.status = "unauthenticated";
        state.accessToken = null;
        state.user = null;
      });
  },
});

export default customerAuthSlice.reducer;