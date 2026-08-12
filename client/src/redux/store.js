import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/slices/authSlice";
import brandsReducer from "@/redux/slices/brandsSlice";
import categoriesReducer from "@/redux/slices/categoriesSlice";
import customerAuthReducer from "@/redux/slices/customerAuthSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      brands: brandsReducer,
      categories: categoriesReducer,
      customerAuth: customerAuthReducer,
    },
  });