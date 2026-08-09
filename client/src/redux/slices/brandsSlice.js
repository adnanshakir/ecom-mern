import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getBrands, createBrand, updateBrand, deleteBrand } from "@/services/brands";

const initialState = {
  items: [],
  loading: false,
  error: null,
  fetched: false, // true once loaded — lets consumers skip refetching on remount
};

export const fetchBrands = createAsyncThunk(
  "brands/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getBrands();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load brands");
    }
  }
);

export const addBrand = createAsyncThunk(
  "brands/add",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await createBrand(payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create brand");
    }
  }
);

export const editBrand = createAsyncThunk(
  "brands/edit",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await updateBrand(id, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update brand");
    }
  }
);

export const removeBrand = createAsyncThunk(
  "brands/remove",
  async (id, { rejectWithValue }) => {
    try {
      await deleteBrand(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete brand");
    }
  }
);

const brandsSlice = createSlice({
  name: "brands",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.fetched = true;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addBrand.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(editBrand.fulfilled, (state, action) => {
        const index = state.items.findIndex((b) => b._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(removeBrand.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b._id !== action.payload);
      });
  },
});

export default brandsSlice.reducer;