import { useState } from "react";
import { api, type Investor, type Startup } from "../api";

const SECTORS = [
  "Fintech", "SaaS", "HealthTech", "EdTech", "CleanTech",
  "AI/ML", "Web3", "Consumer", "DeepTech", "AgriTech",
  "SpaceTech", "Logistics", "CyberSecurity", "Marketplace", "HRTech",
];

const STAGES_INVESTOR = ["Pre-seed", "Seed", "Series A", "Series B", "Series C+", "Growth"];
const STAGES_FOUNDER = ["Idea", "Pre-seed", "Seed", "Series A", "Series B+"];
const TICKET_SIZES = ["< $50K", "$50K–$250K", "$250K–$1M", "$1M–$5M", "$5M–$20M", "$20M+"];
const REGIONS = ["India", "Southeast Asia", "USA", "Europe", "Middle East", "Africa", "Global"];

function TriangleMeshSmall() {
  if (typeof window === "undefined") return null;

  return (
    <canvas
      ref={el => {
        if (!el) return;
        const ctx = el.getContext("2d");
        if (!ctx) return;
        
        el.width = el.offsetWidth;
        el.height = el.offsetHeight;
        const w = el.width, h = el.height;
        const nodes = Array.from({ length: 14 }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
        }));
        let animId: number;
        
        const draw = () => {
          ctx.clearRect(0, 0, w, h);
          const drawn = new Set();
          nodes.forEach((n, i) => {
            n.x += n.vx; n.y += n.vy;
            if (n.x < 0 || n.x > w) n.vx *= -1;
            if (n.y < 0 || n.y > h) n.vy *= -1;
            const dists = nodes.map((m, j) => ({ j, d: j === i ? Infinity : Math.hypot(m.x - n.x, m.y - n.y) })).sort((a, b) => a.d - b.d);
            const [a, b] = [dists[0].j, dists[1].j];
            const key = [i, a, b].sort().join("-");
            if (drawn.has(key)) return;
            drawn.add(key);
            const na = nodes[a], nb = nodes[b];
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); ctx.closePath();
            ctx.fillStyle = "rgba(9,65,202,0.04)"; ctx.fill();
            [[n, na], [na, nb], [nb, n]].forEach(([p, q]) => {
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
              ctx.strokeStyle = "rgba(30,151,242,0.12)"; ctx.lineWidth = 0.7; ctx.stroke();
            });
            [n, na, nb].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fillStyle = "rgba(196,199,242,0.3)"; ctx.fill(); });
          });
          animId = requestAnimationFrame(draw);
        };
        draw();
      }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

function Tag({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? "rgba(9,65,202,0.25)" : "rgba(196,199,242,0.04)",
        border: selected ? "1px solid rgba(30,151,242,0.5)" : "1px solid rgba(196,199,242,0.1)",
        color: selected ? "#c4c7f2" : "rgba(196,199,242,0.45)",
        padding: "7px 14px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "'Syne', sans-serif",
        letterSpacing: "0.04em",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = "rgba(30,151,242,0.3)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "rgba(196,199,242,0.1)"; }}
    >
      {label}
    </button>
  );
}

function Input({ label, placeholder, value, onChange, type = "text" }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; type?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: "rgba(196,199,242,0.04)",
          border: focused ? "1px solid rgba(30,151,242,0.6)" : "1px solid rgba(196,199,242,0.1)",
          borderRadius: "8px",
          padding: "12px 16px",
          color: "#c4c7f2",
          fontSize: "14px",
          fontFamily: "'Syne', sans-serif",
          outline: "none",
          transition: "border 0.2s",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function TextArea({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </label>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={4}
        style={{
          background: "rgba(196,199,242,0.04)",
          border: focused ? "1px solid rgba(30,151,242,0.6)" : "1px solid rgba(196,199,242,0.1)",
          borderRadius: "8px",
          padding: "12px 16px",
          color: "#c4c7f2",
          fontSize: "14px",
          fontFamily: "'Syne', sans-serif",
          outline: "none",
          transition: "border 0.2s",
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
    </div>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? "24px" : "6px",
          height: "6px",
          borderRadius: "3px",
          background: i === current ? "#1e97f2" : i < current ? "rgba(30,151,242,0.4)" : "rgba(196,199,242,0.15)",
          transition: "all 0.3s",
        }} />
      ))}
    </div>
  );
}

function RoleSelect({ onSelect }: { onSelect: (role: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const roles = [
    {
      id: "founder",
      title: "Founder",
      subtitle: "I'm building a startup",
      desc: "Find investors who genuinely align with your vision, sector, and stage.",
      icon: "◈",
      stats: ["8,400+ startups", "Avg. 3.2x faster raise"],
    },
    {
      id: "investor",
      title: "Investor",
      subtitle: "I'm deploying capital",
      desc: "Discover high-potential deals that match your thesis before anyone else.",
      icon: "◇",
      stats: ["1,200+ active LPs", "$4.2B connected"],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "80px 40px" }}>
      <div style={{ marginBottom: "56px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "#1e97f2", letterSpacing: "0.2em", fontWeight: 600, marginBottom: "16px" }}>
          STEP 1 OF 3
        </div>
        <h1 style={{ fontFamily: "'Marcellus', serif", fontSize: "clamp(36px, 4vw, 54px)", color: "#c4c7f2", fontWeight: 400, lineHeight: 1.1, marginBottom: "12px" }}>
          Who are you?
        </h1>
        <p style={{ color: "rgba(196,199,242,0.4)", fontSize: "15px", fontWeight: 400 }}>
          This shapes your entire experience on the platform.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", width: "100%", maxWidth: "680px" }}>
        {roles.map(r => (
          <div
            key={r.id}
            onClick={() => onSelect(r.id)}
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === r.id ? "rgba(9,65,202,0.1)" : "rgba(196,199,242,0.03)",
              border: hovered === r.id ? "1px solid rgba(30,151,242,0.4)" : "1px solid rgba(196,199,242,0.08)",
              borderRadius: "14px",
              padding: "36px 32px",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {hovered === r.id && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0,
                height: "2px",
                background: "linear-gradient(90deg, #091eca, #1e97f2)",
              }} />
            )}
            <div style={{ fontSize: "28px", marginBottom: "16px", color: "#1e97f2" }}>{r.icon}</div>
            <div style={{ fontFamily: "'Marcellus', serif", fontSize: "26px", color: "#c4c7f2", fontWeight: 400, marginBottom: "4px" }}>
              {r.title}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(196,199,242,0.4)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "16px" }}>
              {r.subtitle}
            </div>
            <p style={{ fontSize: "13px", color: "rgba(196,199,242,0.5)", lineHeight: 1.7, marginBottom: "24px" }}>
              {r.desc}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {r.stats.map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "4px", height: "4px", background: "#1e97f2", borderRadius: "50%" }} />
                  <span style={{ fontSize: "11px", color: "rgba(196,199,242,0.35)", fontWeight: 600, letterSpacing: "0.06em" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FounderForm({ onSubmit, onBack }: { onSubmit: (form: any) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", company: "", website: "",
    tagline: "", description: "",
    stage: "", raise: "", sectors: [] as string[], regions: [] as string[],
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k: string, v: string) => setForm(f => ({
    ...f, [k]: (f[k as keyof typeof f] as string[]).includes(v) ? (f[k as keyof typeof f] as string[]).filter(x => x !== v) : [...(f[k as keyof typeof f] as string[]), v],
  }));

  const steps = [
    {
      title: "Your startup",
      subtitle: "Tell us the basics",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Input label="Your name" placeholder="Arjun Sharma" value={form.name} onChange={(v: string) => set("name", v)} />
            <Input label="Email" placeholder="arjun@startup.com" value={form.email} onChange={(v: string) => set("email", v)} type="email" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Input label="Company name" placeholder="Acme Inc." value={form.company} onChange={(v: string) => set("company", v)} />
            <Input label="Website" placeholder="https://acme.com" value={form.website} onChange={(v: string) => set("website", v)} />
          </div>
          <Input label="One-line tagline" placeholder="The Stripe for B2B payments in India" value={form.tagline} onChange={(v: string) => set("tagline", v)} />
          <TextArea label="What are you building?" placeholder="Describe your product, problem you solve, and early traction..." value={form.description} onChange={(v: string) => set("description", v)} />
        </div>
      ),
    },
    {
      title: "Fundraise details",
      subtitle: "Help us find the right investors",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
              Current stage
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {STAGES_FOUNDER.map(s => (
                <Tag key={s} label={s} selected={form.stage === s} onClick={() => set("stage", s)} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
              Target raise
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {TICKET_SIZES.map(s => (
                <Tag key={s} label={s} selected={form.raise === s} onClick={() => set("raise", s)} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
              Sectors <span style={{ color: "rgba(196,199,242,0.2)" }}>— pick all that apply</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {SECTORS.map(s => (
                <Tag key={s} label={s} selected={form.sectors.includes(s)} onClick={() => toggleArr("sectors", s)} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: "680px", width: "100%", margin: "0 auto", padding: "100px 40px 80px" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "rgba(196,199,242,0.35)", cursor: "pointer",
        fontSize: "13px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
        letterSpacing: "0.06em", marginBottom: "48px", padding: 0, display: "flex", alignItems: "center", gap: "6px",
      }}>
        ← Back
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#1e97f2", letterSpacing: "0.2em", fontWeight: 600, marginBottom: "12px" }}>
            STEP {step + 2} OF 3
          </div>
          <h2 style={{ fontFamily: "'Marcellus', serif", fontSize: "36px", color: "#c4c7f2", fontWeight: 400, marginBottom: "4px" }}>
            {steps[step].title}
          </h2>
          <p style={{ color: "rgba(196,199,242,0.4)", fontSize: "14px" }}>{steps[step].subtitle}</p>
        </div>
        <StepDots total={2} current={step} />
      </div>

      <div style={{ marginBottom: "40px" }}>{steps[step].content}</div>

      <div style={{ display: "flex", gap: "12px" }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            background: "transparent", border: "1px solid rgba(196,199,242,0.1)",
            color: "rgba(196,199,242,0.5)", padding: "13px 28px", borderRadius: "8px",
            fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Syne', sans-serif",
            letterSpacing: "0.04em", transition: "all 0.2s",
          }}>
            Previous
          </button>
        )}
        <button
          onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onSubmit(form)}
          style={{
            background: "#091eca", color: "#c4c7f2", border: "none",
            padding: "13px 32px", borderRadius: "8px", fontSize: "14px",
            fontWeight: 600, cursor: "pointer", fontFamily: "'Syne', sans-serif",
            letterSpacing: "0.04em", transition: "all 0.2s", flex: 1,
          }}
          onMouseEnter={e => (e.target as HTMLButtonElement).style.background = "#1e97f2"}
          onMouseLeave={e => (e.target as HTMLButtonElement).style.background = "#091eca"}
        >
          {step < steps.length - 1 ? "Continue →" : "Find my investors →"}
        </button>
      </div>
    </div>
  );
}

function InvestorForm({ onSubmit, onBack }: { onSubmit: (form: any) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", firm: "", website: "",
    thesis: "",
    stages: [] as string[], sectors: [] as string[], tickets: [] as string[], regions: [] as string[],
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k: string, v: string) => setForm(f => ({
    ...f, [k]: (f[k as keyof typeof f] as string[]).includes(v) ? (f[k as keyof typeof f] as string[]).filter(x => x !== v) : [...(f[k as keyof typeof f] as string[]), v],
  }));

  const steps = [
    {
      title: "Your firm",
      subtitle: "Tell us who you are",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Input label="Your name" placeholder="Priya Mehta" value={form.name} onChange={(v: string) => set("name", v)} />
            <Input label="Email" placeholder="priya@ventures.com" value={form.email} onChange={(v: string) => set("email", v)} type="email" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Input label="Firm / Fund name" placeholder="Nexus Ventures" value={form.firm} onChange={(v: string) => set("firm", v)} />
            <Input label="Website" placeholder="https://nexus.vc" value={form.website} onChange={(v: string) => set("website", v)} />
          </div>
          <TextArea label="Investment thesis" placeholder="Describe what you invest in, your differentiation, and what you bring beyond capital..." value={form.thesis} onChange={(v: string) => set("thesis", v)} />
        </div>
      ),
    },
    {
      title: "Investment criteria",
      subtitle: "We use this to surface your best matches",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
              Stages you invest in
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {STAGES_INVESTOR.map(s => (
                <Tag key={s} label={s} selected={form.stages.includes(s)} onClick={() => toggleArr("stages", s)} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
              Ticket size
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {TICKET_SIZES.map(s => (
                <Tag key={s} label={s} selected={form.tickets.includes(s)} onClick={() => toggleArr("tickets", s)} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
              Sectors <span style={{ color: "rgba(196,199,242,0.2)" }}>— pick all that apply</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {SECTORS.map(s => (
                <Tag key={s} label={s} selected={form.sectors.includes(s)} onClick={() => toggleArr("sectors", s)} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "rgba(196,199,242,0.4)", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
              Geographies
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {REGIONS.map(s => (
                <Tag key={s} label={s} selected={form.regions.includes(s)} onClick={() => toggleArr("regions", s)} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: "680px", width: "100%", margin: "0 auto", padding: "100px 40px 80px" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "rgba(196,199,242,0.35)", cursor: "pointer",
        fontSize: "13px", fontFamily: "'Syne', sans-serif", fontWeight: 600,
        letterSpacing: "0.06em", marginBottom: "48px", padding: 0, display: "flex", alignItems: "center", gap: "6px",
      }}>
        ← Back
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          <div style={{ fontSize: "11px", color: "#1e97f2", letterSpacing: "0.2em", fontWeight: 600, marginBottom: "12px" }}>
            STEP {step + 2} OF 3
          </div>
          <h2 style={{ fontFamily: "'Marcellus', serif", fontSize: "36px", color: "#c4c7f2", fontWeight: 400, marginBottom: "4px" }}>
            {steps[step].title}
          </h2>
          <p style={{ color: "rgba(196,199,242,0.4)", fontSize: "14px" }}>{steps[step].subtitle}</p>
        </div>
        <StepDots total={2} current={step} />
      </div>

      <div style={{ marginBottom: "40px" }}>{steps[step].content}</div>

      <div style={{ display: "flex", gap: "12px" }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            background: "transparent", border: "1px solid rgba(196,199,242,0.1)",
            color: "rgba(196,199,242,0.5)", padding: "13px 28px", borderRadius: "8px",
            fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Syne', sans-serif",
            letterSpacing: "0.04em", transition: "all 0.2s",
          }}>
            Previous
          </button>
        )}
        <button
          onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onSubmit(form)}
          style={{
            background: "#091eca", color: "#c4c7f2", border: "none",
            padding: "13px 32px", borderRadius: "8px", fontSize: "14px",
            fontWeight: 600, cursor: "pointer", fontFamily: "'Syne', sans-serif",
            letterSpacing: "0.04em", transition: "all 0.2s", flex: 1,
          }}
          onMouseEnter={e => (e.target as HTMLButtonElement).style.background = "#1e97f2"}
          onMouseLeave={e => (e.target as HTMLButtonElement).style.background = "#091eca"}
        >
          {step < steps.length - 1 ? "Continue →" : "Find my startups →"}
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage({ onNavigate }: { onNavigate?: (screen: string, data?: any) => void }) {
  const [screen, setScreen] = useState("role");
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleRoleSelect = (r: string) => {
    setRole(r);
    setScreen("form");
  };

  const handleSubmit = async (form: any) => {
    setError("");
    try {
      if (role === "investor") {
        const investor = await api<Investor>("/investor/register", {
          method: "POST",
          body: JSON.stringify({
            partner_name: form.name,
            firm_name: form.firm,
            thesis: form.thesis,
            sectors: form.sectors.join(", ") || "any",
            stages: form.stages.join(", ") || "any",
          }),
        });
        onNavigate?.("dashboard", { role: "investor", ...form, investorId: investor.investor_id });
      } else {
        const startup = await api<Startup>("/startup/register", {
          method: "POST",
          body: JSON.stringify({
            company_name: form.company,
            one_liner: form.tagline,
            sector: form.sectors.join(", ") || "General",
            stage: form.stage || "Pre-seed",
            description: form.description,
            raise: form.raise,
          }),
        });
        onNavigate?.("discover", { role: "startup", ...form, startupId: startup.startup_id });
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save your profile.");
    }
  };

  return (
    <div style={{
      background: "#03030d",
      color: "#c4c7f2",
      fontFamily: "'Syne', sans-serif",
      minHeight: "100vh",
      position: "relative",
      overflowX: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Syne:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 60% 20%, rgba(9,65,202,0.08) 0%, transparent 60%)",
      }} />

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: "1px solid rgba(9,65,202,0.15)",
        background: "rgba(3,3,13,0.9)",
        backdropFilter: "blur(12px)",
        padding: "0 56px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: "64px",
      }}>
        <div
          onClick={() => onNavigate?.("landing")}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        >
          <img src="/src/assets/fi.png" alt="Fintech logo" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <span style={{ fontFamily: "'Marcellus', serif", fontSize: "18px", color: "#c4c7f2" }}>Fintech</span>
        </div>
        {screen === "form" && (
          <span style={{ fontSize: "12px", color: "rgba(196,199,242,0.3)", fontWeight: 600, letterSpacing: "0.1em" }}>
            {role === "founder" ? "FOUNDER ONBOARDING" : "INVESTOR ONBOARDING"}
          </span>
        )}
      </nav>

      <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh" }}>
        {screen === "role" && (
          <RoleSelect onSelect={handleRoleSelect} />
        )}
        {screen === "form" && role === "founder" && (
          <FounderForm onSubmit={handleSubmit} onBack={() => setScreen("role")} />
        )}
        {screen === "form" && role === "investor" && (
          <InvestorForm onSubmit={handleSubmit} onBack={() => setScreen("role")} />
        )}
      </div>
      {error && <div role="alert" style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#32131a", border: "1px solid #d86b7a", borderRadius: "8px", padding: "12px 16px", color: "#ffd6dc", zIndex: 200 }}>{error}</div>}
    </div>
  );
}
