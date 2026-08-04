import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/slices/authSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
  });
