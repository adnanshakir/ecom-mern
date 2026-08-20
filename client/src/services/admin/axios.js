import { createAuthenticatedApi } from "../createAuthApi";

const { api, injectStore } = createAuthenticatedApi({
  stateKey: "auth",
  refreshUrlFragment: "/auth/refresh",
  loadAuth: async () => {
    const { refreshAccessToken, logout } = await import(
      "@/redux/slices/authSlice"
    );
    return { refreshThunk: refreshAccessToken, logoutAction: logout };
  },
});

export { injectStore };
export default api;
