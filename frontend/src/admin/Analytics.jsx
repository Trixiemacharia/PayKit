import { useState, useEffect } from "react";
import { getAdminAnalytics } from "../api/client";
import StatCard from "../components/StatCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAdminAnalytics().then(r => setData(r.data));
  }, []);

  if (!data) return <p style={{ color: "#6B7280", padding: "40px" }}>Loading analytics...</p>;

  return (
    <div>
      <h2 style={styles.title}>Analytics</h2>

      <div style={styles.grid}>
        <StatCard label="Total Tenants"     value={data.total_tenants}                    color="#1A2E2A" />
        <StatCard label="Converted"         value={data.converted_tenants}                color="#00A651" />
        <StatCard label="Conversion Rate"   value={`${data.conversion_rate}%`}            color="#3B8BD0" />
        <StatCard label="Churn This Month"  value={data.churn_this_month}                 color="#DC2626" />
      </div>

      {/* Growth chart */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Business Growth (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.growth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="new_businesses" stroke="#00A651" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top plans */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Top Plans by Active Subscribers</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.top_plans}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="active_subscribers" fill="#3B8BD0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const styles = {
  title: { margin: "0 0 24px", fontSize: "20px", color: "#1A2E2A" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" },
  card: { background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "20px" },
  cardTitle: { margin: "0 0 16px", fontSize: "15px", color: "#1A2E2A" },
};