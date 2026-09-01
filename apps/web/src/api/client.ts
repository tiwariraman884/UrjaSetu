/** Centralized typed API client for UrjaSetu. */
import axios, { AxiosInstance, AxiosError } from "axios";

const apiUrl = "http://localhost:8000";
const gatewayUrl =
  import.meta.env.VITE_PAYMENT_GATEWAY_URL || "http://127.0.0.1:3001";

export const api: AxiosInstance = axios.create({
  baseURL: `${apiUrl}/api/v1`,
  timeout: 15000,
});

export const gateway: AxiosInstance = axios.create({
  baseURL: gatewayUrl,
  timeout: 30000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("urjasetu_token");

  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }

  return cfg;
});

export function apiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;

    if (data?.error?.message) return data.error.message;

    if (data?.detail) {
      return typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    }

    if (err.response?.status === 402) {
      return "Payment required (HTTP 402)";
    }

    if (err.code === "ECONNABORTED") {
      return "Request timed out";
    }

    return err.message;
  }

  return "An unexpected error occurred";
}

export default api;

