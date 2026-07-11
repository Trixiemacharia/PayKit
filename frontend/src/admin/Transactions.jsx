import { useState, useEffect } from "react";
import { getAdminTransactions, getAdminBusinesses } from "../api/client";
import Badge from "../components/Badge";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [filters, setFilters] = useState({ business: "", status: "", date_from: "", date_to: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminBusinesses().then(r => setBusinesses(r.data.businesses));
    load();
  }, []);

  async function load(f = {}) {
    setLoading(true);
    const res = await getAdminTransactions(f);
    setTransactions(res.data.transactions);
    setLoading(false);
  }

  function updateFilter(key, value) {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    load(Object.fromEntries(Object.entries(updated).filter(([, v]) => v)));
  }

  const fmt = (n) => Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  return (
    <div>
      <h2 style={styles.title}>All Transactions</h2>

      {/* Filters */}
      <div style={styles.filters}>
        <select style={styles.input} value={filters.business} onChange={e => updateFilter("business", e.target.value)}>
          <option value="">All Businesses</option>
          {businesses.map(b => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </select>

        <select style={styles.input} value={filters.status} onChange={e => updateFilter("status", e.target.value)}>
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
          placeholder="From"
        />
        <input
          style={styles.input}
          type="date"
          value={filters.date_to}
          onChange={e => updateFilter("date_to", e.target.value)}
          placeholder="To"
        />

        <button style={styles.clearBtn} onClick={() => { setFilters({ business: "", status: "", date_from: "", date_to: "" }); load(); }}>
          Clear
        </button>
      </div>

      {loading ? <p style={{ color: "#6B7280" }}>Loading...</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              {["Business", "Phone", "Amount", "Status", "Receipt", "Date"].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td style={styles.td}>{t.business}</td>
                <td style={styles.td}>{t.phone}</td>
                <td style={styles.td}>{fmt(t.amount)}</td>
                <td style={styles.td}><Badge status={t.status} /></td>
                <td style={styles.td}>{t.mpesa_receipt}</td>
                <td style={styles.td}>{t.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && transactions.length === 0 && (
        <p style={styles.empty}>No transactions found.</p>
      )}
    </div>
  );
}

const styles = {
  title: { margin: "0 0 20px", fontSize: "20px", color: "#1A2E2A" },
  filters: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  input: { padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "13px" },
  clearBtn: { padding: "8px 16px", background: "#F3F4F6", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase" },
  td: { padding: "12px", borderBottom: "1px solid #F9FAFB" },
  empty: { textAlign: "center", color: "#9CA3AF", padding: "40px" },
};