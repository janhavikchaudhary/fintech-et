from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv
import PyPDF2
import io
import os
import json
import uuid

load_dotenv()

app = FastAPI(title="VentureLink Prototype")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

# ── In-memory storage (resets on restart, fine for prototype) ──
startups = {}    # startup_id → dict
investors = {}   # investor_id → dict


# ── Helper: extract PDF text ──
def extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


# ── Helper: call GPT ──
def ask_gpt(system: str, user: str) -> str:
    if client is None:
        raise HTTPException(503, "OPENAI_API_KEY is required for this AI-powered action")
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


# ═══════════════════════════════════════════
# STARTUP ENDPOINTS
# ═══════════════════════════════════════════

@app.post("/startup/upload-deck")
async def upload_deck(file: UploadFile = File(...)):
    """Upload a pitch deck PDF — extracts structured profile using GPT."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")

    pdf_bytes = await file.read()
    raw_text = extract_pdf_text(pdf_bytes)

    if not raw_text.strip():
        raise HTTPException(422, "Could not extract text from PDF")

    system = """You are a startup analyst. Read this pitch deck and return ONLY a JSON object with these fields:
{
  "company_name": "string",
  "one_liner": "string",
  "sector": "string (e.g. FinTech, HealthTech, SaaS, ClimaTech)",
  "stage": "string (pre_seed / seed / series_a / series_b)",
  "ask_usd": number or null,
  "mrr_usd": number or null,
  "description": "2-3 sentence summary"
}
Return ONLY the JSON. No markdown, no explanation."""

    raw = ask_gpt(system, raw_text[:8000])

    try:
        # strip markdown fences if GPT adds them
        cleaned = raw.strip().strip("```json").strip("```").strip()
        profile = json.loads(cleaned)
    except Exception:
        raise HTTPException(422, f"GPT returned invalid JSON: {raw[:200]}")

    startup_id = str(uuid.uuid4())
    profile["id"] = startup_id
    startups[startup_id] = profile

    return {"startup_id": startup_id, **profile}


@app.get("/startup/{startup_id}")
def get_startup(startup_id: str):
    s = startups.get(startup_id)
    if not s:
        raise HTTPException(404, "Startup not found")
    return s


@app.get("/startup/{startup_id}/matches")
def get_matches(startup_id: str):
    """Score this startup against all registered investors."""
    startup = startups.get(startup_id)
    if not startup:
        raise HTTPException(404, "Startup not found")

    if not investors:
        return {"startup_id": startup_id, "matches": [], "message": "No investors registered yet"}

    results = []
    for inv_id, investor in investors.items():
        system = """You are a venture capital matching engine. Given a startup and an investor thesis,
return ONLY a JSON object:
{
  "score": 0.0 to 1.0,
  "reasoning": "2-3 sentence explanation"
}
Score rubric:
1.0 = perfect fit (sector, stage, and size all match)
0.7 = good fit (2 of 3 match)
0.5 = partial fit
0.3 = weak fit
0.0 = no fit
Return ONLY the JSON."""

        user = f"""STARTUP:
Name: {startup.get('company_name')}
Sector: {startup.get('sector')}
Stage: {startup.get('stage')}
Ask: ${startup.get('ask_usd') or 'unknown'}
Description: {startup.get('description')}

INVESTOR THESIS:
Name: {investor.get('partner_name')}
Firm: {investor.get('firm_name', '')}
Thesis: {investor.get('thesis')}
Preferred sectors: {investor.get('sectors', 'any')}
Preferred stages: {investor.get('stages', 'any')}"""

        score, reasoning = score_match(startup, investor)
        results.append({
            "investor_id": inv_id,
            "investor_name": investor.get("partner_name"),
            "firm": investor.get("firm_name", ""),
            "score": score,
            "reasoning": reasoning,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"startup_id": startup_id, "matches": results}


# ═══════════════════════════════════════════
# INVESTOR ENDPOINTS
# ═══════════════════════════════════════════

class InvestorRequest(BaseModel):
    partner_name: str
    firm_name: str = ""
    thesis: str
    sectors: str = "any"
    stages: str = "any"


class StartupRequest(BaseModel):
    company_name: str
    one_liner: str = ""
    sector: str = "General"
    stage: str = "Pre-seed"
    description: str = ""
    raise_: str = Field(default="", alias="raise")


def score_match(startup: dict, investor: dict) -> tuple[float, str]:
    """Provide fast, deterministic matching when no model call is necessary."""
    sectors = investor.get("sectors", "").lower()
    stages = investor.get("stages", "").lower()
    startup_sector = startup.get("sector", "").lower()
    startup_stage = startup.get("stage", "").lower()
    sector_match = sectors == "any" or any(item.strip() in startup_sector for item in sectors.split(","))
    stage_match = stages == "any" or startup_stage in stages
    score = 0.45 + (0.3 if sector_match else 0) + (0.2 if stage_match else 0)
    score = min(score, 0.98)
    reason = (
        f"{investor.get('partner_name')} has a {('strong' if sector_match else 'partial')} sector fit "
        f"with {startup.get('company_name')}. "
        f"The {startup.get('stage', 'current')} stage is {('within' if stage_match else 'outside')} their stated focus."
    )
    return score, reason

class MarketChatRequest(BaseModel):
    question: str
    portfolio: list[str] | None = None


@app.post("/investor/register")
def register_investor(body: InvestorRequest):
    """Register an investor with their thesis."""
    investor_id = str(uuid.uuid4())
    investor = {
        "id": investor_id,
        "partner_name": body.partner_name,
        "firm_name": body.firm_name,
        "thesis": body.thesis,
        "sectors": body.sectors,
        "stages": body.stages,
    }
    investors[investor_id] = investor
    return {"investor_id": investor_id, **investor}


@app.post("/startup/register")
def register_startup(body: StartupRequest):
    """Create a startup profile from the frontend onboarding form."""
    startup_id = str(uuid.uuid4())
    startup = {
        "id": startup_id,
        "company_name": body.company_name,
        "one_liner": body.one_liner,
        "sector": body.sector,
        "stage": body.stage,
        "description": body.description,
        "ask_usd": None,
    }
    startups[startup_id] = startup
    return {"startup_id": startup_id, **startup}


@app.get("/investor/{investor_id}")
def get_investor(investor_id: str):
    inv = investors.get(investor_id)
    if not inv:
        raise HTTPException(404, "Investor not found")
    return inv


@app.get("/investor/{investor_id}/dealflow")
def get_dealflow(investor_id: str):
    """Return all startups ranked for this investor."""
    investor = investors.get(investor_id)
    if not investor:
        raise HTTPException(404, "Investor not found")

    if not startups:
        return {"investor_id": investor_id, "deals": [], "message": "No startups uploaded yet"}

    results = []
    for s_id, startup in startups.items():
        system = """You are a VC deal flow assistant. Return ONLY a JSON object:
{
  "score": 0.0 to 1.0,
  "summary": "one line: [Stage] [Sector] company — key hook",
  "reasoning": "2-3 sentences"
}
Return ONLY the JSON."""

        user = f"""INVESTOR:
{investor.get('partner_name')} at {investor.get('firm_name')}
Thesis: {investor.get('thesis')}
Sectors: {investor.get('sectors')}
Stages: {investor.get('stages')}

STARTUP:
{startup.get('company_name')} — {startup.get('sector')} — {startup.get('stage')}
{startup.get('description')}
Ask: ${startup.get('ask_usd') or 'unknown'}
MRR: ${startup.get('mrr_usd') or 'pre-revenue'}"""

        score, reasoning = score_match(startup, investor)
        results.append({
            "startup_id": s_id,
            "company_name": startup.get("company_name"),
            "sector": startup.get("sector"),
            "stage": startup.get("stage"),
            "score": score,
            "summary": f"{startup.get('stage', 'Early-stage')} {startup.get('sector', 'startup')} company — {startup.get('one_liner') or 'matched to your thesis'}",
            "reasoning": reasoning,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"investor_id": investor_id, "deals": results}


# ═══════════════════════════════════════════
# MATCHING & INTRO
# ═══════════════════════════════════════════

@app.get("/intro/{startup_id}/{investor_id}")
def get_intro(startup_id: str, investor_id: str):
    """Draft a warm intro email between a startup and investor."""
    startup = startups.get(startup_id)
    investor = investors.get(investor_id)

    if not startup:
        raise HTTPException(404, "Startup not found")
    if not investor:
        raise HTTPException(404, "Investor not found")

    system = "You are a warm intro writer for a VC platform. Write a professional, concise intro email."
    user = f"""Write a warm intro email between:

STARTUP: {startup.get('company_name')}
{startup.get('description')}
Sector: {startup.get('sector')}, Stage: {startup.get('stage')}, Ask: ${startup.get('ask_usd') or 'TBD'}

INVESTOR: {investor.get('partner_name')} at {investor.get('firm_name')}
Thesis: {investor.get('thesis')}

Keep it under 150 words. Include subject line."""

    email = ask_gpt(system, user)
    return {"startup_id": startup_id, "investor_id": investor_id, "intro_email": email}


# ═══════════════════════════════════════════
# UTILITY
# ═══════════════════════════════════════════

@app.get("/health")
def health():
    return {
        "status": "ok",
        "startups_count": len(startups),
        "investors_count": len(investors),
    }

@app.get("/all")
def get_all():
    """See everything in memory — useful for debugging."""
    return {"startups": startups, "investors": investors}


# ═══════════════════════════════════════════
# CASE 6: AI FOR THE INDIAN INVESTOR
# ═══════════════════════════════════════════

@app.get("/india-investor/opportunity-radar")
def get_opportunity_radar():
    """
    Signal-first feed inspired by the competition case:
    scan filings/flows/events and surface actionable opportunities.
    """
    return {
        "as_of": "2026-03-29",
        "signals": [
            {
                "id": "sig-001",
                "symbol": "HDFCBANK",
                "signal_type": "bulk_block_activity",
                "headline": "Large block deal absorbed with low post-trade volatility",
                "explanation": "Stable price action after heavy block volume can indicate institutional confidence.",
                "confidence": 0.84,
            },
            {
                "id": "sig-002",
                "symbol": "TATAMOTORS",
                "signal_type": "management_commentary_shift",
                "headline": "Commentary tone shifted toward margin resilience in recent remarks",
                "explanation": "Positive margin language after cost pressure often precedes estimate revisions.",
                "confidence": 0.79,
            },
            {
                "id": "sig-003",
                "symbol": "INFY",
                "signal_type": "regulatory_and_sector_change",
                "headline": "Sector peers guide lower while company guidance remains intact",
                "explanation": "Relative guidance stability can become an alpha signal versus peers.",
                "confidence": 0.76,
            },
        ],
    }


@app.get("/india-investor/chart-patterns/{symbol}")
def get_chart_pattern_intelligence(symbol: str):
    """Prototype response for chart-pattern intelligence with plain-English explanation."""
    normalized = symbol.upper()
    return {
        "symbol": normalized,
        "detected_patterns": [
            {
                "name": "ascending_triangle",
                "timeframe": "daily",
                "status": "forming",
                "historical_win_rate": 0.62,
                "explanation": "Higher lows against flat resistance suggest gradual accumulation by buyers.",
            },
            {
                "name": "bullish_divergence_rsi",
                "timeframe": "4h",
                "status": "early_signal",
                "historical_win_rate": 0.58,
                "explanation": "Momentum improved while price remained range-bound, often preceding a directional move.",
            },
        ],
        "risk_note": "Pattern probabilities are statistical, not guarantees. Combine with risk management.",
    }


@app.post("/india-investor/market-chat")
def get_market_chat_response(body: MarketChatRequest):
    """
    Portfolio-aware response shape for a Market Chat assistant.
    Uses deterministic stub logic now; can be replaced by RAG + tool calls.
    """
    portfolio = body.portfolio or []
    answer = (
        f"Question received: {body.question}. "
        "Current prototype recommends checking trend + earnings + flow alignment before acting."
    )
    if portfolio:
        answer += f" Portfolio context considered: {', '.join(portfolio[:5])}."

    return {
        "answer": answer,
        "sources": [
            {"type": "exchange", "label": "NSE Bhavcopy (simulated)"},
            {"type": "filing", "label": "Corporate filing feed (simulated)"},
            {"type": "news", "label": "Market news stream (simulated)"},
        ],
        "follow_up": [
            "Do you want a bullish/bearish scenario tree?",
            "Should I rank top 3 opportunities by risk-adjusted confidence?",
        ],
    }
