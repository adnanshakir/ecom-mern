"use client";

import { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/redux/store";
import { injectStore } from "@/services/admin/axios";
import { injectCustomerStore } from "@/services/storefront/customerAxios";
import { refreshAccessToken } from "@/redux/slices/authSlice";
import { restoreCustomerSession } from "@/redux/slices/customerAuthSlice";
import { fetchCart, loadGuestCart } from "@/redux/slices/cartSlice";
import { fetchWishlist, loadGuestWishlist } from "@/redux/slices/wishlistSlice";

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

    // Restore customer session via Better Auth cookie — then hydrate cart + wishlist if authenticated,
    // otherwise load guest cart + wishlist from localStorage.
    store.dispatch(restoreCustomerSession()).then((result) => {
      if (restoreCustomerSession.fulfilled.match(result) && result.payload) {
        store.dispatch(fetchCart());
        store.dispatch(fetchWishlist());
      } else {
        store.dispatch(loadGuestCart());
        store.dispatch(loadGuestWishlist());
      }
    });

    // Multi-tab and cross-component sync for guest cart & wishlist
    const handleGuestCartUpdate = () => {
      const state = store.getState();
      if (state.customerAuth.status !== "authenticated") {
        store.dispatch(loadGuestCart());
      }
    };

    const handleGuestWishlistUpdate = () => {
      const state = store.getState();
      if (state.customerAuth.status !== "authenticated") {
        store.dispatch(loadGuestWishlist());
      }
    };

    window.addEventListener("guestCartChanged", handleGuestCartUpdate);
    window.addEventListener("guestWishlistChanged", handleGuestWishlistUpdate);
    window.addEventListener("storage", handleGuestCartUpdate);
    window.addEventListener("storage", handleGuestWishlistUpdate);

    return () => {
      window.removeEventListener("guestCartChanged", handleGuestCartUpdate);
      window.removeEventListener("guestWishlistChanged", handleGuestWishlistUpdate);
      window.removeEventListener("storage", handleGuestCartUpdate);
      window.removeEventListener("storage", handleGuestWishlistUpdate);
    };
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}