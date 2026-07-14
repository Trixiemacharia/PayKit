const NAV = [
  { id: "overview",       label: "Overview",      },
  { id: "payments",       label: "Payments",      },
  { id: "customers",      label: "Customers",     },
  { id: "subscriptions",  label: "Subscriptions", },
  { id: "analytics",      label: "Analytics",     },
  { id: "settings",       label: "Settings",      },
];

export default function TenantSidebar({ active, onChange, onLogout, businessName }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <div>
          <p style={styles.logoText}>PayKit</p>
          <p style={styles.businessName}>{businessName || "My Business"}</p>
        </div>
      </div>

      <nav style={styles.nav}>
        {NAV.map((item) => (
          <button
            key={item.id}
            style={{
              ...styles.navItem,
              ...(active === item.id ? styles.navItemActive : {}),
            }}
            onClick={() => onChange(item.id)}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button style={styles.logout} onClick={onLogout}>
        ↩ Logout
      </button>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "240px",
    minHeight: "100vh",
    background: "#1A2E2A",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  logo: {
    padding: "24px 20px 20px",
    borderBottom: "1px solid #2D4A44",
  },
  logoText: {
    color: "#00A651",
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 0 4px",
  },
  businessName: {
    color: "#9CA3AF",
    fontSize: "12px",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  nav: {
    flex: 1,
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "none",
    background: "none",
    color: "#9CA3AF",
    fontSize: "14px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  navItemActive: {
    background: "#00A651",
    color: "#fff",
  },
  navIcon: { fontSize: "16px", width: "20px", textAlign: "center" },
  logout: {
    margin: "12px",
    padding: "10px",
    background: "none",
    border: "1px solid #2D4A44",
    borderRadius: "8px",
    color: "#9CA3AF",
    cursor: "pointer",
    fontSize: "13px",
  },
};