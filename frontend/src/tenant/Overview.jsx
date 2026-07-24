import { useState, useEffect, useRef, useCallback } from "react";
import {
  getTenantOverview,
  getTenantRecentPayments,
  triggerSTKPush,
  getPaymentStatus,
} from "../api/client";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function TenantOverview() {
  const [data,        setData]        = useState(null);
  const [payments,    setPayments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCharge,  setShowCharge]  = useState(false);
  const [phone,       setPhone]       = useState("");
  const [amount,      setAmount]      = useState("");
  const [chargeMsg,   setChargeMsg]   = useState("");
  const [charging,    setCharging]    = useState(false);
  const [lastPayment, setLastPayment] = useState(null); // tracks newest payment for notification

  const pollRef = useRef(null);

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  // Load overview stats
  const loadOverview = useCallback(async () => {
    try {
      const res = await getTenantOverview();
      setData(res.data);
    } catch {}
  }, []);

  // Poll recent payments every 10 seconds
  const pollPayments = useCallback(async () => {
    try {
      const res = await getTenantRecentPayments();
      const incoming = res.data.payments;

      setPayments(prev => {
        // Check if a new SUCCESS payment arrived since last poll
        if (prev.length > 0 && incoming.length > 0) {
          const newestIncoming = incoming[0];
          const newestPrev     = prev[0];
          if (
            newestIncoming.id !== newestPrev.id &&
            newestIncoming.status === "SUCCESS"
          ) {
            setLastPayment(newestIncoming);
            // Refresh overview stats to update revenue totals
            loadOverview();
          }
        }
        return incoming;
      });
    } catch {}
  }, [loadOverview]);

  // Initial load
  useEffect(() => {
    Promise.all([loadOverview(), pollPayments()])
      .finally(() => setLoading(false));
  }, [loadOverview, pollPayments]);

  // Start background polling
  useEffect(() => {
    pollRef.current = setInterval(pollPayments, 10000); // every 10 seconds
    return () => clearInterval(pollRef.current);        // cleanup on unmount
  }, [pollPayments]);

  // Auto-dismiss new payment notification after 5 seconds
  useEffect(() => {
    if (!lastPayment) return;
    const t = setTimeout(() => setLastPayment(null), 5000);
    return () => clearTimeout(t);
  }, [lastPayment]);

  async function handleCharge() {
    if (!phone || !amount) return;
    setCharging(true);
    setChargeMsg("");
    try {
      const res      = await triggerSTKPush(phone, amount);
      const checkoutId = res.data.checkout_request_id;
      setChargeMsg("📱 STK Push sent. Waiting for PIN...");

      const interval = setInterval(async () => {
        try {
          const s = await getPaymentStatus(checkoutId);
          if (s.data.status === "SUCCESS") {
            clearInterval(interval);
            setChargeMsg("✅ Payment received!");
            setCharging(false);
            setPhone(""); setAmount("");
            loadOverview();
            pollPayments();
          } else if (["FAILED", "CANCELLED"].includes(s.data.status)) {
            clearInterval(interval);
            setChargeMsg("❌ Payment failed. Try again.");
            setCharging(false);
          }
        } catch { clearInterval(interval); setCharging(false); }
      }, 3000);
    } catch {
      setChargeMsg("Failed to initiate payment.");
      setCharging(false);
    }
  }

  if (loading) return <p style={styles.loading}>Loading...</p>;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Overview</h2>
        <button
          style={styles.chargeBtn}
          onClick={() => setShowCharge(!showCharge)}
        >
          {showCharge ? "✕ Close" : "+ Charge Customer"}
        </button>
      </div>

      {/* New payment notification toast */}
      {lastPayment && (
        <div style={styles.toast}>
          <span style={styles.toastIcon}>💳</span>
          <div>
            <strong>New payment received!</strong>
            <p style={styles.toastSub}>
              {lastPayment.phone} paid{" "}
              {fmt(lastPayment.amount)} —{" "}
              Receipt: {lastPayment.mpesa_receipt}
            </p>
          </div>
          <button
            style={styles.toastClose}
            onClick={() => setLastPayment(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Expiry warning */}
      {data?.expiring_soon > 0 && (
        <div style={styles.warnBanner}>
          ⚠️ {data.expiring_soon} subscription
          {data.expiring_soon > 1 ? "s" : ""} expiring within 7 days.
          <button
            style={styles.warnBtn}
            onClick={() => setShowCharge(true)}
          >
            Renew Now
          </button>
        </div>
      )}

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

      {/* Stat cards */}
      {data && (
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
            sub={data.expiring_soon > 0
              ? `${data.expiring_soon} expiring soon` : null}
          />
          <StatCard
            label="Success Rate"
            value={`${data.success_rate}%`}
            color={data.success_rate >= 90 ? "#00A651" : "#F0A500"}
          />
        </div>
      )}

      {/* Revenue chart */}
      {data?.daily_revenue && (
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
      )}

      {/* Live payment feed */}
      <div style={styles.card}>
        <div style={styles.feedHeader}>
          <h3 style={styles.cardTitle}>Recent Payments</h3>
          <span style={styles.liveTag}>
            <span style={styles.liveDot} /> LIVE
          </span>
        </div>

        {payments.length === 0 ? (
          <p style={styles.empty}>
            No payments yet. Charge a customer above to get started.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {["Phone", "Amount", "Status", "Receipt", "Date"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr
                  key={p.id}
                  style={{
                    ...styles.tr,
                    // highlight if this is the brand-new payment
                    background: lastPayment?.id === p.id
                      ? "#F0FDF4" : "transparent",
                  }}
                >
                  <td style={styles.td}>{p.phone}</td>
                  <td style={styles.td}>{fmt(p.amount)}</td>
                  <td style={styles.td}><Badge status={p.status} /></td>
                  <td style={styles.td}>{p.mpesa_receipt}</td>
                  <td style={styles.td}>{p.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  loading:          { color: "#6B7280", padding: "40px" },
  header:           { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  title:            { margin: 0, fontSize: "20px", color: "#1A2E2A" },
  chargeBtn:        { padding: "10px 20px", background: "#00A651", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },

  // Toast notification
  toast: {
    display: "flex", alignItems: "flex-start", gap: "14px",
    background: "#F0FDF4", border: "1px solid #00A651",
    borderRadius: "10px", padding: "14px 18px",
    marginBottom: "20px", position: "relative",
    animation: "slideIn 0.3s ease",
  },
  toastIcon:        { fontSize: "22px", flexShrink: 0 },
  toastSub:         { margin: "4px 0 0", fontSize: "13px", color: "#6B7280" },
  toastClose:       { marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "16px", padding: "0 4px" },

  // Warning banner
  warnBanner:       { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FEF3C7", border: "1px solid #F0A500", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#92400E" },
  warnBtn:          { padding: "6px 14px", background: "#F0A500", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" },

  // Charge panel
  chargePanel:      { background: "#fff", border: "1px solid #D1FAE5", borderRadius: "10px", padding: "20px", marginBottom: "24px" },
  chargePanelTitle: { margin: "0 0 14px", color: "#1A2E2A", fontSize: "15px", fontWeight: "600" },
  chargeRow:        { display: "flex", gap: "10px", flexWrap: "wrap" },
  chargeInput:      { padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "13px", flex: 1, minWidth: "180px" },
  sendBtn:          { padding: "10px 20px", background: "#1A2E2A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  chargeMsg:        { margin: "12px 0 0", fontSize: "13px", color: "#374151" },

  // Stats
  grid:             { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" },

  // Card
  card:             { background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "20px" },
  cardTitle:        { margin: "0 0 16px", fontSize: "15px", color: "#1A2E2A", fontWeight: "600" },

  // Live feed header
  feedHeader:       { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  liveTag:          { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "#00A651", textTransform: "uppercase", letterSpacing: "0.06em" },
  liveDot:          { width: "7px", height: "7px", borderRadius: "50%", background: "#00A651", animation: "pulse 2s infinite" },

  // Table
  table:            { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th:               { textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase" },
  td:               { padding: "13px 12px", borderBottom: "1px solid #F9FAFB" },
  tr:               { transition: "background 0.3s" },
  empty:            { textAlign: "center", color: "#9CA3AF", padding: "32px", fontSize: "14px" },
};