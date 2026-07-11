export default function StatCard({ label, value, sub, color = "#00A651" }) {
  return (
    <div style={styles.card}>
      <p style={styles.label}>{label}</p>
      <p style={{ ...styles.value, color }}>{value}</p>
      {sub && <p style={styles.sub}>{sub}</p>}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    padding: "20px 24px",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  label: { margin: "0 0 6px", fontSize: "12px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" },
  value: { margin: "0 0 4px", fontSize: "26px", fontWeight: "700" },
  sub: { margin: 0, fontSize: "11px", color: "#9CA3AF" },
};