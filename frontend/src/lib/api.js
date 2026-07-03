import axios from "axios";

const rawUrl = process.env.REACT_APP_BACKEND_URL || "";
const BACKEND_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tcl_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(err) {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return err?.message || "Something went wrong";
}
