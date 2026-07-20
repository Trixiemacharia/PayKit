import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TenantSidebar     from "../components/TenantSidebar";
import UpgradePrompt from "../components/UpgradePrompt";
import TenantOverview    from "../tenant/Overview";
import TenantPayments    from "../tenant/Payments";
import TenantCustomers   from "../tenant/Customers";
import TenantSubscriptions from "../tenant/Subscriptions";
import TenantAnalytics   from "../tenant/Analytics";
import TenantSettings    from "../tenant/Settings";
import { getTenantSettings } from "../api/client";
import { usePlan } from "../context/PlanContext";
import { logout } from "../api/client";

const SECTION_TIERS = {
  overview:      1,
  payments:      1,
  customers:     2,
  subscriptions: 2,
  analytics:     2,
  settings:      1,
};

// Which plan name to show in the upgrade prompt
const REQUIRED_PLAN = {
  customers:     "Pro",
  subscriptions: "Pro",
  analytics:     "Pro",
};

const COMPONENTS = {
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
  const { tier } = usePlan();
  const navigate = useNavigate();

  useEffect(() => {
    getTenantSettings()
      .then(r => setBusinessName(r.data.business_name))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    try {
      const refresh = localStorage.getItem("refresh_token");
      await logout(refresh);
    } catch {}
    finally{
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("is_superuser");
      navigate("/login");
    }
  }

   // Decide what to render
  const requiredTier = SECTION_TIERS[active] || 1;
  const isLocked     = tier < requiredTier;
  const content      = isLocked
    ? <UpgradePrompt requiredPlan={REQUIRED_PLAN[active] || "Pro"} />
    : COMPONENTS[active];

  return (
    <div style={styles.layout}>
      <TenantSidebar
        active={active}
        onChange={setActive}
        onLogout={handleLogout}
        businessName={businessName}
      />
      <main style={styles.main}>
        {content}
      </main>
    </div>
  );
}

const styles = {
  layout: { display: "flex", minHeight: "100vh", background: "#F9FAFB" },
  main: { flex: 1, padding: "32px", overflowY: "auto" },
};