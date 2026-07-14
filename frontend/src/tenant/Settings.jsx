import { useState, useEffect } from "react";
import { getTenantSettings, updateTenantSettings, getPlans, triggerSTKPush, getPaymentStatus } from "../api/client";

export default function TenantSettings() {
  const [settings, setSettings]   = useState(null);
  const [plans, setPlans]         = useState([]);
  const [form, setForm]           = useState({ business_name: "", email: "" });
  const [msg, setMsg]             = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getTenantSettings(), getPlans()]).then(([s, p]) => {
      setSettings(s.data);
      setForm({ business_name: s.data.business_name, email: s.data.owner_email });
      setPlans(p.data.plans);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    try {
      await updateTenantSettings(form);
      setMsg("✅ Settings saved successfully.");
      const updated = await getTenantSettings();
      setSettings(updated.data);
    } catch { setMsg("❌ Failed to save settings."); }
  }

  async function handleUpgrade(plan) {
    const phone = window.prompt(`Enter your M-Pesa number to pay for ${plan.name} (KES ${plan.price_kes}/mo):`);
    if (!phone) return;

    setUpgrading(true);
    setMsg(`Initiating payment for ${plan.name}...`);

    try {
      const res = await triggerSTKPush(phone, plan.price_kes);
      const checkoutId = res.data.checkout_request_id;
      setMsg("📱 Check your phone and enter your M-Pesa PIN...");

      const interval = setInterval(async () => {
        const s = await getPaymentStatus(checkoutId);
        if (s.data.status === "SUCCESS") {
          clearInterval(interval);
          setMsg(`✅ Upgraded to ${plan.name} successfully!`);
          setUpgrading(false);
          getTenantSettings().then(r => setSettings(r.data));
        } else if (["FAILED", "CANCELLED"].includes(s.data.status)) {
          clearInterval(interval);
          setMsg("❌ Payment failed. Please try again.");
          setUpgrading(false);
        }
      }, 3000);
    } catch {
      setMsg("Failed to initiate upgrade payment.");
      setUpgrading(false);
    }
  }

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  if (loading) return <p style={{ color: "#6B7280", padding: "40px" }}>Loading settings...</p>;

  return (
    <div>
      <h2 style={styles.title}>Settings</h2>
      {msg && <div style={styles.msg}>{msg}</div>}

      {/* Business Profile */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Business Profile</h3>
        <div style={styles.field}>
          <label style={styles.label}>Business Name</label>
          <input
            style={styles.input}
            value={form.business_name}
            onChange={e => setForm({ ...form, business_name: e.target.value })}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Email Address</label>
          <input
            style={styles.input}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Business Slug</label>
          <input style={{ ...styles.input, ...styles.disabled }} value={settings.slug} disabled />
          <p style={styles.hint}>Slug cannot be changed after creation.</p>
        </div>
        <button style={styles.saveBtn} onClick={handleSave}>
          Save Changes
        </button>
      </div>

      {/* Plan & Billing */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Plan & Billing</h3>
        <div style={styles.currentPlan}>
          <div>
            <p style={styles.planName}>{settings.current_plan}</p>
            <p style={styles.planPrice}>{fmt(settings.plan_price)}/month</p>
            {settings.next_billing && (
              <p style={styles.planHint}>Next billing: {settings.next_billing}</p>
            )}
          </div>
          <span style={styles.activeBadge}>ACTIVE</span>
        </div>

        <h4 style={styles.upgradeTitle}>Upgrade Plan</h4>
        <div style={styles.plansGrid}>
          {plans
            .filter(p => p.name !== settings.current_plan)
            .map(plan => (
              <div key={plan.id} style={styles.planCard}>
                <div>
                  <p style={styles.planCardName}>{plan.name}</p>
                  <p style={styles.planCardPrice}>{fmt(plan.price_kes)}/mo</p>
                </div>
                <button
                  style={styles.upgradeBtn}
                  onClick={() => handleUpgrade(plan)}
                  disabled={upgrading}
                >
                  {upgrading ? "Processing..." : "Upgrade"}
                </button>
              </div>
            ))
          }
        </div>
      </div>

      {/* Account Status */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Account Status</h3>
        <div style={styles.statusRow}>
          <span style={styles.label}>Account</span>
          <span style={{
            ...styles.statusBadge,
            background: settings.is_active ? "#D1FAE5" : "#FEE2E2",
            color: settings.is_active ? "#065F46" : "#991B1B",
          }}>
            {settings.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  title: { margin: "0 0 24px", fontSize: "20px", color: "#1A2E2A" },
  msg: { background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#065F46", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px" },
  card: { background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "20px" },
  cardTitle: { margin: "0 0 20px", fontSize: "16px", color: "#1A2E2A", fontWeight: "600" },
  field: { marginBottom: "16px" },
  label: { display: "block", fontSize: "12px", color: "#6B7280", marginBottom: "6px", fontWeight: "500" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" },
  disabled: { background: "#F9FAFB", color: "#9CA3AF" },
  hint: { margin: "4px 0 0", fontSize: "11px", color: "#9CA3AF" },
  saveBtn: { padding: "10px 24px", background: "#00A651", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  currentPlan: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#F0FDF4", borderRadius: "8px", border: "1px solid #BBF7D0", marginBottom: "24px" },
  planName: { margin: "0 0 4px", fontWeight: "700", fontSize: "16px", color: "#1A2E2A" },
  planPrice: { margin: "0 0 4px", color: "#00A651", fontWeight: "600", fontSize: "14px" },
  planHint: { margin: 0, fontSize: "12px", color: "#6B7280" },
  activeBadge: { background: "#00A651", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" },
  upgradeTitle: { margin: "0 0 12px", fontSize: "14px", color: "#374151" },
  plansGrid: { display: "flex", gap: "12px", flexWrap: "wrap" },
  planCard: { flex: 1, minWidth: "160px", padding: "16px", border: "1px solid #D1D5DB", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  planCardName: { margin: "0 0 4px", fontWeight: "600", color: "#1A2E2A" },
  planCardPrice: { margin: 0, fontSize: "13px", color: "#00A651", fontWeight: "600" },
  upgradeBtn: { padding: "7px 14px", background: "#1A2E2A", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  statusRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
};