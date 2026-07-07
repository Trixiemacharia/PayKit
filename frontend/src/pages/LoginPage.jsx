import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const res = await login(username, password);
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>PayKit</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          style={styles.button}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p style={styles.link}>
          No account?{" "}
          <span
            style={styles.linkText}
            onClick={() => navigate("/register")}
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0faf4" },
  card: { background: "#fff", padding: "40px", borderRadius: "12px", width: "360px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
  logo: { color: "#00A651", margin: "0 0 4px", fontSize: "28px" },
  subtitle: { color: "#6B7280", marginBottom: "24px", fontSize: "14px" },
  input: { width: "100%", padding: "12px", marginBottom: "12px", border: "1px solid #D1D5DB", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" },
  button: { width: "100%", padding: "12px", background: "#00A651", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", cursor: "pointer", fontWeight: "600" },
  error: { background: "#FEE2E2", color: "#DC2626", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "12px" },
  link: { textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#6B7280" },
  linkText: { color: "#00A651", cursor: "pointer", fontWeight: "600" },
};