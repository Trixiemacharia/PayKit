import { usePlan } from "../context/PlanContext";

const NAV = [
  { id: "overview",      label: "Overview",        minTier: 1 },
  { id: "payments",      label: "Payments",        minTier: 1 },
  { id: "customers",     label: "Customers",       minTier: 2 },
  { id: "subscriptions", label: "Subscriptions",   minTier: 2 },
  { id: "analytics",     label: "Analytics",       minTier: 2 },
  { id: "settings",      label: "Settings",         minTier: 1 },
];

export default function TenantSidebar({ active, onChange, onLogout, businessName }) {
  const { tier, plan } = usePlan();

  return (
    <div style={styles.sidebar}>
      {/* Logo + business name */}
      <div style={styles.logo}>
        <p style={styles.logoText}>PayKit</p>
        <p style={styles.businessName}>{businessName || "My Business"}</p>
        <span style={styles.planBadge}>{plan}</span>
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        {NAV.map((item) => {
          const locked = tier < item.minTier;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
                ...(locked ? styles.navItemLocked : {}),
              }}
              onClick={() => onChange(item.id)}
              title={locked ? `Available on Pro plan and above` : item.label}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
              {locked && <span style={styles.padlock}>🔒</span>}
            </button>
          );
        })}
      </nav>

      {/* Plan indicator */}
      <div style={styles.planBox}>
        <p style={styles.planBoxLabel}>Current plan</p>
        <p style={styles.planBoxName}>{plan}</p>
        {tier < 3 && (
          <button
            style={styles.upgradeHint}
            onClick={() => onChange("customers")}
          >
            Upgrade for more →
          </button>
        )}
      </div>

      {/* Logout */}
      <button style={styles.logout} onClick={onLogout}>
        ↩ Logout
      </button>
    </div>
  );
}

const styles = {
  sidebar: { width: "240px", minHeight: "100vh", background: "#1A2E2A", display: "flex", flexDirection: "column", flexShrink: 0 },
  logo: { padding: "24px 20px 20px", borderBottom: "1px solid #2D4A44" },
  logoText: { color: "#00A651", fontSize: "22px", fontWeight: "700", margin: "0 0 4px" },
  businessName: { color: "#9CA3AF", fontSize: "12px", margin: "0 0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  planBadge: { background: "#2D4A44", color: "#00A651", fontSize: "10px", padding: "3px 8px", borderRadius: "10px", fontWeight: "700" },
  nav: { flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" },
  navItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", color: "#9CA3AF", fontSize: "14px", cursor: "pointer", textAlign: "left", width: "100%" },
  navItemActive: { background: "#00A651", color: "#fff" },
  navItemLocked: { opacity: 0.5, cursor: "pointer" },
  navIcon: { fontSize: "16px", width: "20px", textAlign: "center", flexShrink: 0 },
  navLabel: { flex: 1 },
  padlock: { fontSize: "11px", marginLeft: "auto" },
  planBox: { margin: "0 12px 12px", padding: "12px", background: "#2D4A44", borderRadius: "8px" },
  planBoxLabel: { margin: "0 0 4px", fontSize: "10px", color: "#6B7280", textTransform: "uppercase" },
  planBoxName: { margin: "0 0 8px", fontSize: "14px", fontWeight: "700", color: "#fff" },
  upgradeHint: { background: "none", border: "none", color: "#00A651", fontSize: "11px", cursor: "pointer", padding: 0, fontWeight: "600" },
  logout: { margin: "12px", padding: "10px", background: "none", border: "1px solid #2D4A44", borderRadius: "8px", color: "#9CA3AF", cursor: "pointer", fontSize: "13px" },
};