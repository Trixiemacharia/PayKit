import { useState, useEffect } from "react";
import { getTenantSubscriptions } from "../api/client";
import Badge from "../components/Badge";

export default function TenantSubscriptions() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("active");

  useEffect(() => {
    getTenantSubscriptions().then(r => {
      setData(r.data);
      setLoading(false);
    });
  }, []);

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  if (loading) return <p style={{ color: "#6B7280", padding: "40px" }}>Loading subscriptions...</p>;

  const TABS = [
    { id: "active",   label: `Active (${data.active.length})` },
    { id: "expiring", label: `Expiring Soon (${data.expiring_soon.length})`, warn: data.expiring_soon.length > 0 },
    { id: "expired",  label: `Recently Expired (${data.recently_expired.length})` },
  ];

  const current =
    tab === "active"   ? data.active :
    tab === "expiring" ? data.expiring_soon :
    data.recently_expired;

  return (
    <div>
      <h2 style={styles.title}>Subscriptions</h2>

      {/* Warning banner */}
      {data.expiring_soon.length > 0 && (
        <div style={styles.warnBanner}>
          ⚠️ {data.expiring_soon.length} subscription{data.expiring_soon.length > 1 ? "s" : ""} expiring within 7 days — consider reaching out to those customers.
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{
              ...styles.tab,
              ...(tab === t.id ? styles.tabActive : {}),
              ...(t.warn ? styles.tabWarn : {}),
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Phone", "Plan", "Price", "Started", "Expires", "Days Left", "Status"].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.map(s => (
              <tr key={s.id}>
                <td style={styles.td}>{s.phone}</td>
                <td style={styles.td}><strong>{s.plan}</strong></td>
                <td style={styles.td}>{fmt(s.price_kes)}/mo</td>
                <td style={styles.td}>{s.start_date}</td>
                <td style={styles.td}>{s.end_date}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.daysLeft,
                    color: s.days_left <= 3 ? "#DC2626" : s.days_left <= 7 ? "#F0A500" : "#065F46",
                  }}>
                    {s.days_left > 0 ? `${s.days_left}d` : "Expired"}
                  </span>
                </td>
                <td style={styles.td}><Badge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {current.length === 0 && (
          <p style={styles.empty}>
            {tab === "active"   ? "No active subscriptions." :
             tab === "expiring" ? "No subscriptions expiring soon. 🎉" :
             "No recently expired subscriptions."}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  title: { margin: "0 0 16px", fontSize: "20px", color: "#1A2E2A" },
  warnBanner: { background: "#FEF3C7", border: "1px solid #F0A500", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#92400E" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px" },
  tab: { padding: "8px 16px", border: "1px solid #D1D5DB", borderRadius: "8px", cursor: "pointer", fontSize: "13px", background: "#fff", color: "#6B7280" },
  tabActive: { background: "#1A2E2A", color: "#fff", border: "1px solid #1A2E2A" },
  tabWarn: { border: "1px solid #F0A500", color: "#92400E" },
  tableWrap: { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "12px 16px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase", background: "#FAFAFA" },
  td: { padding: "14px 16px", borderBottom: "1px solid #F9FAFB" },
  daysLeft: { fontWeight: "700", fontSize: "13px" },
  empty: { textAlign: "center", color: "#9CA3AF", padding: "40px" },
};