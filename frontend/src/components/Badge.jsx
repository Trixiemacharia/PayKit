const COLORS = {
  SUCCESS:   { bg: "#D1FAE5", text: "#065F46" },
  FAILED:    { bg: "#FEE2E2", text: "#991B1B" },
  PENDING:   { bg: "#FEF3C7", text: "#92400E" },
  ACTIVE:    { bg: "#D1FAE5", text: "#065F46" },
  EXPIRED:   { bg: "#F3F4F6", text: "#374151" },
  CANCELLED: { bg: "#F3F4F6", text: "#374151" },
};

export default function Badge({ status }) {
  const c = COLORS[status] || { bg: "#F3F4F6", text: "#374151" };
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "12px", fontSize: "11px",
      fontWeight: "600", background: c.bg, color: c.text,
    }}>
      {status}
    </span>
  );
}