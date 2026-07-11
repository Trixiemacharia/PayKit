import { useState, useEffect } from "react";
import { getAdminRevenue } from "../api/client";
import StatCard from "../components/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Revenue() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAdminRevenue().then(r => setData(r.data));
  }, []);

  if (!data) return <p style={{ color: "#6B7280", padding: "40px" }}>Loading revenue...</p>;

  const fmt = (n) => Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  return (
    <div>
      <h2 style={styles.title}>Revenue</h2>

      <div style={styles.grid}>
        <StatCard label="Platform Earnings"  value={fmt(data.platform_earnings)} color="#00A651" />
        <StatCard label="MRR"                value={fmt(data.mrr)}               color="#3B8BD0" />
        <StatCard label="ARR (Projected)"    value={fmt(data.arr)}               color="#7C3AED" />
        <StatCard label="Total Commissions"  value={fmt(data.total_commissions)}  color="#F0A500" />
      </div>

      {/* Monthly trend chart */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Monthly Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.monthly_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `KES ${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} />
            <Bar dataKey="revenue" fill="#00A651" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by plan */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Subscription Revenue by Plan</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Plan", "Price/mo", "Revenue Generated"].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.subscription_revenue.map(p => (
              <tr key={p.plan}>
                <td style={styles.td}><strong>{p.plan}</strong></td>
                <td style={styles.td}>{fmt(p.price_kes)}</td>
                <td style={styles.td}>{fmt(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  title: { margin: "0 0 24px", fontSize: "20px", color: "#1A2E2A" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" },
  card: { background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "20px" },
  cardTitle: { margin: "0 0 16px", fontSize: "15px", color: "#1A2E2A" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase" },
  td: { padding: "12px", borderBottom: "1px solid #F9FAFB", fontSize: "13px" },
};