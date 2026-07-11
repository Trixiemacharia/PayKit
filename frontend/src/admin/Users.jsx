import { useState, useEffect } from "react";
import { getAdminUsers, adminUserAction } from "../api/client";
import Badge from "../components/Badge";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await getAdminUsers();
    setUsers(res.data.users);
  }

  async function doAction(userId, action, extra = {}) {
    try {
      const res = await adminUserAction(userId, action, extra);
      setMsg(res.data.message);
      load();
    } catch { setMsg("Action failed"); }
  }

  function handleResetPassword(userId, email) {
    const newPassword = window.prompt(`Enter new password for ${email}:`);
    if (newPassword) doAction(userId, "reset_password", { new_password: newPassword });
  }

  return (
    <div>
      <h2 style={styles.title}>Users</h2>
      {msg && <div style={styles.msg}>{msg}</div>}

      <table style={styles.table}>
        <thead>
          <tr>
            {["Username", "Email", "Business", "Status", "Joined", "Actions"].map(h => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={styles.td}><strong>{u.username}</strong></td>
              <td style={styles.td}>{u.email}</td>
              <td style={styles.td}>{u.business}</td>
              <td style={styles.td}>
                <Badge status={u.is_active ? "ACTIVE" : "EXPIRED"} />
              </td>
              <td style={styles.td}>{u.date_joined}</td>
              <td style={styles.td}>
                <div style={styles.actions}>
                  <button
                    style={{ ...styles.btn, ...(u.is_active ? styles.btnWarn : styles.btnGreen) }}
                    onClick={() => doAction(u.id, u.is_active ? "deactivate" : "activate")}
                  >
                    {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    style={{ ...styles.btn, ...styles.btnBlue }}
                    onClick={() => handleResetPassword(u.id, u.email)}
                  >
                    Reset Password
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
  td: { padding: "14px 12px", borderBottom: "1px solid #F9FAFB" },
  actions: { display: "flex", gap: "6px" },
  btn: { padding: "5px 10px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "600" },
  btnWarn: { background: "#FEF3C7", color: "#92400E" },
  btnGreen: { background: "#D1FAE5", color: "#065F46" },
  btnBlue: { background: "#EFF6FF", color: "#1D4ED8" },
};