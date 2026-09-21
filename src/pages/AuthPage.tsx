import { useState } from "react";

type Role = "startup" | "investor";

export default function AuthPage() {
  const [role, setRole] = useState<Role>("startup");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#03030d",
        color: "#c4c7f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Syne', sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#06091a",
          border: "1px solid rgba(9,65,202,0.25)",
          borderRadius: "16px",
          padding: "28px",
        }}
      >
        <h1 style={{ margin: 0, fontFamily: "'Marcellus', serif", fontWeight: 400, marginBottom: "8px" }}>
          Sign in
        </h1>
        <p style={{ marginTop: 0, marginBottom: "20px", color: "rgba(196,199,242,0.5)" }}>
          Continue with Google to create or access your VentureLink profile.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          {["startup", "investor"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r as Role)}
              style={{
                background: role === r ? "rgba(9,65,202,0.25)" : "rgba(196,199,242,0.04)",
                border: role === r ? "1px solid rgba(30,151,242,0.6)" : "1px solid rgba(196,199,242,0.12)",
                color: "#c4c7f2",
                borderRadius: "8px",
                padding: "10px",
                cursor: "pointer",
                textTransform: "capitalize",
                fontWeight: 600,
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <button
          onClick={() => { window.location.href = `/api/auth/google?role=${role}`; }}
          style={{
            width: "100%",
            marginTop: "14px",
            background: "#091eca",
            border: "none",
            color: "#c4c7f2",
            padding: "12px",
            borderRadius: "8px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

