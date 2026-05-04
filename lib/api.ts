import axios from "axios";
import { CONFIG } from "./config";

export const axiosInstance = axios.create({
  baseURL: CONFIG.API_BASE,
  withCredentials: true,
});