import axios from "axios";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "/api";
  }
  return process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://ecom-mern-c5wz.onrender.com/api";
};

const publicApi = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

export default publicApi;