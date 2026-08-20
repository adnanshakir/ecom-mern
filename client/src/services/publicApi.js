import axios from "axios";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

export default publicApi;