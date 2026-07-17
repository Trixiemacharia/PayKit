import { useState, useEffect } from "react";
import { getTenantOverview, triggerSTKPush, getPaymentStatus } from "../api/client";
import StatCard from "../components/StatCard";
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

export default function TenantOverview() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showCharge, setShowCharge] = useState(false);
  const [phone, setPhone]       = useState("");
  const [amount, setAmount]     = useState("");
  const [chargeMsg, setChargeMsg] = useState("");
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    getTenantOverview().then(r => { setData(r.data); setLoading(false); });
  }, []);

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  async function handleCharge() {
    setCharging(true);
    setChargeMsg("");
    try {
      const res = await triggerSTKPush(phone, amount);
      const checkoutId = res.data.checkout_request_id;
      setChargeMsg("📱 STK Push sent. Waiting for PIN...");

      const interval = setInterval(async () => {
        const s = await getPaymentStatus(checkoutId);
        if (s.data.status === "SUCCESS") {
          clearInterval(interval);
          setChargeMsg("✅ Payment successful!");
          setCharging(false);
          setPhone(""); setAmount("");
          getTenantOverview().then(r => setData(r.data));
        } else if (["FAILED", "CANCELLED"].includes(s.data.status)) {
          clearInterval(interval);
          setChargeMsg("❌ Payment failed. Try again.");
          setCharging(false);
        }
      }, 3000);
    } catch {
      setChargeMsg("Failed to initiate payment.");
      setCharging(false);
    }
  }

  if (loading) return <p style={styles.loading}>Loading...</p>;

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>Overview</h2>
        <button style={styles.chargeBtn} onClick={() => setShowCharge(!showCharge)}>
          + Charge Customer
        </button>
      </div>

      {/* Quick charge panel */}
      {showCharge && (
        <div style={styles.chargePanel}>
          <h4 style={styles.chargePanelTitle}>Charge a Customer</h4>
          <div style={styles.chargeRow}>
            <input
              style={styles.chargeInput}
              placeholder="Phone (2547XXXXXXXX)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <input
              style={styles.chargeInput}
              placeholder="Amount (KES)"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <button
              style={styles.sendBtn}
              onClick={handleCharge}
              disabled={charging}
            >
              {charging ? "Sending..." : "Send STK Push"}
            </button>
          </div>
          {chargeMsg && <p style={styles.chargeMsg}>{chargeMsg}</p>}
        </div>
      )}
      {/* Expiry warning banner */}
      {data.expiring_soon > 0 && (
        <div style={styles.expiryBanner}>
          <span style={styles.expiryIcon}>⚠️</span>
          <div>
            <strong>Your subscription is expiring soon.</strong>
            <p style={styles.expiryText}>
              You have {data.expiring_soon} subscription{data.expiring_soon > 1 ? "s" : ""} expiring within 7 days.
              Renew now to avoid losing access to your dashboard features.
            </p>
          </div>
          <button
            style={styles.renewBtn}
            onClick={() => setShowCharge(true)}
          >
            Renew Now
          </button>
       </div>
      )}

      {/* Stat cards */}
      <div style={styles.grid}>
        <StatCard
          label="Total Revenue"
          value={fmt(data.total_revenue)}
          color="#00A651"
        />
        <StatCard
          label="This Month"
          value={fmt(data.this_month_revenue)}
          color="#3B8BD0"
        />
        <StatCard
          label="Active Subscriptions"
          value={data.active_subscriptions}
          color="#7C3AED"
          sub={data.expiring_soon > 0 ? `${data.expiring_soon} expiring soon` : null}
        />
        <StatCard
          label="Payment Success Rate"
          value={`${data.success_rate}%`}
          color={data.success_rate >= 90 ? "#00A651" : "#F0A500"}
        />
      </div>

      {/* Revenue chart */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Revenue — Last 30 Days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.daily_revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={v => `KES ${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={v => fmt(v)} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#00A651"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick stats row */}
      <div style={styles.quickRow}>
        <div style={styles.quickCard}>
          <p style={styles.quickLabel}>Failed Payments (30d)</p>
          <p style={{ ...styles.quickValue, color: "#DC2626" }}>
            {data.failed_payments_30d}
          </p>
        </div>
        <div style={styles.quickCard}>
          <p style={styles.quickLabel}>Expiring Soon</p>
          <p style={{ ...styles.quickValue, color: "#F0A500" }}>
            {data.expiring_soon}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  loading: { color: "#6B7280", padding: "40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { margin: 0, fontSize: "20px", color: "#1A2E2A" },
  chargeBtn: { padding: "10px 20px", background: "#00A651", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  chargePanel: { background: "#fff", border: "1px solid #D1FAE5", borderRadius: "10px", padding: "20px", marginBottom: "24px" },
  chargePanelTitle: { margin: "0 0 14px", color: "#1A2E2A", fontSize: "15px" },
  chargeRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  chargeInput: { padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "13px", flex: 1, minWidth: "180px" },
  sendBtn: { padding: "10px 20px", background: "#1A2E2A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  chargeMsg: { margin: "12px 0 0", fontSize: "13px", color: "#374151" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" },
  card: { background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "20px" },
  cardTitle: { margin: "0 0 16px", fontSize: "15px", color: "#1A2E2A" },
  quickRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  quickCard: { background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  quickLabel: { margin: "0 0 8px", fontSize: "12px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" },
  quickValue: { margin: 0, fontSize: "28px", fontWeight: "700" },
  expiryBanner: {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  background: "#FEF3C7",
  border: "1px solid #F0A500",
  borderRadius: "10px",
  padding: "16px 20px",
  marginBottom: "24px",
},
expiryIcon: { fontSize: "24px", flexShrink: 0 },
expiryText: { margin: "4px 0 0", fontSize: "13px", color: "#92400E" },
renewBtn: {
  marginLeft: "auto",
  padding: "8px 16px",
  background: "#F0A500",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px",
  flexShrink: 0,
},
};