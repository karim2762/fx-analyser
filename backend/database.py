import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/forex_ai")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    telegram_chat_id = Column(String, nullable=True)
    discord_webhook_url = Column(String, nullable=True)

class EconomicEvent(Base):
    __tablename__ = "economic_events"
    id = Column(Integer, primary_key=True, index=True)
    event_name = Column(String, index=True, nullable=False)
    currency = Column(String, index=True, nullable=False)
    impact = Column(String, nullable=False) # HIGH, MEDIUM, LOW
    actual = Column(Float, nullable=True)
    forecast = Column(Float, nullable=True)
    previous = Column(Float, nullable=True)
    surprise_score = Column(Float, nullable=True)
    sentiment = Column(String, nullable=True) # BULLISH, BEARISH, NEUTRAL
    ai_explanation = Column(Text, nullable=True)
    release_time = Column(DateTime, default=datetime.utcnow)
    
    signals = relationship("TradingSignal", back_populates="event")
    impacts = relationship("MarketImpact", back_populates="event")

class MarketImpact(Base):
    __tablename__ = "market_impacts"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("economic_events.id"))
    asset = Column(String, index=True) # EURUSD, XAUUSD, etc.
    direction = Column(String) # BUY, SELL, NEUTRAL
    confidence = Column(Float) # 0 to 100
    volatility = Column(String) # HIGH, MEDIUM, LOW
    reason = Column(Text)

    event = relationship("EconomicEvent", back_populates="impacts")

class TradingSignal(Base):
    __tablename__ = "trading_signals"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("economic_events.id"))
    asset = Column(String, index=True)
    action = Column(String) # BUY, SELL, WAIT
    entry_zone = Column(String)
    take_profit = Column(String)
    stop_loss = Column(String)
    risk_rating = Column(String) # HIGH, MEDIUM, LOW
    timestamp = Column(DateTime, default=datetime.utcnow)

    event = relationship("EconomicEvent", back_populates="signals")

class SpeechAnalysis(Base):
    __tablename__ = "speech_analysis"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String) # FOMC, ECB, BOE, BOJ
    title = Column(String)
    raw_text = Column(Text)
    classification = Column(String) # Strong Hawkish, Hawkish, Neutral, Dovish, Strong Dovish
    score = Column(Float) # -1.0 (Dovish) to +1.0 (Hawkish)
    timestamp = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
