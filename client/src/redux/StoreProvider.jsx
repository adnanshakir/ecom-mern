"use client";

import { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/redux/store";
import { injectStore } from "@/services/admin/axios";
import { injectCustomerStore } from "@/services/storefront/customerAxios";
import { refreshAccessToken } from "@/redux/slices/authSlice";
import { refreshCustomerToken } from "@/redux/slices/customerAuthSlice";
import { fetchCart } from "@/redux/slices/cartSlice";
import { fetchWishlist } from "@/redux/slices/wishlistSlice";

export default function StoreProvider({ children }) {
  const storeRef = useRef(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
    injectStore(storeRef.current);
    injectCustomerStore(storeRef.current);
  }

  useEffect(() => {
    const store = storeRef.current;

    // Restore admin session
    store.dispatch(refreshAccessToken());

    // Restore customer session — then hydrate cart + wishlist if authenticated.
    // refreshCustomerToken resolves before we check auth status, so chain off it.
    store.dispatch(refreshCustomerToken()).then((result) => {
      if (refreshCustomerToken.fulfilled.match(result)) {
        store.dispatch(fetchCart());
        store.dispatch(fetchWishlist());
      }
    });
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}