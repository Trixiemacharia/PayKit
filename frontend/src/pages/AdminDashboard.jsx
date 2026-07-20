import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import Overview      from "../admin/Overview";
import Businesses    from "../admin/Businesses";
import Revenue       from "../admin/Revenue";
import Transactions  from "../admin/Transactions";
import Users         from "../admin/Users";
import Analytics     from "../admin/Analytics";
import FailedPayments from "../admin/FailedPayments";
import Support       from "../admin/Support";
import Settings      from "../admin/Settings";
import { logout } from "../api/client";

const SECTIONS = {
  overview:     <Overview />,
  businesses:   <Businesses />,
  revenue:      <Revenue />,
  transactions: <Transactions />,
  users:        <Users />,
  analytics:    <Analytics />,
  failed:       <FailedPayments />,
  support:      <Support />,
  settings:     <Settings />,
};

export default function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const navigate = useNavigate();

async function handleLogout() {
  try {
    const refresh = localStorage.getItem("refresh_token");
    await logout(refresh);
  } catch { /* fail silently */ }
  finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("is_superuser");
    navigate("/login");
  }
}

  return (
    <div style={styles.layout}>
      <AdminSidebar
        active={active}
        onChange={setActive}
        onLogout={handleLogout}
      />
      <main style={styles.main}>
        {SECTIONS[active]}
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "#F9FAFB",
  },
  main: {
    flex: 1,
    padding: "32px",
    overflowY: "auto",
  },
};