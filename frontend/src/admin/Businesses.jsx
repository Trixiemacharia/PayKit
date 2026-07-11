import { useState, useEffect } from "react";
import { getAdminBusinesses, adminBusinessAction, getPlans } from "../api/client";
import Badge from "../components/Badge";

export default function Businesses() {
  const [businesses, setBusinesses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([getAdminBusinesses(), getPlans()]).then(([b, p]) => {
      setBusinesses(b.data.businesses);
      setPlans(p.data.plans);
      setLoading(false);
    });
  }, []);

  async function doAction(tenantId, action, extra = {}) {
    try {
      const res = await adminBusinessAction(tenantId, action, extra);
      setMsg(res.data.message);
      const updated = await getAdminBusinesses();
      setBusinesses(updated.data.businesses);
    } catch (e) {
      setMsg("Action failed");
    }
  }

  const fmt = (n) => Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  if (loading) return <p style={{ color: "#6B7280", padding: "40px" }}>Loading businesses...</p>;

  return (
    <div>
      <h2 style={styles.title}>Businesses</h2>
      {msg && <div style={styles.msg}>{msg}</div>}

      <table style={styles.table}>
        <thead>
          <tr>
            {["Business", "Owner", "Plan", "Revenue", "Subs", "Status", "Joined", "Actions"].map(h => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {businesses.map(b => (
            <tr key={b.id}>
              <td style={styles.td}>
                <strong>{b.name}</strong>
                <br /><span style={styles.slug}>/{b.slug}</span>
              </td>
              <td style={styles.td}>{b.owner_email}</td>
              <td style={styles.td}>
                {b.plan}<br />
                <span style={styles.price}>{fmt(b.plan_price)}/mo</span>
              </td>
              <td style={styles.td}>{fmt(b.total_revenue)}</td>
              <td style={styles.td}>{b.active_subscriptions}</td>
              <td style={styles.td}>
                <Badge status={b.is_active ? "ACTIVE" : "EXPIRED"} />
              </td>
              <td style={styles.td}>{b.created_at}</td>
              <td style={styles.td}>
                <div style={styles.actions}>
                  <button
                    style={{ ...styles.btn, ...styles.btnView }}
                    onClick={() => alert(`Viewing ${b.name}`)}
                  >
                    View
                  </button>
                  <button
                    style={{ ...styles.btn, ...(b.is_active ? styles.btnDisable : styles.btnEnable) }}
                    onClick={() => doAction(b.id, b.is_active ? "disable" : "enable")}
                  >
                    {b.is_active ? "Disable" : "Enable"}
                  </button>
                  <select
                    style={styles.select}
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) doAction(b.id, "upgrade", { plan_id: e.target.value });
                    }}
                  >
                    <option value="" disabled>Upgrade</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    style={{ ...styles.btn, ...styles.btnDelete }}
                    onClick={() => {
                      if (window.confirm(`Delete ${b.name}? This cannot be undone.`)) {
                        doAction(b.id, "delete");
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  title: { margin: "0 0 20px", fontSize: "20px", color: "#1A2E2A" },
  msg: { background: "#D1FAE5", color: "#065F46", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#6B7280", borderBottom: "2px solid #F3F4F6", fontWeight: "600", textTransform: "uppercase" },
  td: { padding: "14px 12px", borderBottom: "1px solid #F9FAFB", verticalAlign: "top" },
  slug: { fontSize: "11px", color: "#9CA3AF" },
  price: { fontSize: "11px", color: "#00A651" },
  actions: { display: "flex", gap: "6px", flexWrap: "wrap" },
  btn: { padding: "5px 10px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600" },
  btnView: { background: "#EFF6FF", color: "#1D4ED8" },
  btnDisable: { background: "#FEF3C7", color: "#92400E" },
  btnEnable: { background: "#D1FAE5", color: "#065F46" },
  btnDelete: { background: "#FEE2E2", color: "#991B1B" },
  select: { padding: "5px 8px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "11px", cursor: "pointer" },
};