"use client";

import { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/redux/store";
import { injectStore } from "@/services/axios";
import { refreshAccessToken } from "@/redux/slices/authSlice";

export default function StoreProvider({ children }) {
  const storeRef = useRef(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
    injectStore(storeRef.current);
  }

  useEffect(() => {
    // Access token is in-memory only, so on every full page load we try a
    // silent refresh against the httpOnly cookie to recover the session.
    storeRef.current.dispatch(refreshAccessToken());
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
