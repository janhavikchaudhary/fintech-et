import type { ReactNode } from "react";

export const ROUTES = [
  { id: "radar", label: "Opportunity Radar", short: "Radar", kicker: "01 / Discover what you missed", sub: "Unusual signals. Clear evidence. A shortlist worth your attention." },
  { id: "charts", label: "Chart Intelligence", short: "Charts", kicker: "02 / Put price in context", sub: "Read the setup. Understand the odds. Define what would change your view." },
  { id: "chat", label: "Market Chat", short: "Chat", kicker: "03 / Ask a better question", sub: "A conversation with the evidence. Grounded in your portfolio, clear about uncertainty." },
  { id: "video", label: "Video Engine", short: "Video", kicker: "04 / Stretch track · Coming soon", sub: "The daily market story, distilled. A designed preview of what comes next." },
] as const;
export type RouteId = (typeof ROUTES)[number]["id"];

export function Logo() {
  return (
    <a className="logo" href="#/" aria-label="fintech-et home">
      <span className="logo-mark">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#090C0B" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-7 4 14 3-7h4" /></svg>
      </span>
      fintech-et
    </a>
  );
}

export const DISCLAIMER =
  "All prices, signals and sources are illustrative sample data. AI can be wrong. Confidence is signal quality, not a guarantee of returns. Verify primary sources and consider your risk tolerance before acting.";

export function AppShell({ active, children }: { active: RouteId; children: ReactNode }) {
  const links = ROUTES.map((r) => (
    <a key={r.id} href={`#/${r.id}`} className={r.id === active ? "on" : ""} aria-current={r.id === active ? "page" : undefined}>
      {r.label}
    </a>
  ));
  return (
    <>
      <header className="wrap top">
        <Logo />
        <nav className="navlinks" aria-label="Workspace">{links}</nav>
        <span className="pill">NSE / BSE</span>
      </header>
      <nav className="tabs" aria-label="Workspace">
        {ROUTES.map((r) => (
          <a key={r.id} href={`#/${r.id}`} className={r.id === active ? "on" : ""}>{r.short}</a>
        ))}
      </nav>
      <div className="banner">
        <div className="wrap">
          <span>Illustrative workspace · not live data</span>
          <span>24 Feb 2026 · 15:30 IST</span>
        </div>
      </div>
      <main className="wrap page">{children}</main>
      <footer className="wrap foot">
        <p className="mono" style={{ marginBottom: 6 }}>Research support, not investment advice.</p>
        <p>{DISCLAIMER}</p>
      </footer>
    </>
  );
}
