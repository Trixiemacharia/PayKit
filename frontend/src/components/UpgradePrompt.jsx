import { useState } from "react";
import { triggerSTKPush, getPaymentStatus, getPlans } from "../api/client";
import { usePlan } from "../context/PlanContext";

export default function UpgradePrompt({ requiredPlan = "Pro" }) {
  const { plan, refreshPlan } = usePlan();
  const [step, setStep]       = useState("prompt"); // prompt | pay | success
  const [plans, setPlans]     = useState([]);
  const [phone, setPhone]     = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);

  async function handleUpgradeClick() {
    const res = await getPlans();
    const available = res.data.plans.filter(p =>
      p.name === requiredPlan || p.name === "Enterprise"
    );
    setPlans(available);
    setSelectedPlan(available[0] || null);
    setStep("pay");
  }

  async function handlePay() {
    if (!phone || !selectedPlan) return;
    setLoading(true);
    setMsg("📱 Sending STK Push to your phone...");

    try {
      const res = await triggerSTKPush(phone, selectedPlan.price_kes);
      const checkoutId = res.data.checkout_request_id;
      setMsg("⏳ Enter your M-Pesa PIN to complete the upgrade...");

      const interval = setInterval(async () => {
        const s = await getPaymentStatus(checkoutId);
        if (s.data.status === "SUCCESS") {
          clearInterval(interval);
          setMsg("✅ Payment successful! Unlocking your plan...");
          setLoading(false);
          await refreshPlan();
          setStep("success");
        } else if (["FAILED", "CANCELLED"].includes(s.data.status)) {
          clearInterval(interval);
          setMsg("❌ Payment failed. Please try again.");
          setLoading(false);
        }
      }, 3000);
    } catch {
      setMsg("Failed to initiate payment.");
      setLoading(false);
    }
  }

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  if (step === "success") {
    return (
      <div style={styles.container}>
        <div style={styles.successBox}>
          <p style={styles.successIcon}>🎉</p>
          <h3 style={styles.successTitle}>You're on {selectedPlan?.name}!</h3>
          <p style={styles.successSub}>
            This section is now unlocked. Click any menu item to continue.
          </p>
        </div>
      </div>
    );
  }

  if (step === "pay") {
    return (
      <div style={styles.container}>
        <div style={styles.box}>
          <p style={styles.icon}>💳</p>
          <h3 style={styles.title}>Upgrade to {requiredPlan}</h3>

          {/* Plan selector if multiple options */}
          {plans.length > 1 && (
            <div style={styles.planRow}>
              {plans.map(p => (
                <div
                  key={p.id}
                  style={{
                    ...styles.planOption,
                    ...(selectedPlan?.id === p.id ? styles.planOptionActive : {}),
                  }}
                  onClick={() => setSelectedPlan(p)}
                >
                  <strong>{p.name}</strong>
                  <span>{fmt(p.price_kes)}/mo</span>
                </div>
              ))}
            </div>
          )}

          {selectedPlan && (
            <div style={styles.selectedPlan}>
              Upgrading to <strong>{selectedPlan.name}</strong> —{" "}
              <strong>{fmt(selectedPlan.price_kes)}/month</strong>
            </div>
          )}

          <input
            style={styles.input}
            placeholder="Your M-Pesa number (2547XXXXXXXX)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          {msg && <p style={styles.msg}>{msg}</p>}

          <div style={styles.btnRow}>
            <button
              style={styles.backBtn}
              onClick={() => setStep("prompt")}
              disabled={loading}
            >
              Back
            </button>
            <button
              style={styles.payBtn}
              onClick={handlePay}
              disabled={loading || !phone}
            >
              {loading ? "Processing..." : `Pay ${selectedPlan ? fmt(selectedPlan.price_kes) : ""}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: prompt screen
  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <p style={styles.lockIcon}>🔒</p>
        <h3 style={styles.title}>
          {requiredPlan} feature
        </h3>
        <p style={styles.sub}>
          You're currently on the <strong>{plan}</strong> plan.
          This section is available on <strong>{requiredPlan}</strong> and above.
        </p>

        <div style={styles.featureList}>
          {requiredPlan === "Pro" && (
            <>
              <FeatureRow text="Customer management — view, charge, track" />
              <FeatureRow text="Subscription tracking — active, expiring, expired" />
              <FeatureRow text="Analytics — revenue trends, churn, top customers" />
              <FeatureRow text="Automatic failed payment retry" />
              <FeatureRow text="Up to 1,000 transactions/month" />
            </>
          )}
          {requiredPlan === "Enterprise" && (
            <>
              <FeatureRow text="Everything in Pro" />
              <FeatureRow text="API access — integrate PayKit into your own app" />
              <FeatureRow text="Webhook support — get notified when customers pay" />
              <FeatureRow text="Unlimited transactions" />
              <FeatureRow text="Custom reports + CSV export" />
            </>
          )}
        </div>

        <button style={styles.upgradeBtn} onClick={handleUpgradeClick}>
          Upgrade to {requiredPlan} →
        </button>
      </div>
    </div>
  );
}

function FeatureRow({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span style={{ color: "#00A651", fontWeight: "700" }}>✓</span>
      <span style={{ fontSize: "13px", color: "#374151" }}>{text}</span>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  box: {
    background: "#fff",
    borderRadius: "16px",
    padding: "48px",
    maxWidth: "480px",
    width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  lockIcon: { fontSize: "48px", margin: "0 0 16px" },
  icon: { fontSize: "48px", margin: "0 0 16px" },
  title: { margin: "0 0 12px", fontSize: "22px", color: "#1A2E2A" },
  sub: { margin: "0 0 24px", fontSize: "14px", color: "#6B7280", lineHeight: "1.6" },
  featureList: { textAlign: "left", marginBottom: "28px", padding: "16px", background: "#F0FDF4", borderRadius: "8px" },
  upgradeBtn: { width: "100%", padding: "14px", background: "#00A651", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "15px" },
  planRow: { display: "flex", gap: "10px", marginBottom: "16px", justifyContent: "center" },
  planOption: { flex: 1, padding: "12px", border: "2px solid #D1D5DB", borderRadius: "8px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center", fontSize: "13px" },
  planOptionActive: { border: "2px solid #00A651", background: "#F0FDF4" },
  selectedPlan: { background: "#F0FDF4", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "#065F46" },
  input: { width: "100%", padding: "12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box" },
  msg: { fontSize: "13px", color: "#374151", marginBottom: "12px" },
  btnRow: { display: "flex", gap: "10px" },
  backBtn: { flex: 1, padding: "12px", background: "#F3F4F6", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  payBtn: { flex: 2, padding: "12px", background: "#00A651", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  successBox: { background: "#fff", borderRadius: "16px", padding: "48px", maxWidth: "480px", width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" },
  successIcon: { fontSize: "48px", margin: "0 0 16px" },
  successTitle: { margin: "0 0 12px", fontSize: "22px", color: "#1A2E2A" },
  successSub: { fontSize: "14px", color: "#6B7280" },
};