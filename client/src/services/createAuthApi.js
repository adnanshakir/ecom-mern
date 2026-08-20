import axios from "axios";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

/**
 * Factory that creates an authenticated Axios instance with:
 *   - Automatic Bearer token injection from Redux state
 *   - Silent 401 → refresh → retry interceptor
 *   - Concurrent-request queuing during refresh
 *
 * @param {Object} options
 * @param {string} options.stateKey           Redux state slice key (e.g. "auth" | "customerAuth")
 * @param {string} options.refreshUrlFragment URL substring to detect refresh calls and avoid infinite loops
 * @param {() => Promise<{refreshThunk, logoutAction}>} options.loadAuth
 *   Async loader returning the refresh thunk and logout action.
 *   Uses a callback instead of a static import path so the bundler can
 *   resolve the dynamic import correctly (avoids circular deps).
 */
export function createAuthenticatedApi({
  stateKey,
  refreshUrlFragment,
  loadAuth,
}) {
  let store;

  const injectStore = (_store) => {
    store = _store;
  };

  const api = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: true,
  });

  // Attach the in-memory access token to every request.
  api.interceptors.request.use((config) => {
    const accessToken = store?.getState()?.[stateKey]?.accessToken;
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

  // On a 401, try a single silent refresh (using the httpOnly cookie) and
  // retry the original request once. Concurrent 401s share one refresh call.
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response?.status !== 401 ||
        originalRequest._retry ||
        originalRequest.url?.includes(refreshUrlFragment)
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
        const { refreshThunk, logoutAction } = await loadAuth();
        const result = await store.dispatch(refreshThunk());

        if (refreshThunk.rejected.match(result)) {
          store.dispatch(logoutAction());
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
    },
  );

  return { api, injectStore };
}
