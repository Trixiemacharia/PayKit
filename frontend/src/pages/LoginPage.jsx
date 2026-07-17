import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { login, googleLogin } from "../api/client";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  function handleSuccess(tokens) {
    localStorage.setItem("access_token",  tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    localStorage.setItem("is_superuser",  tokens.is_superuser);
    if (tokens.is_superuser) {
      navigate("/admin-dashboard");
    } else {
      navigate("/dashboard");
    }
  }

  async function handleEmailLogin() {
    setLoading(true); setError("");
    try {
      const res = await login(email, password);
      handleSuccess(res.data);
    } catch {
      setError("Invalid email or password");
    } finally { setLoading(false); }
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      setLoading(true); setError("");
      try {
        const res = await googleLogin(response.access_token);
        handleSuccess(res.data);
      } catch {
        setError("Google login failed. Please try again.");
      } finally { setLoading(false); }
    },
    onError: () => setError("Google login failed. Please try again."),
  });

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.brand}>
            <span style={styles.brandDot} />
            <span style={styles.brandName}>PayKit</span>
          </div>
          <h1 style={styles.headline}>
            Accept M-Pesa payments.<br />
            Run your business.
          </h1>
          <p style={styles.subheadline}>
            The simplest way for Kenyan businesses to collect
            M-Pesa payments, track subscriptions, and manage customers —
            all in one dashboard.
          </p>
          <div style={styles.stats}>
            <div style={styles.stat}>
              <span style={styles.statNum}>3 min</span>
              <span style={styles.statLabel}>to get started</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat}>
              <span style={styles.statNum}>KES 999</span>
              <span style={styles.statLabel}>per month</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.stat}>
              <span style={styles.statNum}>0</span>
              <span style={styles.statLabel}>setup fees</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.right}>
        <div style={styles.form}>
          <h2 style={styles.formTitle}>Welcome back</h2>
          <p style={styles.formSub}>
            Don't have an account?{" "}
            <span
              style={styles.link}
              onClick={() => navigate("/register")}
            >
              Sign up free
            </span>
          </p>

          {error && <div style={styles.error}>{error}</div>}

          {/* Google button */}
          <button
            style={styles.googleBtn}
            onClick={handleGoogleLogin}
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

          {/* Email + password */}
          <div style={styles.field}>
            <label style={styles.label}>Email address</label>
            <input
              style={styles.input}
              type="email"
              placeholder="you@business.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmailLogin()}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmailLogin()}
            />
          </div>

          <button
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleEmailLogin}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
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

const styles = {
  page: { display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  left: { flex: 1, background: "#0F1F1C", display: "flex", alignItems: "center", padding: "60px" },
  leftInner: { maxWidth: "460px" },
  brand: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "48px" },
  brandDot: { width: "10px", height: "10px", borderRadius: "50%", background: "#00A651" },
  brandName: { color: "#fff", fontSize: "20px", fontWeight: "700", letterSpacing: "-0.02em" },
  headline: { color: "#fff", fontSize: "40px", fontWeight: "700", lineHeight: "1.15", margin: "0 0 20px", letterSpacing: "-0.03em" },
  subheadline: { color: "#6B8F7A", fontSize: "16px", lineHeight: "1.7", margin: "0 0 48px" },
  stats: { display: "flex", alignItems: "center", gap: "24px" },
  stat: { display: "flex", flexDirection: "column", gap: "4px" },
  statNum: { color: "#00A651", fontSize: "22px", fontWeight: "700" },
  statLabel: { color: "#6B8F7A", fontSize: "12px" },
  statDivider: { width: "1px", height: "32px", background: "#2D4A44" },
  right: { width: "480px", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 48px", background: "#fff" },
  form: { width: "100%" },
  formTitle: { margin: "0 0 8px", fontSize: "26px", fontWeight: "700", color: "#0F1F1C", letterSpacing: "-0.02em" },
  formSub: { margin: "0 0 32px", fontSize: "14px", color: "#6B7280" },
  link: { color: "#00A651", cursor: "pointer", fontWeight: "600" },
  error: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px" },
  googleBtn: { width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "24px", transition: "border-color 0.15s" },
  divider: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" },
  dividerLine: { flex: 1, height: "1px", background: "#F3F4F6" },
  dividerText: { fontSize: "12px", color: "#9CA3AF" },
  field: { marginBottom: "16px" },
  label: { display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" },
  input: { width: "100%", padding: "11px 14px", border: "1.5px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", color: "#0F1F1C", boxSizing: "border-box", outline: "none" },
  submitBtn: { width: "100%", padding: "12px", background: "#00A651", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "8px" },
};