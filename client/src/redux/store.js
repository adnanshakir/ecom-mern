import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/slices/authSlice";
import brandsReducer from "@/redux/slices/brandsSlice";
import categoriesReducer from "@/redux/slices/categoriesSlice";
import customerAuthReducer from "@/redux/slices/customerAuthSlice";
import cartReducer from "@/redux/slices/cartSlice";
import wishlistReducer from "@/redux/slices/wishlistSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      brands: brandsReducer,
      categories: categoriesReducer,
      customerAuth: customerAuthReducer,
      cart: cartReducer,
      wishlist: wishlistReducer,
    },
  });