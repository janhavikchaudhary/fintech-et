from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, Field
from groq import Groq
from dotenv import load_dotenv
import httpx
import PyPDF2
import io
import os
import json
import secrets
from urllib.parse import urlencode
import uuid

load_dotenv()

try:
    from .database import (
        Connection,
        InvestorProfile,
        SessionLocal,
        StartupProfile,
        User,
        json_dumps,
        json_loads,
        profile_public,
        utcnow,
    )
except ImportError:
    from database import (
        Connection,
        InvestorProfile,
        SessionLocal,
        StartupProfile,
        User,
        json_dumps,
        json_loads,
        profile_public,
        utcnow,
    )

app = FastAPI(title="VentureLink Prototype")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET") or secrets.token_urlsafe(32),
    https_only=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
    same_site="lax",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None

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


# ── Helper: call Groq ──
def ask_groq(system: str, user: str) -> str:
    if client is None:
        raise HTTPException(503, "GROQ_API_KEY is required for this AI-powered action")
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
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
    """Upload a pitch deck PDF and extract a structured profile using Groq."""
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

    raw = ask_groq(system, raw_text[:8000])

    try:
        # Strip markdown fences if the model adds them.
        cleaned = raw.strip().strip("```json").strip("```").strip()
        profile = json.loads(cleaned)
    except Exception:
        raise HTTPException(422, f"Groq returned invalid JSON: {raw[:200]}")

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


class StartupProfileRequest(BaseModel):
    company_name: str
    one_liner: str = ""
    description: str = ""
    industry: str = "General"
    stage: str = "Pre-seed"
    location: str = ""
    funding_required: str = ""
    traction: str = ""
    website: str = ""
    sectors: list[str] = []


class InvestorProfileRequest(BaseModel):
    name_firm: str
    description: str = ""
    thesis: str = ""
    sectors: list[str] = []
    stages: list[str] = []
    ticket_size: str = ""
    geography: str = ""


class ConnectionRequest(BaseModel):
    target_id: str
    target_type: str
    action: str = "connect"


class AiChatRequest(BaseModel):
    question: str


def get_authenticated_user(request: Request, db):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(401, "Google sign-in is required")
    user = db.get(User, user_id)
    if not user:
        request.session.clear()
        raise HTTPException(401, "Your session has expired")
    return user


def profile_for_user(db, user: User) -> dict:
    return profile_public(
        user,
        db.get(StartupProfile, user.id),
        db.get(InvestorProfile, user.id),
    )


def score_profiles(startup: StartupProfile, investor: InvestorProfile) -> tuple[int, list[str], list[str]]:
    startup_sectors = {item.lower() for item in json_loads(startup.sectors_json)}
    if startup.industry:
        startup_sectors.add(startup.industry.lower())
    investor_sectors = {item.lower() for item in json_loads(investor.sectors_json)}
    investor_stages = {item.lower() for item in json_loads(investor.stages_json)}
    strong: list[str] = []
    mismatch: list[str] = []
    points = 0

    if not investor_sectors or "any" in investor_sectors or startup_sectors & investor_sectors:
        points += 35
        strong.append(f"{startup.industry} sector")
    else:
        mismatch.append(f"Investor sectors: {', '.join(json_loads(investor.sectors_json)) or 'not specified'}")

    if not investor_stages or "any" in investor_stages or startup.stage.lower() in investor_stages:
        points += 25
        strong.append(f"{startup.stage} stage")
    else:
        mismatch.append(f"Investor prefers {', '.join(json_loads(investor.stages_json))}")

    if investor.geography and startup.location and investor.geography.lower() in startup.location.lower():
        points += 20
        strong.append(startup.location)
    elif not investor.geography or not startup.location or "global" in investor.geography.lower():
        points += 15
    else:
        mismatch.append(f"Geography: {investor.geography} vs {startup.location}")

    if startup.funding_required and investor.ticket_size:
        points += 20
        strong.append(f"Funding range {startup.funding_required}")
    else:
        points += 10

    return min(points, 99), strong, mismatch


@app.get("/auth/me")
def auth_me(request: Request):
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        return profile_for_user(db, user)


@app.get("/auth/google")
def auth_google(request: Request, role: str = ""):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/api/auth/google/callback")
    if not client_id:
        raise HTTPException(503, "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    if role in {"startup", "investor"}:
        request.session["requested_role"] = role
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    params = urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    })
    from fastapi.responses import RedirectResponse
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@app.get("/auth/google/callback")
async def auth_google_callback(request: Request):
    from fastapi.responses import RedirectResponse

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    if request.query_params.get("state") != request.session.pop("oauth_state", None):
        raise HTTPException(400, "Invalid Google OAuth state")
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(400, "Google OAuth did not return an authorization code")

    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", f"{frontend_url}/api/auth/google/callback")
    async with httpx.AsyncClient(timeout=15) as http:
        token_response = await http.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        if token_response.is_error:
            raise HTTPException(502, "Google token exchange failed")
        token = token_response.json()
        user_response = await http.get("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {token['access_token']}"})
        if user_response.is_error:
            raise HTTPException(502, "Google profile lookup failed")
        google_user = user_response.json()

    with SessionLocal() as db:
        user = db.query(User).filter(User.google_id == google_user["sub"]).first()
        if not user:
            user = User(
                google_id=google_user["sub"],
                email=google_user.get("email", ""),
                name=google_user.get("name") or google_user.get("email", "VentureLink user"),
                profile_picture=google_user.get("picture"),
            )
            db.add(user)
        else:
            user.email = google_user.get("email", user.email)
            user.name = google_user.get("name") or user.name
            user.profile_picture = google_user.get("picture") or user.profile_picture
        if not user.role:
            requested_role = request.session.pop("requested_role", None)
            if requested_role in {"startup", "investor"}:
                user.role = requested_role
        user.last_login = utcnow()
        db.commit()
        request.session["user_id"] = user.id

    return RedirectResponse(f"{frontend_url}/")


@app.post("/auth/logout")
def auth_logout(request: Request):
    request.session.clear()
    return {"ok": True}


@app.get("/profiles/me")
def get_my_profile(request: Request):
    with SessionLocal() as db:
        return profile_for_user(db, get_authenticated_user(request, db))


@app.put("/profiles/startup")
def save_startup_profile(body: StartupProfileRequest, request: Request):
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        user.role = "startup"
        profile = db.get(StartupProfile, user.id) or StartupProfile(user_id=user.id, company_name=body.company_name)
        for field in ("company_name", "one_liner", "description", "industry", "stage", "location", "funding_required", "traction", "website"):
            setattr(profile, field, getattr(body, field))
        profile.sectors_json = json_dumps(body.sectors)
        db.add(profile)
        db.commit()
        return profile_for_user(db, user)


@app.put("/profiles/investor")
def save_investor_profile(body: InvestorProfileRequest, request: Request):
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        user.role = "investor"
        profile = db.get(InvestorProfile, user.id) or InvestorProfile(user_id=user.id, name_firm=body.name_firm)
        for field in ("name_firm", "description", "thesis", "ticket_size", "geography"):
            setattr(profile, field, getattr(body, field))
        profile.sectors_json = json_dumps(body.sectors)
        profile.stages_json = json_dumps(body.stages)
        db.add(profile)
        db.commit()
        return profile_for_user(db, user)


@app.get("/discover")
def discover(request: Request, limit: int = 20):
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        results = []
        if user.role == "startup":
            source = db.get(StartupProfile, user.id)
            if not source:
                return {"items": [], "message": "Complete your startup profile first."}
            seen = {item.target_id for item in db.query(Connection).filter(Connection.user_id == user.id).all()}
            for target in db.query(User).filter(User.role == "investor", User.id != user.id).limit(limit).all():
                if target.id in seen:
                    continue
                investor = db.get(InvestorProfile, target.id)
                if not investor:
                    continue
                score, strong, mismatch = score_profiles(source, investor)
                results.append({"user_id": target.id, "role": "investor", "name": target.name, "profile_picture": target.profile_picture, "profile": profile_public(target, investor=investor)["investor"], "match": {"percentage": score, "strong_alignment": strong, "potential_mismatch": mismatch}})
        else:
            source = db.get(InvestorProfile, user.id)
            if not source:
                return {"items": [], "message": "Complete your investor profile first."}
            seen = {item.target_id for item in db.query(Connection).filter(Connection.user_id == user.id).all()}
            for target in db.query(User).filter(User.role == "startup", User.id != user.id).limit(limit).all():
                if target.id in seen:
                    continue
                startup = db.get(StartupProfile, target.id)
                if not startup:
                    continue
                score, strong, mismatch = score_profiles(startup, source)
                results.append({"user_id": target.id, "role": "startup", "name": target.name, "profile_picture": target.profile_picture, "profile": profile_public(target, startup=startup)["startup"], "match": {"percentage": score, "strong_alignment": strong, "potential_mismatch": mismatch}})
        results.sort(key=lambda item: item["match"]["percentage"], reverse=True)
        return {"items": results}


@app.post("/connections")
def create_connection(body: ConnectionRequest, request: Request):
    if body.action not in {"pass", "interested", "connect"} or body.target_type not in {"startup", "investor"}:
        raise HTTPException(422, "Unsupported connection action or target type")
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        target = db.get(User, body.target_id)
        if not target or target.id == user.id or target.role != body.target_type:
            raise HTTPException(404, "Target profile not found")
        existing = db.query(Connection).filter(Connection.user_id == user.id, Connection.target_id == target.id).first()
        if existing:
            existing.action = body.action
        else:
            existing = Connection(user_id=user.id, target_id=target.id, target_type=body.target_type, action=body.action)
            db.add(existing)
        db.commit()
        return {"id": existing.id, "action": existing.action, "target_id": target.id}


@app.get("/connections")
def list_connections(request: Request):
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        outgoing = db.query(Connection).filter(Connection.user_id == user.id, Connection.action.in_(["connect", "interested", "accepted"])).all()
        incoming = db.query(Connection).filter(Connection.target_id == user.id, Connection.action.in_(["connect", "interested", "accepted"])).all()
        items = []
        for connection in outgoing + incoming:
            other_id = connection.target_id if connection.user_id == user.id else connection.user_id
            other = db.get(User, other_id)
            if other:
                items.append({"id": connection.id, "user_id": other.id, "name": other.name, "role": other.role, "action": connection.action, "incoming": connection.target_id == user.id})
        return {"connections": items}


@app.post("/connections/{connection_id}/accept")
def accept_connection(connection_id: str, request: Request):
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        connection = db.get(Connection, connection_id)
        if not connection or connection.target_id != user.id:
            raise HTTPException(404, "Connection request not found")
        connection.action = "accepted"
        db.commit()
        return {"id": connection.id, "action": connection.action}


@app.post("/ai/chat")
def ai_chat(body: AiChatRequest, request: Request):
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        context = profile_for_user(db, user)
        if user.role == "startup":
            records = discover(request, limit=10)["items"]
        else:
            records = discover(request, limit=10)["items"]
        if client is None:
            return {"answer": "Groq is not configured. Add GROQ_API_KEY to ask the AI assistant.", "sources": records}
        prompt = json.dumps({"user": context, "discoverable_profiles": records}, default=str)
        answer = ask_groq(
            "You are VentureLink's deal-flow assistant. Answer only from the supplied database context. If a fact is missing, say it is unavailable. Be concise and actionable.",
            f"Question: {body.question}\nDatabase context:\n{prompt[:18000]}",
        )
        return {"answer": answer, "sources": [{"user_id": item["user_id"], "name": item["name"]} for item in records]}


@app.post("/ai/intro/{target_id}")
def ai_intro(target_id: str, request: Request):
    with SessionLocal() as db:
        user = get_authenticated_user(request, db)
        target = db.get(User, target_id)
        if not target or target.id == user.id:
            raise HTTPException(404, "Profile not found")
        own = profile_for_user(db, user)
        other = profile_for_user(db, target)
        if client is None:
            return {"message": "Groq is not configured. Add GROQ_API_KEY to generate an introduction."}
        message = ask_groq(
            "Write a short, warm VentureLink introduction based only on the two supplied profiles and their stated match data. Do not invent facts.",
            f"MY PROFILE:\n{json.dumps(own)}\nTARGET PROFILE:\n{json.dumps(other)}",
        )
        return {"message": message}


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

    email = ask_groq(system, user)
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
