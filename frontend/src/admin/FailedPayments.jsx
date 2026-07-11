import { useState, useEffect } from "react";
import { getAdminFailedPayments, retryPayment } from "../api/client";

export default function FailedPayments() {
  const [payments, setPayments] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await getAdminFailedPayments();
    setPayments(res.data.failed_payments);
  }

  async function handleRetry(id) {
    try {
      const res = await retryPayment(id);
      setMsg(res.data.message);
    } catch { setMsg("Retry failed"); }
  }

  const fmt = (n) => Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  return (
    <div>
      <h2 style={styles.title}>Failed Payments</h2>
      {msg && <div style={styles.msg}>{msg}</div>}

      <table style={styles.table}>
        <thead>
          <tr>
            {["Business", "Phone", "Amount", "Reason", "Date", "Action"].map(h => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td style={styles.td}>{p.business}</td>
              <td style={styles.td}>{p.phone}</td>
              <td style={styles.td}>{fmt(p.amount)}</td>
              <td style={styles.td}>
                <span style={styles.reason}>{p.reason}</span>
              </td>
              <td style={styles.td}>{p.created_at}</td>
              <td style={styles.td}>
                <button
                  style={styles.retryBtn}
                  onClick={() => handleRetry(p.id)}
                >
                  ↺ Retry
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {payments.length === 0 && (
        <p style={styles.empty}>No failed payments. 🎉</p>
      )}
    </div>
  );
}

const styles = {
  title: { margin: "0 0 20px", fontSize: "20px", color: "#1A2E2A" },
  msg: { background: "#D1FAE5", color: "#065F46", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase" },
  td: { padding: "14px 12px", borderBottom: "1px solid #F9FAFB" },
  reason: { color: "#DC2626", fontSize: "12px" },
  retryBtn: { padding: "6px 12px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  empty: { textAlign: "center", color: "#9CA3AF", padding: "40px" },
};