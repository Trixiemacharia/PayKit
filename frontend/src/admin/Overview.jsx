import { useState, useEffect } from "react";
import { getAdminOverview } from "../api/client";
import StatCard from "../components/StatCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminOverview().then(r => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <p style={styles.loading}>Loading overview...</p>;

  const fmt = (n) => Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  return (
    <div>
      <h2 style={styles.title}>Platform Overview</h2>

      <div style={styles.grid}>
        <StatCard label="Total Businesses"     value={data.total_businesses}      color="#1A2E2A" />
        <StatCard label="New Signups (Month)"  value={data.new_signups_this_month} color="#3B8BD0" />
        <StatCard label="MRR"                  value={fmt(data.mrr)}              color="#00A651" />
        <StatCard label="ARR"                  value={fmt(data.arr)}              color="#00A651" sub="Projected" />
        <StatCard label="Total Revenue"        value={fmt(data.total_revenue)}    color="#7C3AED" />
        <StatCard label="Successful Payments"  value={data.successful_payments}   color="#065F46" />
        <StatCard label="Failed Payments"      value={data.failed_payments}       color="#DC2626" />
        <StatCard label="Active Subscriptions" value={data.active_subscriptions}  color="#F0A500" />
      </div>
    </div>
  );
}

const styles = {
  title: { margin: "0 0 24px", fontSize: "20px", color: "#1A2E2A" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" },
  loading: { color: "#6B7280", padding: "40px" },
};