import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def database_url() -> str:
    configured = os.getenv("DATABASE_URL", "sqlite:///./venturelink.db")
    if configured.startswith("postgres://"):
        return configured.replace("postgres://", "postgresql+psycopg://", 1)
    if configured.startswith("postgresql://"):
        return configured.replace("postgresql://", "postgresql+psycopg://", 1)
    return configured


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if database_url().startswith("sqlite") else {}
engine = create_engine(database_url(), connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    google_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    name: Mapped[str] = mapped_column(String(255))
    profile_picture: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class StartupProfile(Base):
    __tablename__ = "startup_profiles"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(255))
    one_liner: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    industry: Mapped[str] = mapped_column(String(255), default="General")
    stage: Mapped[str] = mapped_column(String(100), default="Pre-seed")
    location: Mapped[str] = mapped_column(String(255), default="")
    funding_required: Mapped[str] = mapped_column(String(100), default="")
    traction: Mapped[str] = mapped_column(Text, default="")
    website: Mapped[str] = mapped_column(String(500), default="")
    pitch_deck: Mapped[str] = mapped_column(Text, default="")
    sectors_json: Mapped[str] = mapped_column(Text, default="[]")


class InvestorProfile(Base):
    __tablename__ = "investor_profiles"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    name_firm: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    thesis: Mapped[str] = mapped_column(Text, default="")
    sectors_json: Mapped[str] = mapped_column(Text, default="[]")
    stages_json: Mapped[str] = mapped_column(Text, default="[]")
    ticket_size: Mapped[str] = mapped_column(String(100), default="")
    geography: Mapped[str] = mapped_column(String(255), default="")


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String(20))
    action: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


def init_db() -> None:
    Base.metadata.create_all(engine)


def json_loads(value: str | None) -> list[str]:
    try:
        parsed = json.loads(value or "[]")
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def json_dumps(value: list[str] | None) -> str:
    return json.dumps(value or [])


def profile_public(user: User, startup: StartupProfile | None = None, investor: InvestorProfile | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "profile_picture": user.profile_picture,
        "role": user.role,
    }
    if startup:
        result["startup"] = {
            "company_name": startup.company_name,
            "one_liner": startup.one_liner,
            "description": startup.description,
            "industry": startup.industry,
            "stage": startup.stage,
            "location": startup.location,
            "funding_required": startup.funding_required,
            "traction": startup.traction,
            "website": startup.website,
            "pitch_deck": startup.pitch_deck,
            "sectors": json_loads(startup.sectors_json),
        }
    if investor:
        result["investor"] = {
            "name_firm": investor.name_firm,
            "description": investor.description,
            "thesis": investor.thesis,
            "sectors": json_loads(investor.sectors_json),
            "stages": json_loads(investor.stages_json),
            "ticket_size": investor.ticket_size,
            "geography": investor.geography,
        }
    return result


init_db()
