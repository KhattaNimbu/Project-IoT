// Centralized API client configuration
//
// In development (Vite dev server), the proxy in vite.config.ts rewrites
// /api/* → http://localhost:5000/api/*, so the base URL is just "".
//
// In production builds (deployed to Vercel/Netlify/etc.), there is no proxy,
// so we need the full backend URL from the VITE_API_URL env var.
//
// VITE_API_URL should be the full base, e.g. "https://backend.onrender.com/api"
// During dev we leave it blank so requests go through the Vite proxy.

import axios from "axios";

const rawBase = import.meta.env.VITE_API_URL ?? "";

// Normalise: strip trailing slash if present
const API_BASE = rawBase.replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE || "/api", // fallback for local dev → uses Vite proxy
  timeout: 15000,
});

export default api;
export { API_BASE };
