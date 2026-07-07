import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register, login, createTenant, getPlans, triggerSTKPush, getPaymentStatus } from "../api/client";

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1=account, 2=tenant, 3=plan, 4=pay
  const [form, setForm] = useState({ username: "", email: "", password: "", tenantName: "", slug: "", phone: "" });
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const navigate = useNavigate();

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Step 1: create account
  async function handleRegister() {
    setLoading(true); setError("");
    try {
      await register(form.username, form.email, form.password);
      // Auto-login after registration
      const res = await login(form.username, form.password);
      localStorage.setItem("access_token", res.data.access);
      // Load plans for step 3
      const plansRes = await getPlans();
      setPlans(plansRes.data.plans);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  }

  // Step 2: create tenant
  async function handleCreateTenant() {
    setLoading(true); setError("");
    try {
      await createTenant(form.tenantName, form.slug);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create tenant");
    } finally { setLoading(false); }
  }

  // Step 3: pick plan → move to payment
  function handleSelectPlan(plan) {
    setSelectedPlan(plan);
    setStep(4);
  }

  // Step 4: pay via STK Push + poll for result
  async function handlePay() {
    setLoading(true); setError(""); setPaymentStatus("PENDING");
    try {
      const res = await triggerSTKPush(form.phone, selectedPlan.price_kes);
      const checkoutId = res.data.checkout_request_id;

      // Poll every 3 seconds until no longer PENDING
      const interval = setInterval(async () => {
        try {
          const statusRes = await getPaymentStatus(checkoutId);
          const currentStatus = statusRes.data.status;
          setPaymentStatus(currentStatus);

          if (currentStatus === "SUCCESS") {
            clearInterval(interval);
            setLoading(false);
            setTimeout(() => navigate("/dashboard"), 2000);
          } else if (currentStatus === "FAILED" || currentStatus === "CANCELLED") {
            clearInterval(interval);
            setLoading(false);
            setError("Payment failed. Please try again.");
          }
        } catch { clearInterval(interval); setLoading(false); }
      }, 3000);

    } catch (err) {
      setError("Failed to initiate payment");
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>PayKit</h1>

        {/* Progress indicator */}
        <div style={styles.steps}>
          {["Account", "Business", "Plan", "Pay"].map((label, i) => (
            <div key={i} style={{ ...styles.step, ...(step === i + 1 ? styles.stepActive : {}) }}>
              {label}
            </div>
          ))}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Step 1 — Account */}
        {step === 1 && (
          <>
            <h3 style={styles.stepTitle}>Create your account</h3>
            <input style={styles.input} placeholder="Username" value={form.username} onChange={e => update("username", e.target.value)} />
            <input style={styles.input} placeholder="Email" value={form.email} onChange={e => update("email", e.target.value)} />
            <input style={styles.input} type="password" placeholder="Password" value={form.password} onChange={e => update("password", e.target.value)} />
            <button style={styles.button} onClick={handleRegister} disabled={loading}>
              {loading ? "Creating account..." : "Continue"}
            </button>
          </>
        )}

        {/* Step 2 — Tenant */}
        {step === 2 && (
          <>
            <h3 style={styles.stepTitle}>Set up your business</h3>
            <input style={styles.input} placeholder="Business name" value={form.tenantName} onChange={e => update("tenantName", e.target.value)} />
            <input style={styles.input} placeholder="Slug (e.g. my-business)" value={form.slug} onChange={e => update("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
            <button style={styles.button} onClick={handleCreateTenant} disabled={loading}>
              {loading ? "Setting up..." : "Continue"}
            </button>
          </>
        )}

        {/* Step 3 — Pick plan */}
        {step === 3 && (
          <>
            <h3 style={styles.stepTitle}>Choose a plan</h3>
            {plans.map(plan => (
              <div key={plan.id} style={styles.planCard} onClick={() => handleSelectPlan(plan)}>
                <strong>{plan.name}</strong>
                <span style={styles.price}>
                  {plan.price_kes.toLocaleString("en-KE", { style: "currency", currency: "KES" })}/mo
                </span>
              </div>
            ))}
          </>
        )}

        {/* Step 4 — Pay */}
        {step === 4 && (
          <>
            <h3 style={styles.stepTitle}>Pay for {selectedPlan?.name}</h3>
            <p style={styles.planPrice}>
              {selectedPlan?.price_kes.toLocaleString("en-KE", { style: "currency", currency: "KES" })}/month
            </p>

            {paymentStatus === "PENDING" && (
              <div style={styles.pendingBox}>
                <p>📱 Check your phone and enter your M-Pesa PIN</p>
                <p style={{ fontSize: "12px", color: "#6B7280" }}>Waiting for confirmation...</p>
              </div>
            )}

            {paymentStatus === "SUCCESS" && (
              <div style={styles.successBox}>✅ Payment successful! Redirecting...</div>
            )}

            {paymentStatus === "" && (
              <>
                <input
                  style={styles.input}
                  placeholder="M-Pesa number (2547XXXXXXXX)"
                  value={form.phone}
                  onChange={e => update("phone", e.target.value)}
                />
                <button style={styles.button} onClick={handlePay} disabled={loading}>
                  {loading ? "Initiating..." : `Pay ${selectedPlan?.price_kes.toLocaleString("en-KE", { style: "currency", currency: "KES" })}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0faf4" },
  card: { background: "#fff", padding: "40px", borderRadius: "12px", width: "400px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
  logo: { color: "#00A651", margin: "0 0 16px", fontSize: "28px" },
  steps: { display: "flex", gap: "8px", marginBottom: "24px" },
  step: { flex: 1, padding: "6px", textAlign: "center", borderRadius: "6px", fontSize: "12px", background: "#F3F4F6", color: "#6B7280" },
  stepActive: { background: "#00A651", color: "#fff", fontWeight: "600" },
  stepTitle: { marginBottom: "16px", color: "#1A2E2A" },
  input: { width: "100%", padding: "12px", marginBottom: "12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" },
  button: { width: "100%", padding: "12px", background: "#00A651", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", cursor: "pointer", fontWeight: "600" },
  error: { background: "#FEE2E2", color: "#DC2626", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "12px" },
  planCard: { padding: "16px", border: "1px solid #D1D5DB", borderRadius: "8px", marginBottom: "10px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  price: { color: "#00A651", fontWeight: "700", fontSize: "16px" },
  planPrice: { fontSize: "22px", fontWeight: "700", color: "#00A651", marginBottom: "16px" },
  pendingBox: { background: "#FFF7E6", border: "1px solid #F0A500", borderRadius: "8px", padding: "16px", textAlign: "center", marginBottom: "12px" },
  successBox: { background: "#E8F5EE", border: "1px solid #00A651", borderRadius: "8px", padding: "16px", textAlign: "center", color: "#00A651", fontWeight: "600" },
};