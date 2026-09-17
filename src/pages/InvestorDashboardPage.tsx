import { useEffect, useState, type CSSProperties } from "react";
import { api } from "../api";

const DEALS = [
  { company: "PaySprint", score: 95, stage: "Seed", sector: "Fintech", ask: "$1.5M", note: "Strong API-first distribution and 18% MoM growth." },
  { company: "CredEdge", score: 90, stage: "Series A", sector: "Lending Infra", ask: "$4M", note: "Clear underwriting moat and improving unit economics." },
  { company: "LedgerFlow", score: 86, stage: "Pre-seed", sector: "SME SaaS", ask: "$600K", note: "Early but high founder-market fit confidence." },
];

export default function InvestorDashboardPage({ onNavigate, userData }: { onNavigate?: (screen: string) => void; userData?: any }) {
  const [deals, setDeals] = useState(DEALS);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userData?.investorId) return;
    api<{ deals: Array<{ company_name: string; score: number; stage?: string; sector?: string; summary?: string }>; message?: string }>(`/investor/${userData.investorId}/dealflow`)
      .then((result) => {
        setMessage(result.message || "");
        if (result.deals.length) setDeals(result.deals.map((deal) => ({
          company: deal.company_name,
          score: Math.round(deal.score * 100),
          stage: deal.stage || "Pre-seed",
          sector: deal.sector || "General",
          ask: "TBD",
          note: deal.summary || "Matched to your investment thesis.",
        })));
      })
      .catch((error: Error) => setMessage(error.message));
  }, [userData?.investorId]);

  return (
    <div style={{ minHeight: "100vh", background: "#03030d", color: "#c4c7f2", fontFamily: "'Syne', sans-serif", padding: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Marcellus', serif", fontWeight: 400 }}>Investor Dashboard</h1>
          <p style={{ marginTop: "8px", color: "rgba(196,199,242,0.5)" }}>
            Welcome {userData?.name || "Investor"}. Your dealflow is ranked by thesis fit.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => onNavigate?.("discover")} style={buttonGhost}>Discover</button>
          <button onClick={() => onNavigate?.("landing")} style={buttonPrimary}>Home</button>
          <button onClick={() => onNavigate?.("logout")} style={buttonGhost}>Logout</button>
        </div>
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        {message && <p style={{ color: "rgba(196,199,242,0.5)", margin: 0 }}>{message}</p>}
        {deals.map((deal) => (
          <div key={deal.company} style={{ background: "#06091a", border: "1px solid rgba(9,65,202,0.25)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "'Marcellus', serif", fontWeight: 400 }}>{deal.company}</h3>
                <p style={{ margin: "6px 0 0", color: "rgba(196,199,242,0.5)", fontSize: "13px" }}>
                  {deal.stage} • {deal.sector} • Ask {deal.ask}
                </p>
              </div>
              <div style={{ fontWeight: 700, color: "#1e97f2" }}>{deal.score}% fit</div>
            </div>
            <p style={{ marginBottom: 0, marginTop: "10px", color: "rgba(196,199,242,0.65)", lineHeight: 1.6 }}>{deal.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const buttonPrimary: CSSProperties = {
  background: "#091eca",
  border: "none",
  color: "#c4c7f2",
  borderRadius: "8px",
  padding: "10px 14px",
  cursor: "pointer",
};

const buttonGhost: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(9,65,202,0.35)",
  color: "#c4c7f2",
  borderRadius: "8px",
  padding: "10px 14px",
  cursor: "pointer",
};
