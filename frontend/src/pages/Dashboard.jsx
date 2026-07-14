import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TenantSidebar     from "../components/TenantSidebar";
import TenantOverview    from "../tenant/Overview";
import TenantPayments    from "../tenant/Payments";
import TenantCustomers   from "../tenant/Customers";
import TenantSubscriptions from "../tenant/Subscriptions";
import TenantAnalytics   from "../tenant/Analytics";
import TenantSettings    from "../tenant/Settings";
import { getTenantSettings } from "../api/client";

const SECTIONS = {
  overview:      <TenantOverview />,
  payments:      <TenantPayments />,
  customers:     <TenantCustomers />,
  subscriptions: <TenantSubscriptions />,
  analytics:     <TenantAnalytics />,
  settings:      <TenantSettings />,
};

export default function Dashboard() {
  const [active, setActive]           = useState("overview");
  const [businessName, setBusinessName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getTenantSettings()
      .then(r => setBusinessName(r.data.business_name))
      .catch(() => {});
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("is_superuser");
    navigate("/login");
  }

  return (
    <div style={styles.layout}>
      <TenantSidebar
        active={active}
        onChange={setActive}
        onLogout={handleLogout}
        businessName={businessName}
      />
      <main style={styles.main}>
        {SECTIONS[active]}
      </main>
    </div>
  );
}

const styles = {
  layout: { display: "flex", minHeight: "100vh", background: "#F9FAFB" },
  main: { flex: 1, padding: "32px", overflowY: "auto" },
};