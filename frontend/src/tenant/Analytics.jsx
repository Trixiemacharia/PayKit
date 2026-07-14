import { useState, useEffect } from "react";
import { getTenantAnalytics } from "../api/client";
import StatCard from "../components/StatCard";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

export default function TenantAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getTenantAnalytics().then(r => setData(r.data));
  }, []);

  if (!data) return <p style={{ color: "#6B7280", padding: "40px" }}>Loading analytics...</p>;

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  return (
    <div>
      <h2 style={styles.title}>Analytics</h2>

      <div style={styles.grid}>
        <StatCard
          label="Payment Success Rate"
          value={`${data.success_rate}%`}
          color={data.success_rate >= 90 ? "#00A651" : "#F0A500"}
        />
        <StatCard
          label="Churn This Month"
          value={data.churn_this_month}
          color="#DC2626"
          sub={`Last month: ${data.churn_last_month}`}
        />
        <StatCard
          label="Top Customer Spend"
          value={data.top_customers[0] ? fmt(data.top_customers[0].total_spent) : "—"}
          color="#7C3AED"
        />
        <StatCard
          label="Peak Payment Day"
          value={data.peak_days[0] ? data.peak_days[0].day : "—"}
          color="#3B8BD0"
          sub="of the month"
        />
      </div>

      {/* Revenue trend */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Monthly Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.monthly_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `KES ${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmt(v)} />
            <Bar dataKey="revenue" fill="#00A651" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.row}>
        {/* Top customers */}
        <div style={{ ...styles.card, flex: 1 }}>
          <h3 style={styles.cardTitle}>Top Customers by Spend</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {data.top_customers.map((c, i) => (
                <tr key={c.phone}>
                  <td style={styles.td}>
                    <span style={styles.rank}>#{i + 1}</span>
                  </td>
                  <td style={styles.td}>{c.phone}</td>
                  <td style={styles.td}>{fmt(c.total_spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Peak payment days */}
        <div style={{ ...styles.card, flex: 1 }}>
          <h3 style={styles.cardTitle}>Peak Payment Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.peak_days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="payments" fill="#3B8BD0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const styles = {
  title: { margin: "0 0 24px", fontSize: "20px", color: "#1A2E2A" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" },
  card: { background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "20px" },
  row: { display: "flex", gap: "20px" },
  cardTitle: { margin: "0 0 16px", fontSize: "15px", color: "#1A2E2A" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "8px 12px", fontSize: "11px", color: "#6B7280", borderBottom: "1px solid #F3F4F6", fontWeight: "600" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F9FAFB" },
  rank: { fontWeight: "700", color: "#00A651" },
};