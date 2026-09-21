import { useEffect, useState, useRef } from "react";
import { api } from "../api";

const MOCK_INVESTORS = [
  {
    id: 1,
    name: "Priya Mehta",
    firm: "Nexus Venture Partners",
    avatar: "PM",
    color: "#091eca",
    location: "Mumbai, India",
    stage: ["Seed", "Series A"],
    sectors: ["Fintech", "SaaS", "AI/ML"],
    ticket: "$500K – $3M",
    portfolio: ["Unacademy", "Postman", "Delhivery"],
    thesis: "Backing category-defining companies in India's digital infrastructure layer. We look for founders who obsess over distribution, not just product.",
    score: 97,
    scoreBreakdown: [
      { label: "Sector alignment", value: 99 },
      { label: "Stage fit", value: 96 },
      { label: "Thesis match", value: 95 },
      { label: "Ticket range", value: 98 },
    ],
    matchReason: "Nexus has deployed $340M into B2B Fintech and SaaS. Your focus on payment infrastructure directly maps to 4 of their last 6 investments.",
  },
  {
    id: 2,
    name: "Rahul Khanna",
    firm: "Trifecta Capital",
    avatar: "RK",
    color: "#032c7c",
    location: "Bangalore, India",
    stage: ["Series A", "Series B"],
    sectors: ["Fintech", "Consumer", "HealthTech"],
    ticket: "$2M – $10M",
    portfolio: ["Licious", "Zetwerk", "Khatabook"],
    thesis: "Venture debt and equity for companies with strong unit economics and a clear path to profitability. We like capital-efficient teams.",
    score: 91,
    scoreBreakdown: [
      { label: "Sector alignment", value: 94 },
      { label: "Stage fit", value: 88 },
      { label: "Thesis match", value: 92 },
      { label: "Ticket range", value: 89 },
    ],
    matchReason: "Trifecta's venture debt model is ideal if you're post-revenue. Their Fintech portfolio shows preference for B2B payments, closely matching your vertical.",
  },
  {
    id: 3,
    name: "Anisha Singh",
    firm: "IvyCap Ventures",
    avatar: "AS",
    color: "#1e97f2",
    location: "Delhi, India",
    stage: ["Pre-seed", "Seed"],
    sectors: ["EdTech", "AI/ML", "SaaS"],
    ticket: "$100K – $1M",
    portfolio: ["Classplus", "Teachmint", "Pratilipi"],
    thesis: "Early believers in founders building for Bharat. We lead pre-seed rounds and stay close through Series A.",
    score: 84,
    scoreBreakdown: [
      { label: "Sector alignment", value: 80 },
      { label: "Stage fit", value: 90 },
      { label: "Thesis match", value: 82 },
      { label: "Ticket range", value: 85 },
    ],
    matchReason: "IvyCap's early-stage thesis fits your current round size. Though their primary focus is EdTech, they've increasingly backed B2B SaaS with AI components.",
  },
  {
    id: 4,
    name: "Karan Bajaj",
    firm: "Matrix Partners India",
    avatar: "KB",
    color: "#030f30",
    location: "Mumbai, India",
    stage: ["Seed", "Series A", "Series B"],
    sectors: ["Fintech", "SaaS", "DeepTech"],
    ticket: "$1M – $8M",
    portfolio: ["Razorpay", "Dailyhunt", "Ola"],
    thesis: "We back founders with an unfair insight into a large market. Razorpay-style thinking — start narrow, win the layer.",
    score: 88,
    scoreBreakdown: [
      { label: "Sector alignment", value: 95 },
      { label: "Stage fit", value: 85 },
      { label: "Thesis match", value: 88 },
      { label: "Ticket range", value: 84 },
    ],
    matchReason: "Matrix led Razorpay's early rounds. Your payment infra play sits exactly in their core thesis. Strong portfolio synergy potential with Razorpay and Dailyhunt.",
  },
];

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 90 ? "#1e97f2" : score >= 80 ? "#091eca" : "#3044a8";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(196,199,242,0.08)" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x={size / 2} y={size / 2 + 5}
        textAnchor="middle"
        fill="#c4c7f2"
        fontSize="14"
        fontWeight="700"
        fontFamily="Syne, sans-serif"
        style={{ transform: `rotate(90deg) translate(0px, -${size}px)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {score}
      </text>
    </svg>
  );
}

function MatchCard({ investor, onPass, onConnect, active, behind }: { investor: any; onPass: () => void; onConnect: () => void; active: boolean; behind: boolean }) {
  const [tab, setTab] = useState("overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: investor.matchReason },
  ]);
  const [chatInput, setChatInput] = useState("");
  const dragRef = useRef({ startX: 0, dx: 0, dragging: false });
  const cardRef = useRef(null);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, dx: 0, dragging: true };
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    dragRef.current.dx = dx;
    setDragX(dx);
    setSwipeDir(dx > 30 ? "right" : dx < -30 ? "left" : null);
  };
  const handleMouseUp = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const dx = dragRef.current.dx;
    if (dx > 80) { onConnect(); }
    else if (dx < -80) { onPass(); }
    else { setDragX(0); setSwipeDir(null); }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput("");
    setChatMessages(m => [...m, { role: "user", text: q }]);
    api<{ answer: string }>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ question: `${q}\nFocus on this profile: ${investor.name} at ${investor.firm}. Match evidence: ${investor.matchReason}` }),
    }).then(result => {
      setChatMessages(m => [...m, { role: "ai", text: result.answer }]);
    }).catch((error: Error) => {
      setChatMessages(m => [...m, { role: "ai", text: error.message }]);
    });
  };

  const rotation = dragX * 0.04;
  const opacity = behind ? 0.6 : 1;
  const scale = behind ? 0.95 : 1;

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "absolute",
        width: "100%",
        maxWidth: "520px",
        background: "#06091a",
        border: "1px solid rgba(9,65,202,0.25)",
        borderRadius: "20px",
        overflow: "hidden",
        cursor: active ? "grab" : "default",
        userSelect: "none",
        transform: `translateX(${dragX}px) rotate(${rotation}deg) scale(${scale})`,
        opacity,
        transition: dragRef.current.dragging ? "none" : "transform 0.4s ease, opacity 0.3s",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        zIndex: behind ? 1 : 2,
      }}
    >
      {swipeDir === "right" && (
        <div style={{
          position: "absolute", top: "24px", left: "24px", zIndex: 10,
          background: "rgba(9,65,202,0.9)", border: "2px solid #1e97f2",
          borderRadius: "8px", padding: "6px 16px",
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px",
          color: "#c4c7f2", letterSpacing: "0.1em", transform: "rotate(-8deg)",
        }}>
          CONNECT
        </div>
      )}
      {swipeDir === "left" && (
        <div style={{
          position: "absolute", top: "24px", right: "24px", zIndex: 10,
          background: "rgba(3,13,48,0.9)", border: "2px solid rgba(196,199,242,0.3)",
          borderRadius: "8px", padding: "6px 16px",
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px",
          color: "rgba(196,199,242,0.5)", letterSpacing: "0.1em", transform: "rotate(8deg)",
        }}>
          PASS
        </div>
      )}

      <div style={{
        height: "6px",
        background: `linear-gradient(90deg, #091eca ${investor.score}%, rgba(9,65,202,0.1) ${investor.score}%)`,
      }} />

      <div style={{ padding: "28px 28px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px",
              background: `linear-gradient(135deg, ${investor.color}, #1e97f2)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Marcellus', serif", fontSize: "18px", color: "#fff",
              flexShrink: 0,
            }}>
              {investor.avatar}
            </div>
            <div>
              <div style={{ fontFamily: "'Marcellus', serif", fontSize: "20px", color: "#c4c7f2", fontWeight: 400 }}>
                {investor.name}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(196,199,242,0.4)", fontWeight: 600, letterSpacing: "0.04em" }}>
                {investor.firm}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(196,199,242,0.25)", marginTop: "2px" }}>
                {investor.location}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ScoreRing score={investor.score} size={60} />
            <span style={{ fontSize: "9px", color: "rgba(196,199,242,0.3)", fontWeight: 600, letterSpacing: "0.1em", marginTop: "4px" }}>
              MATCH
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0", marginBottom: "20px", borderBottom: "1px solid rgba(9,65,202,0.2)" }}>
          {["overview", "breakdown", "chat"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: "none", border: "none",
              borderBottom: tab === t ? "2px solid #1e97f2" : "2px solid transparent",
              color: tab === t ? "#c4c7f2" : "rgba(196,199,242,0.35)",
              padding: "8px 16px", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: "pointer", fontFamily: "'Syne', sans-serif",
              transition: "all 0.15s", marginBottom: "-1px",
            }}>
              {t === "chat" ? "Ask AI" : t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div style={{ minHeight: "200px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
              {investor.sectors.map((s: string) => (
                <span key={s} style={{
                  background: "rgba(9,65,202,0.15)", border: "1px solid rgba(9,65,202,0.3)",
                  borderRadius: "5px", padding: "3px 10px",
                  fontSize: "11px", color: "#1e97f2", fontWeight: 600, letterSpacing: "0.04em",
                }}>{s}</span>
              ))}
              {investor.stage.map((s: string) => (
                <span key={s} style={{
                  background: "rgba(196,199,242,0.04)", border: "1px solid rgba(196,199,242,0.1)",
                  borderRadius: "5px", padding: "3px 10px",
                  fontSize: "11px", color: "rgba(196,199,242,0.4)", fontWeight: 600, letterSpacing: "0.04em",
                }}>{s}</span>
              ))}
            </div>
            <p style={{ fontSize: "13px", color: "rgba(196,199,242,0.5)", lineHeight: 1.75, marginBottom: "16px" }}>
              {investor.thesis}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "rgba(196,199,242,0.25)", fontWeight: 600, letterSpacing: "0.1em", marginBottom: "2px" }}>
                  TICKET
                </div>
                <div style={{ fontSize: "13px", color: "#c4c7f2", fontWeight: 600 }}>{investor.ticket}</div>
              </div>
              <div style={{ width: "1px", height: "28px", background: "rgba(196,199,242,0.08)" }} />
              <div>
                <div style={{ fontSize: "10px", color: "rgba(196,199,242,0.25)", fontWeight: 600, letterSpacing: "0.1em", marginBottom: "2px" }}>
                  PORTFOLIO
                </div>
                <div style={{ fontSize: "13px", color: "#c4c7f2", fontWeight: 600 }}>{investor.portfolio.join(" · ")}</div>
              </div>
            </div>
          </div>
        )}

        {tab === "breakdown" && (
          <div style={{ minHeight: "200px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {investor.scoreBreakdown.map((b: any) => (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "rgba(196,199,242,0.45)", fontWeight: 600 }}>{b.label}</span>
                  <span style={{ fontSize: "12px", color: "#1e97f2", fontWeight: 700 }}>{b.value}</span>
                </div>
                <div style={{ height: "4px", background: "rgba(196,199,242,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${b.value}%`,
                    background: b.value >= 90 ? "#1e97f2" : "#091eca",
                    borderRadius: "2px", transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            ))}
            <div style={{
              marginTop: "8px", padding: "14px", borderRadius: "10px",
              background: "rgba(9,65,202,0.08)", border: "1px solid rgba(9,65,202,0.2)",
            }}>
              <div style={{ fontSize: "10px", color: "#1e97f2", fontWeight: 700, letterSpacing: "0.12em", marginBottom: "6px" }}>
                WHY THIS MATCH
              </div>
              <p style={{ fontSize: "12px", color: "rgba(196,199,242,0.5)", lineHeight: 1.7, margin: 0 }}>
                {investor.matchReason}
              </p>
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div style={{ minHeight: "200px", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px", maxHeight: "180px", overflowY: "auto" }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "rgba(9,65,202,0.3)" : "rgba(196,199,242,0.05)",
                  border: m.role === "user" ? "1px solid rgba(9,65,202,0.4)" : "1px solid rgba(196,199,242,0.08)",
                  borderRadius: "10px", padding: "10px 14px",
                  fontSize: "12px", color: m.role === "user" ? "#c4c7f2" : "rgba(196,199,242,0.6)",
                  lineHeight: 1.65, maxWidth: "88%",
                }}>
                  {m.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Why is this a good match?"
                style={{
                  flex: 1, background: "rgba(196,199,242,0.04)",
                  border: "1px solid rgba(9,65,202,0.25)", borderRadius: "8px",
                  padding: "9px 14px", color: "#c4c7f2", fontSize: "12px",
                  fontFamily: "'Syne', sans-serif", outline: "none",
                }}
              />
              <button onClick={sendChat} style={{
                background: "#091eca", border: "none", borderRadius: "8px",
                padding: "9px 16px", color: "#c4c7f2", fontSize: "12px",
                fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif",
              }}>
                →
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: "flex", gap: "0",
        borderTop: "1px solid rgba(9,65,202,0.15)",
      }}>
        <button onClick={onPass} style={{
          flex: 1, background: "transparent",
          border: "none", borderRight: "1px solid rgba(9,65,202,0.15)",
          padding: "16px", color: "rgba(196,199,242,0.35)",
          fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em",
          cursor: "pointer", fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(196,199,242,0.03)"; e.currentTarget.style.color = "rgba(196,199,242,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(196,199,242,0.35)"; }}
        >
          ✕ PASS
        </button>
        <button onClick={onConnect} style={{
          flex: 1, background: "transparent",
          border: "none", padding: "16px",
          color: "#1e97f2", fontSize: "12px", fontWeight: 700,
          letterSpacing: "0.1em", cursor: "pointer",
          fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(9,65,202,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          ◆ CONNECT
        </button>
      </div>
    </div>
  );
}

function ConnectedToast({ investor, onClose }: { investor: any; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", bottom: "32px", left: "50%", transform: "translateX(-50%)",
      background: "#06091a", border: "1px solid rgba(30,151,242,0.4)",
      borderRadius: "14px", padding: "16px 24px",
      display: "flex", alignItems: "center", gap: "16px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.6)", zIndex: 200,
      animation: "slideUp 0.3s ease",
    }}>
      <div style={{
        width: "36px", height: "36px", borderRadius: "10px",
        background: `linear-gradient(135deg, ${investor.color}, #1e97f2)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Marcellus', serif", fontSize: "14px", color: "#fff",
      }}>
        {investor.avatar}
      </div>
      <div>
        <div style={{ fontSize: "13px", color: "#c4c7f2", fontWeight: 600 }}>
          Request sent to {investor.name}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", marginTop: "2px" }}>
          {investor.firm} · Match score {investor.score}
        </div>
      </div>
      <button onClick={onClose} style={{
        background: "none", border: "none", color: "rgba(196,199,242,0.3)",
        cursor: "pointer", fontSize: "16px", padding: "4px",
      }}>✕</button>
    </div>
  );
}

export default function DiscoverPage({ onNavigate, userData }: { onNavigate?: (screen: string) => void; userData?: any }) {
  const [cards, setCards] = useState(MOCK_INVESTORS);
  const [connected, setConnected] = useState<typeof MOCK_INVESTORS>([]);
  const [toast, setToast] = useState<typeof MOCK_INVESTORS[0] | null>(null);
  const [filter, setFilter] = useState("All");
  const [apiMessage, setApiMessage] = useState("");
  const isInvestor = userData?.role === "investor";

  useEffect(() => {
    api<{ items: Array<{ user_id: string; name: string; profile_picture?: string; profile: any; match: { percentage: number; strong_alignment: string[]; potential_mismatch: string[] } }>; message?: string }>("/discover")
      .then((result) => {
        setApiMessage(result.message || "");
        if (result.items.length) setCards(result.items.map((item, index) => {
          const profile = item.profile;
          const name = isInvestor ? profile.company_name || item.name : profile.name_firm || item.name;
          return {
            ...MOCK_INVESTORS[index % MOCK_INVESTORS.length],
            id: item.user_id,
            name,
            firm: isInvestor ? profile.one_liner || "Startup" : profile.name_firm || item.name,
            avatar: name.split(" ").map((part: string) => part[0]).join("").slice(0, 2),
            location: isInvestor ? profile.location || "Location not specified" : profile.geography || "Global",
            stage: isInvestor ? [profile.stage || "Pre-seed"] : profile.stages || [],
            sectors: profile.sectors?.length ? profile.sectors : [profile.industry || "General"],
            ticket: isInvestor ? profile.funding_required || "Not specified" : profile.ticket_size || "Not specified",
            portfolio: isInvestor ? [profile.traction || "Traction not specified"] : MOCK_INVESTORS[index % MOCK_INVESTORS.length].portfolio,
            thesis: profile.thesis || profile.description || "Profile information",
            score: item.match.percentage,
            matchReason: [...item.match.strong_alignment.map((reason: string) => `Strong alignment: ${reason}`), ...item.match.potential_mismatch.map((reason: string) => `Potential mismatch: ${reason}`)].join(". "),
          };
        }));
      })
      .catch((error: Error) => setApiMessage(error.message));
    api<{ connections: Array<{ user_id: string; name: string; action: string }> }>("/connections")
      .then((result) => setConnected(result.connections.map((connection, index) => ({
        ...MOCK_INVESTORS[index % MOCK_INVESTORS.length],
        id: connection.user_id,
        name: connection.name,
        score: 0,
      }))))
      .catch(() => undefined);
  }, []);

  const filters = ["All", "Fintech", "SaaS", "AI/ML", "HealthTech"];

  const visibleCards = cards.filter(c =>
    filter === "All" || c.sectors.includes(filter)
  );

  const handlePass = () => {
    const top = visibleCards[0];
    if (!top) return;
    api("/connections", { method: "POST", body: JSON.stringify({ target_id: top.id, target_type: isInvestor ? "startup" : "investor", action: "pass" }) }).catch(() => undefined);
    setCards(prev => prev.filter(c => c.id !== top.id));
  };

  const handleConnect = () => {
    const top = visibleCards[0];
    if (!top) return;
    api("/connections", { method: "POST", body: JSON.stringify({ target_id: top.id, target_type: isInvestor ? "startup" : "investor", action: "connect" }) }).catch((error: Error) => setApiMessage(error.message));
    setConnected(prev => [...prev, top]);
    setToast(top);
    setCards(prev => prev.filter(c => c.id !== top.id));
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div style={{
      background: "#03030d",
      color: "#c4c7f2",
      fontFamily: "'Syne', sans-serif",
      minHeight: "100vh",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Syne:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(3,3,13,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(9,65,202,0.2)",
        padding: "0 40px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: "64px",
      }}>
        <div onClick={() => onNavigate?.("landing")} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <img src="/src/assets/fi.png" alt="Fintech logo" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <span style={{ fontFamily: "'Marcellus', serif", fontSize: "18px", color: "#c4c7f2" }}>Fintech</span>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? "rgba(9,65,202,0.25)" : "transparent",
              border: filter === f ? "1px solid rgba(30,151,242,0.4)" : "1px solid transparent",
              color: filter === f ? "#c4c7f2" : "rgba(196,199,242,0.35)",
              padding: "6px 14px", borderRadius: "6px",
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
              cursor: "pointer", fontFamily: "'Syne', sans-serif", transition: "all 0.15s",
            }}>
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: "11px", color: "rgba(196,199,242,0.3)", fontWeight: 600, letterSpacing: "0.08em" }}>
            {connected.length} CONNECTED
          </div>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #091eca, #1e97f2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", color: "#fff", fontFamily: "'Marcellus', serif", cursor: "pointer",
          }}>
            {userData?.name?.[0] || "U"}
          </div>
        </div>
      </nav>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: "0",
        minHeight: "100vh",
        paddingTop: "64px",
      }}>
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "40px",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: "30%", left: "40%",
            width: "400px", height: "400px",
            background: "radial-gradient(circle, rgba(9,65,202,0.07) 0%, transparent 70%)",
            borderRadius: "50%", pointerEvents: "none",
          }} />

          {visibleCards.length === 0 ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Marcellus', serif", fontSize: "32px", color: "#c4c7f2", marginBottom: "12px" }}>
                You've seen them all
              </div>
              <p style={{ color: "rgba(196,199,242,0.4)", fontSize: "14px", marginBottom: "28px" }}>
                {connected.length} connections made · More investors added daily
              </p>
              <button onClick={() => setCards(MOCK_INVESTORS)} style={{
                background: "#091eca", color: "#c4c7f2", border: "none",
                padding: "12px 28px", borderRadius: "8px", fontSize: "13px",
                fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif",
                letterSpacing: "0.06em",
              }}>
                Start over
              </button>
            </div>
          ) : (
            <div style={{ position: "relative", width: "520px", height: "560px" }}>
              {visibleCards.slice(0, 2).reverse().map((inv, i, arr) => (
                <MatchCard
                  key={inv.id}
                  investor={inv}
                  onPass={handlePass}
                  onConnect={handleConnect}
                  active={i === arr.length - 1}
                  behind={i < arr.length - 1}
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "rgba(196,199,242,0.2)", fontWeight: 600, letterSpacing: "0.1em" }}>
              DRAG TO SWIPE
            </span>
            <span style={{ fontSize: "11px", color: "rgba(196,199,242,0.12)" }}>·</span>
            <span style={{ fontSize: "11px", color: "rgba(196,199,242,0.2)", fontWeight: 600, letterSpacing: "0.1em" }}>
              {visibleCards.length} REMAINING
            </span>
          </div>
          {apiMessage && <p style={{ color: "rgba(196,199,242,0.45)", fontSize: "12px" }}>{apiMessage}</p>}
        </div>

        <div style={{
          borderLeft: "1px solid rgba(9,65,202,0.2)",
          background: "#04050f",
          padding: "32px 24px",
          overflowY: "auto",
        }}>
          <div style={{ fontSize: "11px", color: "rgba(196,199,242,0.3)", fontWeight: 700, letterSpacing: "0.14em", marginBottom: "20px" }}>
            CONNECTIONS ({connected.length})
          </div>

          {connected.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.2 }}>◇</div>
              <p style={{ fontSize: "12px", color: "rgba(196,199,242,0.25)", lineHeight: 1.7 }}>
                Swipe right or click Connect to start building your investor list
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {connected.map(inv => (
                <div key={inv.id} style={{
                  background: "rgba(196,199,242,0.03)",
                  border: "1px solid rgba(9,65,202,0.2)",
                  borderRadius: "12px", padding: "16px",
                  display: "flex", alignItems: "center", gap: "12px",
                }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
                    background: `linear-gradient(135deg, ${inv.color}, #1e97f2)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Marcellus', serif", fontSize: "14px", color: "#fff",
                  }}>
                    {inv.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", color: "#c4c7f2", fontWeight: 600, marginBottom: "2px" }}>
                      {inv.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "rgba(196,199,242,0.35)" }}>{inv.firm}</div>
                  </div>
                  <div style={{
                    fontSize: "13px", fontWeight: 700, color: "#1e97f2",
                    background: "rgba(9,65,202,0.12)", borderRadius: "6px",
                    padding: "4px 8px",
                  }}>
                    {inv.score}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(9,65,202,0.15)" }}>
            <div style={{ fontSize: "11px", color: "rgba(196,199,242,0.3)", fontWeight: 700, letterSpacing: "0.14em", marginBottom: "16px" }}>
              YOUR PROFILE
            </div>
            <div style={{ fontSize: "12px", color: "rgba(196,199,242,0.4)", lineHeight: 1.8 }}>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ color: "rgba(196,199,242,0.2)" }}>Role · </span>
                <span style={{ color: "#c4c7f2", textTransform: "capitalize" }}>{userData?.role || "Founder"}</span>
              </div>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ color: "rgba(196,199,242,0.2)" }}>Stage · </span>
                <span style={{ color: "#c4c7f2" }}>{userData?.stage || "Seed"}</span>
              </div>
              <div>
                <span style={{ color: "rgba(196,199,242,0.2)" }}>Sectors · </span>
                <span style={{ color: "#c4c7f2" }}>{userData?.sectors?.join(", ") || "Fintech, SaaS"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <ConnectedToast investor={toast} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
