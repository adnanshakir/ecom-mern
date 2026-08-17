import axios from "axios";

let store;
export const injectCustomerStore = (_store) => {
  store = _store;
};

const getCustomerBaseUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "/api";
  }
  return process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://ecom-mern-c5wz.onrender.com/api";
};

const customerApi = axios.create({
  baseURL: getCustomerBaseUrl(),
  withCredentials: true,
});

customerApi.interceptors.request.use((config) => {
  const accessToken = store?.getState()?.customerAuth?.accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

customerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/customers/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return customerApi(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshCustomerToken, customerLogout } = await import(
        "@/redux/slices/customerAuthSlice"
      );
      const result = await store.dispatch(refreshCustomerToken());

      if (refreshCustomerToken.rejected.match(result)) {
        store.dispatch(customerLogout());
        processQueue(error, null);
        return Promise.reject(error);
      }

      const newToken = result.payload.accessToken;
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return customerApi(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default customerApi;