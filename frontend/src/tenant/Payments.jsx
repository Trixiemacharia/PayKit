import { useState, useEffect } from "react";
import { getTenantPayments, retryPayment } from "../api/client";
import Badge from "../components/Badge";

export default function TenantPayments() {
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ status: "", date_from: "", date_to: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, []);

  async function load(f = {}) {
    setLoading(true);
    const res = await getTenantPayments(
      Object.fromEntries(Object.entries(f).filter(([, v]) => v))
    );
    setTransactions(res.data.transactions);
    setLoading(false);
  }

  function updateFilter(key, value) {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    load(updated);
  }

  async function handleRetry(id) {
    try {
      const res = await retryPayment(id);
      setMsg(res.data.message);
    } catch { setMsg("Retry failed."); }
  }

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  return (
    <div>
      <h2 style={styles.title}>Payments</h2>
      {msg && <div style={styles.msg}>{msg}</div>}

      {/* Filters */}
      <div style={styles.filters}>
        <input
          style={styles.input}
          placeholder="Search phone..."
          value={filters.phone}
          onChange={e => updateFilter("phone", e.target.value)}
        />
        <select
          style={styles.input}
          value={filters.status}
          onChange={e => updateFilter("status", e.target.value)}
        >
          <option value="">All Statuses</option>
          {["SUCCESS", "FAILED", "PENDING", "CANCELLED"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          style={styles.input}
          type="date"
          value={filters.date_from}
          onChange={e => updateFilter("date_from", e.target.value)}
        />
        <input
          style={styles.input}
          type="date"
          value={filters.date_to}
          onChange={e => updateFilter("date_to", e.target.value)}
        />
        <button
          style={styles.clearBtn}
          onClick={() => {
            const cleared = { status: "", date_from: "", date_to: "", phone: "" };
            setFilters(cleared);
            load({});
          }}
        >
          Clear
        </button>
      </div>

      {loading ? <p style={{ color: "#6B7280" }}>Loading...</p> : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Phone", "Amount", "Status", "Receipt", "Date", "Action"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td style={styles.td}>{t.phone}</td>
                  <td style={styles.td}>{fmt(t.amount)}</td>
                  <td style={styles.td}><Badge status={t.status} /></td>
                  <td style={styles.td}>{t.mpesa_receipt}</td>
                  <td style={styles.td}>{t.created_at}</td>
                  <td style={styles.td}>
                    {t.status === "FAILED" && (
                      <div>
                        <button
                          style={styles.retryBtn}
                          onClick={() => handleRetry(t.id)}
                        >
                          ↺ Retry
                        </button>
                        {t.reason && (
                          <p style={styles.reason}>{t.reason}</p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <p style={styles.empty}>No transactions found.</p>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { margin: "0 0 20px", fontSize: "20px", color: "#1A2E2A" },
  msg: { background: "#D1FAE5", color: "#065F46", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" },
  filters: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  input: { padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "13px" },
  clearBtn: { padding: "8px 16px", background: "#F3F4F6", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
  tableWrap: { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "12px 16px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase", background: "#FAFAFA" },
  td: { padding: "14px 16px", borderBottom: "1px solid #F9FAFB" },
  retryBtn: { padding: "5px 10px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "600" },
  reason: { margin: "4px 0 0", fontSize: "11px", color: "#DC2626" },
  empty: { textAlign: "center", color: "#9CA3AF", padding: "40px" },
};