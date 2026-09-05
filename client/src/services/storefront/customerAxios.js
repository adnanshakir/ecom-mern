import axios from "axios";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

let store;

export function injectCustomerStore(_store) {
  store = _store;
}

const customerAxios = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

// Response interceptor: on 401 Unauthorized, immediately clear local customer auth state
customerAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (store) {
        // Dynamic import to prevent circular dependency
        import("@/redux/slices/customerAuthSlice").then(({ clearCustomerAuth }) => {
          store.dispatch(clearCustomerAuth());
        });
      }
    }
    return Promise.reject(error);
  }
);

export default customerAxios;