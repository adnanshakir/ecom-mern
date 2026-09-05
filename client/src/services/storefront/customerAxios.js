import { createAuthenticatedApi } from "../createAuthApi";

const { api, injectStore } = createAuthenticatedApi({
  stateKey: "customerAuth",
  refreshUrlFragment: "/customers/auth/refresh",
  loadAuth: async () => {
    const { refreshCustomerToken, customerLogout } = await import(
      "@/redux/slices/customerAuthSlice"
    );
    return { refreshThunk: refreshCustomerToken, logoutAction: customerLogout };
  },
});

export { injectStore as injectCustomerStore };
export default api;