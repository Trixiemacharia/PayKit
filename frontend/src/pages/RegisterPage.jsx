import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { register, login, googleLogin, createTenant, getPlans, triggerSTKPush, getPaymentStatus } from "../api/client";

const STEPS = ["Account", "Business", "Plan", "Pay"];

export default function RegisterPage() {
  const [step,   setStep]   = useState(0);
  const [form,   setForm]   = useState({ username: "", email: "", password: "", tenantName: "", slug: "", phone: "" });
  const [plans,  setPlans]  = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [payStatus, setPayStatus] = useState("");
  const navigate = useNavigate();

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSuccess(tokens) {
    localStorage.setItem("access_token",  tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    localStorage.setItem("is_superuser",  tokens.is_superuser);
  }

  // ── Step 0: Google signup ─────────────────────────────────────────────────
  const handleGoogleSignup = useGoogleLogin({
    scope: "openid profile email",
    onSuccess: async (response) => {
      setLoading(true); setError("");
      try {
        const res = await googleLogin(response.access_token);
        handleSuccess(res.data);
        update("email", res.data.email);
        update("username", res.data.username);
        const plansRes = await getPlans();
        setPlans(plansRes.data.plans);
        setStep(1); // skip to business setup
      } catch (e) {
        setError(e.response?.data?.error || "Google signup failed. Please try again.");
      } finally { setLoading(false); }
    },
    onError: () => setError("Google signup failed."),
  });

  // ── Step 0: Email signup ──────────────────────────────────────────────────
  async function handleRegister() {
    setLoading(true); setError("");
    try {
      await register(form.username, form.email, form.password);
      const res = await login(form.username, form.password);
      handleSuccess(res.data);
      const plansRes = await getPlans();
      setPlans(plansRes.data.plans);
      setStep(1);
    } catch (e) {
      setError(e.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  }

  // ── Step 1: Business setup ────────────────────────────────────────────────
  async function handleCreateTenant() {
    setLoading(true); setError("");
    try {
      await createTenant(form.tenantName, form.slug);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to create business");
    } finally { setLoading(false); }
  }

  // ── Step 3: Pay ───────────────────────────────────────────────────────────
  async function handlePay() {
    setLoading(true); setError(""); setPayStatus("PENDING");
    try {
      const res = await triggerSTKPush(form.phone, selectedPlan.price_kes);
      const checkoutId = res.data.checkout_request_id;

      const interval = setInterval(async () => {
        const s = await getPaymentStatus(checkoutId);
        setPayStatus(s.data.status);
        if (s.data.status === "SUCCESS") {
          clearInterval(interval);
          setLoading(false);
          setTimeout(() => navigate("/dashboard"), 2000);
        } else if (["FAILED", "CANCELLED"].includes(s.data.status)) {
          clearInterval(interval);
          setLoading(false);
          setError("Payment failed. Please try again.");
          setPayStatus("");
        }
      }, 3000);
    } catch {
      setError("Failed to initiate payment.");
      setLoading(false);
    }
  }

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", { style: "currency", currency: "KES" });

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.brand}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>PayKit</span>
          </div>

          {/* Step indicator */}
          <div style={styles.stepList}>
            {STEPS.map((label, i) => (
              <div key={i} style={styles.stepItem}>
                <div style={{
                  ...styles.stepCircle,
                  ...(i < step  ? styles.stepDone    : {}),
                  ...(i === step ? styles.stepActive  : {}),
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <div>
                  <p style={{ ...styles.stepLabel, color: i === step ? "#fff" : "#6B8F7A" }}>
                    {label}
                  </p>
                  <p style={styles.stepSub}>
                    {i === 0 && "Create your account"}
                    {i === 1 && "Set up your business"}
                    {i === 2 && "Choose a plan"}
                    {i === 3 && "Complete payment"}
                  </p>
                </div>
                {i < STEPS.length - 1 && <div style={styles.stepConnector} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.right}>
        <div style={styles.form}>

          {/* ── Step 0: Account ── */}
          {step === 0 && (
            <>
              <h2 style={styles.formTitle}>Create your account</h2>
              <p style={styles.formSub}>
                Already have one?{" "}
                <span style={styles.link} onClick={() => navigate("/login")}>
                  Sign in
                </span>
              </p>

              {error && <div style={styles.error}>{error}</div>}

              <button
                style={styles.googleBtn}
                onClick={handleGoogleSignup}
                disabled={loading}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div style={styles.divider}>
                <div style={styles.dividerLine} />
                <span style={styles.dividerText}>or</span>
                <div style={styles.dividerLine} />
              </div>

              <Field label="Username" value={form.username} onChange={v => update("username", v)} placeholder="yourname" />
              <Field label="Email address" value={form.email} onChange={v => update("email", v)} placeholder="you@business.com" type="email" />
              <Field label="Password" value={form.password} onChange={v => update("password", v)} placeholder="••••••••" type="password" />

              <button style={styles.submitBtn} onClick={handleRegister} disabled={loading}>
                {loading ? "Creating account..." : "Continue →"}
              </button>
            </>
          )}

          {/* ── Step 1: Business ── */}
          {step === 1 && (
            <>
              <h2 style={styles.formTitle}>Set up your business</h2>
              <p style={styles.formSub}>This is how your business appears on PayKit.</p>

              {error && <div style={styles.error}>{error}</div>}

              <Field
                label="Business name"
                value={form.tenantName}
                onChange={v => update("tenantName", v)}
                placeholder="e.g. Amira's Salon"
              />
              <Field
                label="Business slug"
                value={form.slug}
                onChange={v => update("slug", v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                placeholder="e.g. amiras-salon"
                hint="Used in your dashboard URL. Letters, numbers and hyphens only."
              />

              <button style={styles.submitBtn} onClick={handleCreateTenant} disabled={loading}>
                {loading ? "Setting up..." : "Continue →"}
              </button>
            </>
          )}

          {/* ── Step 2: Plan ── */}
          {step === 2 && (
            <>
              <h2 style={styles.formTitle}>Choose your plan</h2>
              <p style={styles.formSub}>Start with any plan. Upgrade anytime.</p>

              <div style={styles.planGrid}>
                {plans.map(plan => (
                  <div
                    key={plan.id}
                    style={{
                      ...styles.planCard,
                      ...(selectedPlan?.id === plan.id ? styles.planCardActive : {}),
                    }}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    {plan.name === "Pro" && (
                      <span style={styles.popularBadge}>Most popular</span>
                    )}
                    <p style={styles.planName}>{plan.name}</p>
                    <p style={styles.planPrice}>
                      {fmt(plan.price_kes)}
                      <span style={styles.planPer}>/mo</span>
                    </p>
                    <div style={styles.planFeatures}>
                      {plan.name === "Starter" && (
                        <>
                          <PlanFeature text="100 transactions/month" />
                          <PlanFeature text="Basic dashboard" />
                          <PlanFeature text="STK Push payments" />
                          <PlanFeature text="Email support" />
                        </>
                      )}
                      {plan.name === "Pro" && (
                        <>
                          <PlanFeature text="1,000 transactions/month" />
                          <PlanFeature text="Customer management" />
                          <PlanFeature text="Analytics + reports" />
                          <PlanFeature text="Auto retry failed payments" />
                          <PlanFeature text="Priority support" />
                        </>
                      )}
                      {plan.name === "Enterprise" && (
                        <>
                          <PlanFeature text="Unlimited transactions" />
                          <PlanFeature text="API access" />
                          <PlanFeature text="Webhook support" />
                          <PlanFeature text="Custom reports" />
                          <PlanFeature text="Dedicated support" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                style={{ ...styles.submitBtn, opacity: selectedPlan ? 1 : 0.5 }}
                onClick={() => selectedPlan && setStep(3)}
                disabled={!selectedPlan}
              >
                Continue with {selectedPlan?.name || "a plan"} →
              </button>
            </>
          )}

          {/* ── Step 3: Pay ── */}
          {step === 3 && (
            <>
              <h2 style={styles.formTitle}>Complete payment</h2>
              <p style={styles.formSub}>
                You're activating the{" "}
                <strong>{selectedPlan?.name}</strong> plan —{" "}
                <strong>{selectedPlan ? fmt(selectedPlan.price_kes) : ""}/month</strong>
              </p>

              {error && <div style={styles.error}>{error}</div>}

              {payStatus === "PENDING" ? (
                <div style={styles.pendingBox}>
                  <div style={styles.spinner} />
                  <p style={styles.pendingTitle}>Check your phone</p>
                  <p style={styles.pendingSub}>
                    We sent an M-Pesa prompt to {form.phone}.<br />
                    Enter your PIN to complete the payment.
                  </p>
                </div>
              ) : payStatus === "SUCCESS" ? (
                <div style={styles.successBox}>
                  <p style={styles.successIcon}>🎉</p>
                  <p style={styles.successTitle}>Payment successful!</p>
                  <p style={styles.successSub}>Taking you to your dashboard...</p>
                </div>
              ) : (
                <>
                  <Field
                    label="M-Pesa phone number"
                    value={form.phone}
                    onChange={v => update("phone", v)}
                    placeholder="2547XXXXXXXX"
                    hint="Enter the number that will receive the M-Pesa prompt."
                  />
                  <button style={styles.submitBtn} onClick={handlePay} disabled={loading}>
                    {loading ? "Initiating..." : `Pay ${selectedPlan ? fmt(selectedPlan.price_kes) : ""} via M-Pesa`}
                  </button>
                  <button style={styles.backBtn} onClick={() => setStep(2)}>
                    ← Change plan
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text", hint }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={fieldStyles.label}>{label}</label>
      <input
        style={fieldStyles.input}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {hint && <p style={fieldStyles.hint}>{hint}</p>}
    </div>
  );
}

function PlanFeature({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
      <span style={{ color: "#00A651", fontSize: "12px", fontWeight: "700" }}>✓</span>
      <span style={{ fontSize: "12px", color: "#6B7280" }}>{text}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

const fieldStyles = {
  label: { display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" },
  input: { width: "100%", padding: "11px 14px", border: "1.5px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", color: "#0F1F1C", boxSizing: "border-box", outline: "none" },
  hint: { margin: "5px 0 0", fontSize: "11px", color: "#9CA3AF" },
};

const styles = {
  page: { display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  left: { width: "400px", flexShrink: 0, background: "#0F1F1C", display: "flex", alignItems: "center", padding: "60px 48px" },
  leftInner: { width: "100%" },
  brand: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "56px" },
  brandDot: { width: "10px", height: "10px", borderRadius: "50%", background: "#00A651" },
  brandName: { color: "#fff", fontSize: "20px", fontWeight: "700" },
  stepList: { display: "flex", flexDirection: "column", gap: "0" },
  stepItem: { display: "flex", alignItems: "flex-start", gap: "16px", position: "relative" },
  stepCircle: { width: "32px", height: "32px", borderRadius: "50%", background: "#2D4A44", color: "#6B8F7A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", flexShrink: 0, zIndex: 1 },
  stepDone: { background: "#00A651", color: "#fff" },
  stepActive: { background: "#00A651", color: "#fff", boxShadow: "0 0 0 4px rgba(0,166,81,0.2)" },
  stepLabel: { margin: "4px 0 2px", fontSize: "14px", fontWeight: "600" },
  stepSub: { margin: 0, fontSize: "12px", color: "#4A6B5A" },
  stepConnector: { position: "absolute", left: "15px", top: "32px", width: "2px", height: "36px", background: "#2D4A44" },
  right: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 48px", background: "#fff", overflowY: "auto" },
  form: { width: "100%", maxWidth: "460px" },
  formTitle: { margin: "0 0 8px", fontSize: "26px", fontWeight: "700", color: "#0F1F1C", letterSpacing: "-0.02em" },
  formSub: { margin: "0 0 28px", fontSize: "14px", color: "#6B7280" },
  link: { color: "#00A651", cursor: "pointer", fontWeight: "600" },
  error: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px" },
  googleBtn: { width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "20px" },
  divider: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" },
  dividerLine: { flex: 1, height: "1px", background: "#F3F4F6" },
  dividerText: { fontSize: "12px", color: "#9CA3AF" },
  submitBtn: { width: "100%", padding: "12px", background: "#00A651", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "8px" },
  backBtn: { width: "100%", padding: "12px", background: "none", border: "1.5px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", color: "#6B7280", cursor: "pointer", marginTop: "8px" },
  planGrid: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" },
  planCard: { padding: "16px 20px", border: "1.5px solid #E5E7EB", borderRadius: "12px", cursor: "pointer", position: "relative" },
  planCardActive: { border: "1.5px solid #00A651", background: "#F0FDF4" },
  popularBadge: { position: "absolute", top: "-10px", right: "16px", background: "#00A651", color: "#fff", fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "10px" },
  planName: { margin: "0 0 4px", fontWeight: "700", color: "#0F1F1C", fontSize: "15px" },
  planPrice: { margin: "0 0 12px", fontSize: "22px", fontWeight: "700", color: "#00A651" },
  planPer: { fontSize: "13px", fontWeight: "400", color: "#9CA3AF" },
  planFeatures: { borderTop: "1px solid #F3F4F6", paddingTop: "12px" },
  pendingBox: { background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "32px", textAlign: "center" },
  spinner: { width: "32px", height: "32px", border: "3px solid #BBF7D0", borderTop: "3px solid #00A651", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" },
  pendingTitle: { margin: "0 0 8px", fontWeight: "700", fontSize: "16px", color: "#0F1F1C" },
  pendingSub: { margin: 0, fontSize: "13px", color: "#6B7280", lineHeight: "1.6" },
  successBox: { background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "40px", textAlign: "center" },
  successIcon: { fontSize: "40px", margin: "0 0 12px" },
  successTitle: { margin: "0 0 8px", fontWeight: "700", fontSize: "18px", color: "#0F1F1C" },
  successSub: { margin: 0, fontSize: "13px", color: "#6B7280" },
};
