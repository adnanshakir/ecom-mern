"use client";

import { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/redux/store";
import { injectStore } from "@/services/admin/axios";
import { injectCustomerStore } from "@/services/storefront/customerAxios";
import { refreshAccessToken } from "@/redux/slices/authSlice";
import { refreshCustomerToken } from "@/redux/slices/customerAuthSlice";

export default function StoreProvider({ children }) {
  const storeRef = useRef(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
    injectStore(storeRef.current);
    injectCustomerStore(storeRef.current);
  }

  useEffect(() => {
    storeRef.current.dispatch(refreshAccessToken());
    storeRef.current.dispatch(refreshCustomerToken());
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}