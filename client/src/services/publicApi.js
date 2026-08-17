import axios from "axios";

const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
});

export default publicApi;