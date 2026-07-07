import axios from "axios";

const API_BASE = "http://localhost:8000/api";

const client = axios.create({
  baseURL: API_BASE,
});

// Automatically attach the JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (username, password) =>
  client.post("/token/", { username, password });

export const register = (username, email, password) =>
  client.post("/users/register/", { username, email, password });

// Tenant + Plans
export const createTenant = (name, slug) =>
  client.post("/users/create-tenant/", { name, slug });

export const getPlans = () =>
  client.get("/users/plans/");

// Payments
export const triggerSTKPush = (phone, amount) =>
  client.post("/payments/stk-push/", { phone, amount });

export const getPaymentStatus = (checkoutRequestId) =>
  client.get(`/payments/status/${checkoutRequestId}/`);

// Dashboard
export const getDashboardStats = () =>
  client.get("/dashboard/stats/");

export const getRecentTransactions = (status = "") =>
  client.get(`/dashboard/transactions/${status ? `?status=${status}` : ""}`);