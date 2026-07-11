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

// ─── Admin API ───────────────────────────────────────────
export const getAdminOverview = () =>
  client.get("/dashboard/admin/overview/");

export const getAdminBusinesses = () =>
  client.get("/dashboard/admin/businesses/");

export const adminBusinessAction = (tenantId, action, extra = {}) =>
  client.patch(`/dashboard/admin/businesses/${tenantId}/`, { action, ...extra });

export const getAdminRevenue = () =>
  client.get("/dashboard/admin/revenue/");

export const getAdminTransactions = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return client.get(`/dashboard/admin/transactions/${params ? `?${params}` : ""}`);
};

export const getAdminUsers = () =>
  client.get("/dashboard/admin/users/");

export const adminUserAction = (userId, action, extra = {}) =>
  client.patch(`/dashboard/admin/users/${userId}/`, { action, ...extra });

export const getAdminAnalytics = () =>
  client.get("/dashboard/admin/analytics/");

export const getAdminFailedPayments = () =>
  client.get("/dashboard/admin/failed-payments/");

export const retryPayment = (transactionId) =>
  client.post('/dashboard/admin/retry/${transactionId}/');