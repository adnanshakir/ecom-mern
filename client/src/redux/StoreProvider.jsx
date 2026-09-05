"use client";

import { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/redux/store";
import { injectStore } from "@/services/admin/axios";
import { injectCustomerStore } from "@/services/storefront/customerAxios";
import { refreshAccessToken } from "@/redux/slices/authSlice";
import { restoreCustomerSession } from "@/redux/slices/customerAuthSlice";
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

    // Restore customer session via Better Auth cookie — then hydrate cart + wishlist if authenticated.
    store.dispatch(restoreCustomerSession()).then((result) => {
      if (restoreCustomerSession.fulfilled.match(result) && result.payload) {
        store.dispatch(fetchCart());
        store.dispatch(fetchWishlist());
      }
    });
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}