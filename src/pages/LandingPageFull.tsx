import { Logo, DISCLAIMER } from "../components/Shell";

const LENSES = [
  { n: "01", t: "Opportunity Radar", d: "Find the signals you missed in filings, bulk deals and management commentary.", m: "Ranked signals · Source-linked", cta: "Explore Radar", href: "#/radar" },
  { n: "02", t: "Chart Pattern Intelligence", d: "See breakouts, reversals and divergences with context, not just a chart label.", m: "Patterns · Historical hit-rates", cta: "Explore Charts", href: "#/charts" },
  { n: "03", t: "Market Chat", d: "Ask a question. Get a portfolio-aware answer, with evidence and a risk plan.", m: "Signal + Scenario + Action", cta: "Start a conversation", href: "#/chat" },
  { n: "04", t: "AI Market Video Engine", d: "A 30–90 second recap of flows, IPOs and the sector moves that matter.", m: "Daily recap · Designed preview", cta: "Stretch / Coming soon", href: "#/video" },
];
const PIPE = [
  ["Ingestion", "Exchange filings, price data and institutional flows."],
  ["Signal engine", "Rank unusual changes. Filter out the everyday noise."],
  ["LLM explainer", "Translate the evidence. Surface uncertainty and risks."],
  ["UI delivery", "A radar, a chart, a conversation. You make the call."],
];
const STRIP = ["One connected view", "NSE + BSE", "Filings + flows", "Price + context", "Plain English"];

export default function Landing() {
  return (
    <>
      <header className="wrap top">
        <Logo />
        <a className="btn btn-primary" href="#/radar">Explore demo ↗</a>
      </header>

      <section className="wrap hero">
        <div>
          <span className="eyebrow dot">Built for NSE / BSE · Designed for you</span>
          <h1>See the signal.<br />Know the risk.</h1>
          <h2>AI for the Indian Investor</h2>
          <p className="lead">Filings, flows and charts. One intelligence layer that turns market noise into clear, plain-English next steps.</p>
          <div className="ctas">
            <a className="btn btn-primary" href="#/radar">Open Opportunity Radar ↗</a>
            <a className="btn" href="#how">See how it works ▷</a>
          </div>
          <span className="mono">No black box calls. Sources, context, and caveats.</span>
        </div>

        <div>
          <div className="preview">
            <div className="pv-head"><h3>Your market, decoded.</h3><span className="pill">Sample</span></div>
            <div className="idx">
              <div><span className="mono">Nifty 50</span><div className="num">25,482.50</div><span className="gain mono">+0.64%</span></div>
              <div><span className="mono">Sensex</span><div className="num">83,214.80</div><span className="gain mono">+0.58%</span></div>
            </div>
            <svg className="spark" viewBox="0 0 420 90" preserveAspectRatio="none" role="img" aria-label="Sample index trend, rising">
              <line x1="0" y1="30" x2="420" y2="30" stroke="#283520" /><line x1="0" y1="62" x2="420" y2="62" stroke="#283520" />
              <polyline fill="none" stroke="#D0F76A" strokeWidth="2" strokeLinejoin="round" points="0,76 40,72 70,78 100,56 140,60 180,42 220,48 260,32 300,38 340,22 380,28 420,12" />
            </svg>
            <div className="signal">
              <div><span className="mono">Top signal / Opportunity Radar</span><strong>Larsen &amp; Toubro</strong><span className="mono">LT · NSE · Filings</span></div>
              <span className="pct">88%</span>
            </div>
            <p className="note">Order inflows strengthen. Check execution risk before adding exposure.</p>
          </div>
          <span className="chip">Evidence first. Every signal has a source.</span>
        </div>
      </section>

      <div className="strip"><div className="wrap">{STRIP.map((s) => <span key={s} className="mono">{s}</span>)}</div></div>

      <section className="section wrap">
        <span className="eyebrow">Case #6 fit</span>
        <div className="sec-head">
          <h2>Four lenses. One clearer market.</h2>
          <p>From a buried disclosure to a decision you can explain. Built around the retail investor.</p>
        </div>
        <div className="grid4">
          {LENSES.map((l) => (
            <a key={l.n} href={l.href} className="card lens">
              <div className="lens-top"><span className="gain mono" style={{ color: "var(--accent)" }}>{l.n}</span><span className="mono">fintech-et</span></div>
              <h3>{l.t}</h3>
              <p>{l.d}</p>
              <span className="mono">{l.m}</span>
              <span className="go">{l.cta} ↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="section alt" id="how">
        <div className="wrap">
          <span className="eyebrow">The intelligence pipeline</span>
          <div className="sec-head"><h2>From disclosure to understanding.</h2></div>
          <div className="pipe">
            {PIPE.map(([t, d], i) => (
              <div key={t}><span className="mono" style={{ color: "var(--accent)" }}>0{i + 1}</span><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap cta">
        <div>
          <h2>Better informed. Still your decision.</h2>
          <p className="muted" style={{ fontSize: 13 }}>Explore the illustrative workspace. No predictions dressed up as certainty.</p>
        </div>
        <a className="btn btn-primary" href="#/radar">Explore the sample workspace ↗</a>
      </section>

      <footer className="wrap foot">
        <Logo />
        <p>Research support, not investment advice. {DISCLAIMER} fintech-et does not guarantee returns.</p>
      </footer>
    </>
  );
}
