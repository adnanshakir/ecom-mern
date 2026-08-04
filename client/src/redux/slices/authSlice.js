import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/axios";
import { decodeJwtPayload } from "@/lib/jwt";

// Access token lives only in Redux (in-memory) — never localStorage.
// It's lost on refresh and recovered via refreshAccessToken() on app mount.
const initialState = {
  user: null,
  accessToken: null,
  status: "idle", // idle | loading | authenticated | unauthenticated
  error: null,
  authReady: false,
  registerStatus: "idle", // idle | loading | succeeded | failed
  registerError: null,
};

export const login = createAsyncThunk("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/login", { email, password });
    return data.data; // { accessToken, user }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Unable to log in");
  }
});

export const refreshAccessToken = createAsyncThunk("auth/refresh", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/refresh");
    return data.data; // { accessToken }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Session expired");
  }
});

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await api.post("/auth/logout");
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Logout failed");
  }
});

// super_admin only — creates another user. Doesn't touch the current session.
export const registerUser = createAsyncThunk(
  "auth/register",
  async ({ name, email, password, role }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
        role,
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Unable to register user");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearRegisterStatus: (state) => {
      state.registerStatus = "idle";
      state.registerError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.authReady = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.error = action.payload;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.accessToken = action.payload.accessToken;
        state.authReady = true;

        // Recover role/id from the JWT so role-gated UI works even
        // though /refresh doesn't return the full user object.
        const decoded = decodeJwtPayload(action.payload.accessToken);
        if (decoded) {
          state.user = {
            ...state.user,
            id: decoded.id || decoded._id || state.user?.id,
            role: decoded.role || state.user?.role,
          };
        }
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.status = "unauthenticated";
        state.accessToken = null;
        state.user = null;
        state.authReady = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.status = "unauthenticated";
        state.accessToken = null;
        state.user = null;
      })
      .addCase(registerUser.pending, (state) => {
        state.registerStatus = "loading";
        state.registerError = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.registerStatus = "succeeded";
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.registerStatus = "failed";
        state.registerError = action.payload;
      });
  },
});

export const { clearRegisterStatus } = authSlice.actions;
export default authSlice.reducer;
