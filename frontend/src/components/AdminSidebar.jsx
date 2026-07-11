const NAV = [
  { id: "overview",        label: "Dashboard",      },
  { id: "businesses",      label: "Businesses",     },
  { id: "revenue",         label: "Revenue",        },
  { id: "transactions",    label: "Transactions",   },
  { id: "users",           label: "Users",          },
  { id: "analytics",       label: "Analytics",      },
  { id: "failed",          label: "Failed Payments",},
  { id: "support",         label: "Support",        },
  { id: "settings",        label: "Settings",       },
];

export default function AdminSidebar({ active, onChange, onLogout }) {
  return (
    <div style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoText}>PayKit</span>
        <span style={styles.adminBadge}>ADMIN</span>
      </div>

      {/* Nav items */}
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

      {/* Logout */}
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
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoText: { color: "#00A651", fontSize: "22px", fontWeight: "700" },
  adminBadge: {
    background: "#00A651",
    color: "#fff",
    fontSize: "9px",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: "700",
    letterSpacing: "0.08em",
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
    transition: "all 0.15s",
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