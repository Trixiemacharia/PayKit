import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/Dashboard";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("access_token");
  return token ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }){
  const token = localStorage.getItem("access_token");
  const isSuperuser = localStorage.getItem("is_superuser") === "true";
  if (!token) return <Navigate to="/login" />;
  if (!isSuperuser) return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={<PrivateRoute><Dashboard /></PrivateRoute>}
        />
        <Route
          path="/admin-dashboard"
          element={<AdminRoute><AdminDashboard /></AdminRoute>}
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}