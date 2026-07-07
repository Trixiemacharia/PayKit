import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getDashboardStats, getRecentTransactions } from "../api/client";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, txRes] = await Promise.all([
        getDashboardStats(),
        getRecentTransactions(filter),
      ]);
      setStats(statsRes.data);
      setTransactions(txRes.data.transactions);
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  function formatKES(amount) {
    return Number(amount).toLocaleString("en-KE", {
      style: "currency",
      currency: "KES",
    });
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  }

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>PayKit</h1>
        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
      </div>

      {/* Stat cards */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Revenue" value={formatKES(stats.total_revenue)} color="#00A651" />
        <StatCard label="Last 30 Days" value={formatKES(stats.recent_revenue)} color="#3B8BD0" />
        <StatCard label="Active Subscriptions" value={stats.active_subscriptions} color="#7C3AED" />
        <StatCard label="Failed Payments (30d)" value={stats.failed_payments} color="#DC2626" />
      </div>

      {/* Revenue chart */}
      <div style={styles.chartCard}>
        <h3 style={styles.cardTitle}>Revenue — Last 30 Days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.daily_revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `KES ${v.toLocaleString()}`} />
            <Tooltip formatter={(value) => formatKES(value)} />
            <Line type="monotone" dataKey="revenue" stroke="#00A651" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>Recent Transactions</h3>
          <div style={styles.filters}>
            {["", "SUCCESS", "FAILED", "PENDING"].map((s) => (
              <button
                key={s}
                style={{ ...styles.filterBtn, ...(filter === s ? styles.filterActive : {}) }}
                onClick={() => setFilter(s)}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              {["Phone", "Amount", "Status", "Receipt", "Date"].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td style={styles.td}>{t.phone}</td>
                <td style={styles.td}>{formatKES(t.amount)}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: badgeColor(t.status) }}>
                    {t.status}
                  </span>
                </td>
                <td style={styles.td}>{t.mpesa_receipt || "—"}</td>
                <td style={styles.td}>{t.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <p style={styles.empty}>No transactions found.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, color }}>{value}</p>
    </div>
  );
}

function badgeColor(status) {
  return { SUCCESS: "#D1FAE5", FAILED: "#FEE2E2", PENDING: "#FEF3C7", CANCELLED: "#F3F4F6" }[status] || "#F3F4F6";
}

const styles = {
  page: { minHeight: "100vh", background: "#F9FAFB", padding: "24px" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: "16px", color: "#6B7280" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  logo: { color: "#00A651", margin: 0, fontSize: "24px" },
  logoutBtn: { padding: "8px 16px", background: "none", border: "1px solid #D1D5DB", borderRadius: "6px", cursor: "pointer", color: "#6B7280" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" },
  statCard: { background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  statLabel: { margin: "0 0 8px", fontSize: "13px", color: "#6B7280" },
  statValue: { margin: 0, fontSize: "24px", fontWeight: "700" },
  chartCard: { background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "24px" },
  cardTitle: { margin: "0 0 16px", fontSize: "15px", color: "#1A2E2A" },
  tableCard: { background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  filters: { display: "flex", gap: "8px" },
  filterBtn: { padding: "6px 12px", border: "1px solid #D1D5DB", borderRadius: "6px", cursor: "pointer", fontSize: "12px", background: "#fff", color: "#6B7280" },
  filterActive: { background: "#00A651", color: "#fff", border: "1px solid #00A651" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 12px", fontSize: "12px", color: "#6B7280", borderBottom: "1px solid #F3F4F6", fontWeight: "600" },
  td: { padding: "12px", fontSize: "13px", borderBottom: "1px solid #F3F4F6", color: "#374151" },
  badge: { padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" },
  empty: { textAlign: "center", color: "#6B7280", padding: "32px", fontSize: "14px" },
};