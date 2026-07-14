import { useState, useEffect } from "react";
import { getTenantCustomers, triggerSTKPush, getPaymentStatus } from "../api/client";
import Badge from "../components/Badge";

export default function TenantCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [charging, setCharging]   = useState(null); // phone being charged
  const [msg, setMsg]             = useState("");

  useEffect(() => {
    getTenantCustomers().then(r => {
      setCustomers(r.data.customers);
      setLoading(false);
    });
  }, []);

  async function handleCharge(phone, amount) {
    setCharging(phone);
    setMsg("");
    try {
      const res = await triggerSTKPush(phone, amount);
      const checkoutId = res.data.checkout_request_id;
      setMsg(`📱 STK Push sent to ${phone}. Waiting for PIN...`);

      const interval = setInterval(async () => {
        const s = await getPaymentStatus(checkoutId);
        if (s.data.status === "SUCCESS") {
          clearInterval(interval);
          setMsg(`✅ Payment from ${phone} successful!`);
          setCharging(null);
        } else if (["FAILED", "CANCELLED"].includes(s.data.status)) {
          clearInterval(interval);
          setMsg(`❌ Payment from ${phone} failed.`);
          setCharging(null);
        }
      }, 3000);
    } catch {
      setMsg("Failed to initiate payment.");
      setCharging(null);
    }
  }

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  if (loading) return <p style={{ color: "#6B7280", padding: "40px" }}>Loading customers...</p>;

  return (
    <div>
      <h2 style={styles.title}>Customers</h2>
      <p style={styles.subtitle}>
        {customers.length} unique customers
      </p>

      {msg && (
        <div style={styles.msg}>{msg}</div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Phone", "Last Payment", "Total Spent", "Transactions", "Plan", "Status", "Actions"].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.phone}>
                <td style={styles.td}>
                  <strong>{c.phone}</strong>
                </td>
                <td style={styles.td}>{c.last_payment}</td>
                <td style={styles.td}>{fmt(c.total_spent)}</td>
                <td style={styles.td}>{c.total_transactions}</td>
                <td style={styles.td}>{c.plan}</td>
                <td style={styles.td}>
                  <Badge status={c.subscription_status === "NONE" ? "CANCELLED" : c.subscription_status} />
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={styles.chargeBtn}
                      disabled={charging === c.phone}
                      onClick={() => {
                        const amount = window.prompt(`Enter amount to charge ${c.phone} (KES):`);
                        if (amount && Number(amount) > 0) handleCharge(c.phone, amount);
                      }}
                    >
                      {charging === c.phone ? "Sending..." : "⚡ Charge"}
                    </button>
                    {c.subscription_status === "EXPIRED" && (
                      <button
                        style={styles.remindBtn}
                        onClick={() => alert(`Reminder feature coming soon for ${c.phone}`)}
                      >
                        🔔 Remind
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && (
          <p style={styles.empty}>No customers yet. Payments will appear here.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  title: { margin: "0 0 4px", fontSize: "20px", color: "#1A2E2A" },
  subtitle: { margin: "0 0 20px", fontSize: "13px", color: "#9CA3AF" },
  msg: { background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#065F46", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" },
  tableWrap: { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "12px 16px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase", background: "#FAFAFA" },
  td: { padding: "14px 16px", borderBottom: "1px solid #F9FAFB" },
  actions: { display: "flex", gap: "6px" },
  chargeBtn: { padding: "5px 10px", background: "#D1FAE5", color: "#065F46", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "600" },
  remindBtn: { padding: "5px 10px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "600" },
  empty: { textAlign: "center", color: "#9CA3AF", padding: "40px" },
};