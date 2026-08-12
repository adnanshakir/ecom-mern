import customerApi from "@/services/storefront/customerAxios";

export const registerCustomerRequest = (payload) => customerApi.post("/customers/auth/register", payload);

export const loginCustomerRequest = (payload) => customerApi.post("/customers/auth/login", payload);

export const refreshCustomerRequest = () => customerApi.post("/customers/auth/refresh");

export const logoutCustomerRequest = () => customerApi.post("/customers/auth/logout");
