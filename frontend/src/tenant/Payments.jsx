import { useState, useEffect, useCallback } from "react";
import { getTenantPayments, retryPayment } from "../api/client";
import Badge from "../components/Badge";

export default function TenantPayments() {
  const [transactions, setTransactions] = useState([]);
  const [filters,  setFilters]  = useState({ status: "", date_from: "", date_to: "", phone: "" });
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState("");
  const [retrying, setRetrying] = useState(null);

  const load = useCallback(async (f = {}) => {
    setLoading(true);
    try {
      const clean = Object.fromEntries(
        Object.entries(f).filter(([, v]) => v)
      );
      const res = await getTenantPayments(clean);
      setTransactions(res.data.transactions);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateFilter(key, value) {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    load(updated);
  }

  function clearFilters() {
    const cleared = { status: "", date_from: "", date_to: "", phone: "" };
    setFilters(cleared);
    load({});
  }

  async function handleRetry(id) {
    setRetrying(id);
    setMsg("");
    try {
      const res = await retryPayment(id);
      setMsg(`✅ ${res.data.message}`);
      load(filters);
    } catch {
      setMsg("❌ Retry failed. Please try again.");
    } finally { setRetrying(null); }
  }

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  const successCount = transactions.filter(t => t.status === "SUCCESS").length;
  const failedCount  = transactions.filter(t => t.status === "FAILED").length;
  const pendingCount = transactions.filter(t => t.status === "PENDING").length;

  return (
    <div>
      <h2 style={styles.title}>Payments</h2>

      {/* Summary row */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryNum}>{transactions.length}</span>
          <span style={styles.summaryLabel}>Total shown</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{ ...styles.summaryNum, color: "#00A651" }}>{successCount}</span>
          <span style={styles.summaryLabel}>Successful</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{ ...styles.summaryNum, color: "#DC2626" }}>{failedCount}</span>
          <span style={styles.summaryLabel}>Failed</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{ ...styles.summaryNum, color: "#F0A500" }}>{pendingCount}</span>
          <span style={styles.summaryLabel}>Pending</span>
        </div>
      </div>

      {msg && <div style={styles.msg}>{msg}</div>}

      {/* Filters */}
      <div style={styles.filterBar}>
        <input
          style={styles.filterInput}
          placeholder="🔍 Search phone..."
          value={filters.phone}
          onChange={e => updateFilter("phone", e.target.value)}
        />
        <select
          style={styles.filterInput}
          value={filters.status}
          onChange={e => updateFilter("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {["SUCCESS", "FAILED", "PENDING", "CANCELLED"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          style={styles.filterInput}
          type="date"
          value={filters.date_from}
          onChange={e => updateFilter("date_from", e.target.value)}
        />
        <span style={styles.filterSep}>to</span>
        <input
          style={styles.filterInput}
          type="date"
          value={filters.date_to}
          onChange={e => updateFilter("date_to", e.target.value)}
        />
        <button style={styles.clearBtn} onClick={clearFilters}>
          Clear
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "#6B7280", padding: "20px" }}>Loading...</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Phone", "Amount", "Status", "M-Pesa Receipt", "Date", "Action"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} style={styles.row}>
                  <td style={styles.td}>
                    <span style={styles.phone}>{t.phone}</span>
                  </td>
                  <td style={styles.td}>
                    <strong>{fmt(t.amount)}</strong>
                  </td>
                  <td style={styles.td}>
                    <Badge status={t.status} />
                  </td>
                  <td style={styles.td}>
                    {t.mpesa_receipt !== "—" ? (
                      <span style={styles.receipt}>{t.mpesa_receipt}</span>
                    ) : (
                      <span style={styles.noReceipt}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.date}>{t.created_at}</span>
                  </td>
                  <td style={styles.td}>
                    {t.status === "FAILED" && (
                      <div>
                        <button
                          style={{
                            ...styles.retryBtn,
                            opacity: retrying === t.id ? 0.6 : 1,
                          }}
                          disabled={retrying === t.id}
                          onClick={() => handleRetry(t.id)}
                        >
                          {retrying === t.id ? "Retrying..." : "↺ Retry"}
                        </button>
                        {t.reason && (
                          <p style={styles.reason}>{t.reason}</p>
                        )}
                      </div>
                    )}
                    {t.status === "SUCCESS" && (
                      <span style={styles.successCheck}>✓ Complete</span>
                    )}
                    {t.status === "PENDING" && (
                      <span style={styles.pendingLabel}>⏳ Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {transactions.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>💳</p>
              <p style={styles.emptyTitle}>No transactions found</p>
              <p style={styles.emptySub}>
                Try adjusting your filters or charge a customer from the Overview tab.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  title:        { margin: "0 0 20px", fontSize: "20px", color: "#1A2E2A" },

  summaryRow:   { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" },
  summaryCard:  { background: "#fff", padding: "14px 18px", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "4px" },
  summaryNum:   { fontSize: "22px", fontWeight: "700", color: "#1A2E2A" },
  summaryLabel: { fontSize: "11px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" },

  msg:          { background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#065F46", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" },

  filterBar:    { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" },
  filterInput:  { padding: "8px 12px", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "13px", color: "#374151" },
  filterSep:    { fontSize: "12px", color: "#9CA3AF" },
  clearBtn:     { padding: "8px 14px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "#6B7280" },

  tableWrap:    { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th:           { textAlign: "left", padding: "12px 16px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase", background: "#FAFAFA" },
  row:          { transition: "background 0.15s" },
  td:           { padding: "14px 16px", borderBottom: "1px solid #F9FAFB", verticalAlign: "middle" },

  phone:        { fontFamily: "monospace", fontSize: "13px", color: "#374151" },
  receipt:      { fontFamily: "monospace", fontSize: "12px", color: "#374151", background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" },
  noReceipt:    { color: "#D1D5DB" },
  date:         { fontSize: "12px", color: "#9CA3AF" },

  retryBtn:     { padding: "5px 10px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "600" },
  reason:       { margin: "4px 0 0", fontSize: "11px", color: "#DC2626", maxWidth: "160px" },
  successCheck: { fontSize: "12px", color: "#00A651", fontWeight: "600" },
  pendingLabel: { fontSize: "12px", color: "#F0A500" },

  emptyState:   { padding: "48px", textAlign: "center" },
  emptyIcon:    { fontSize: "36px", margin: "0 0 12px" },
  emptyTitle:   { margin: "0 0 8px", fontWeight: "600", color: "#374151" },
  emptySub:     { margin: 0, fontSize: "13px", color: "#9CA3AF" },
};