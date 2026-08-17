import axios from "axios";

// Interceptors live outside the React tree, so we can't use hooks here.
// The store is injected once at app startup (see StoreProvider) and referenced
// via this module-level variable instead.
let store;

export const injectStore = (_store) => {
  store = _store;
};

const getAdminBaseUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "/api";
  }
  return process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://ecom-mern-c5wz.onrender.com/api";
};

const api = axios.create({
  baseURL: getAdminBaseUrl(),
  withCredentials: true, // send/receive the httpOnly refresh cookie
});

// Attach the in-memory access token to every request.
api.interceptors.request.use((config) => {
  const accessToken = store?.getState()?.auth?.accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  pendingQueue = [];
};

// On a 401, try a single silent refresh (using the httpOnly cookie) and
// retry the original request once. Concurrent 401s share one refresh call.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Lazy import avoids a circular dependency between the store and axios.
      const { refreshAccessToken, logout } = await import(
        "@/redux/slices/authSlice"
      );
      const result = await store.dispatch(refreshAccessToken());

      if (refreshAccessToken.rejected.match(result)) {
        store.dispatch(logout());
        processQueue(error, null);
        return Promise.reject(error);
      }

      const newToken = result.payload.accessToken;
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
