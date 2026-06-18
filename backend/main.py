import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from database import init_db, get_db, User, EconomicEvent, MarketImpact, TradingSignal, SpeechAnalysis
from services import AIEngine, NotificationRouter

SECRET_KEY = "SUPER_SECRET_QUANT_TERMINAL_KEY_DO_NOT_LEAK"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="Forex Intelligence AI Core API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# --- Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

# --- Schemas ---
class TokenData(BaseModel):
    email: str
class UserAuth(BaseModel):
    email: str
    password: str
class SpeechSubmission(BaseModel):
    source: str
    title: str
    text: str
class ChatQuery(BaseModel):
    prompt: str

# --- Authentication Helpers ---
def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(days=1)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        if email is None: raise HTTPException(status_code=401)
        user = db.query(User).filter(User.email == email).first()
        if user is None: raise HTTPException(status_code=401)
        return user
    except JWTError:
        raise HTTPException(status_code=401)

# --- Routes ---
@app.post("/api/auth/register")
def register(auth: UserAuth, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == auth.email).first()
    if exists: raise HTTPException(status_code=400, detail="Email registered")
    user = User(email=auth.email, hashed_password=pwd_context.hash(auth.password))
    db.add(user)
    db.commit()
    return {"token": create_access_token({"email": user.email})}

@app.post("/api/auth/login")
def login(auth: UserAuth, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == auth.email).first()
    if not user or not pwd_context.verify(auth.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"token": create_access_token({"email": user.email})}

@app.get("/api/calendar")
def get_calendar(db: Session = Depends(get_db)):
    return db.query(EconomicEvent).order_by(EconomicEvent.release_time.desc()).limit(50).all()

@app.get("/api/signals")
def get_signals(db: Session = Depends(get_db)):
    return db.query(TradingSignal).order_by(TradingSignal.timestamp.desc()).limit(20).all()

@app.post("/api/speech-analysis")
def post_speech(payload: SpeechSubmission, db: Session = Depends(get_db)):
    nlp = AIEngine.analyze_speech_nlp(payload.text)
    speech = SpeechAnalysis(
        source=payload.source, title=payload.title, raw_text=payload.text,
        classification=nlp["classification"], score=nlp["score"]
    )
    db.add(speech)
    db.commit()
    return speech

@app.post("/api/chat")
def ai_chat(query: ChatQuery, db: Session = Depends(get_db)):
    prompt = query.prompt.lower()
    if "gold" in prompt or "xauusd" in prompt:
        res = "Gold drops post-hawkish FOMC prints due to higher yields increasing the opportunity cost of holding non-yielding metals."
    elif "cpi" in prompt:
        res = "A hotter-than-expected CPI print boosts USD interest-rate terminal expectations, making the greenback highly bullish."
    else:
        res = "The macroeconomic fundamentals indicate strong consolidation patterns pending systematic data validation across global central bank mandates."
    return {"response": res}

# --- Simulation Trigger Hook for Real-time testing ---
@app.post("/api/simulate/event")
async def simulate_event(db: Session = Depends(get_db)):
    import random
    events_pool = [
        {"name": "Core CPI MoM", "currency": "USD", "impact": "HIGH", "forecast": 0.3, "prev": 0.2, "act_mod": 0.2},
        {"name": "FOMC Rate Decision", "currency": "USD", "impact": "HIGH", "forecast": 3.75, "prev": 3.75, "act_mod": 0.0},
        {"name": "ECB Interest Rate Decision", "currency": "EUR", "impact": "HIGH", "forecast": 3.00, "prev": 2.75, "act_mod": 0.25}
    ]
    chosen = random.choice(events_pool)
    actual_val = round(chosen["forecast"] + chosen["act_mod"] + random.choice([-0.1, 0.0, 0.1]), 2)
    
    surprise_res = AIEngine.calculate_surprise(actual_val, chosen["forecast"], chosen["prev"], chosen["currency"])
    explanation = AIEngine.generate_explanation(chosen["name"], actual_val, chosen["forecast"], surprise_res["sentiment"])
    
    event = EconomicEvent(
        event_name=chosen["name"], currency=chosen["currency"], impact=chosen["impact"],
        actual=actual_val, forecast=chosen["forecast"], previous=chosen["prev"],
        surprise_score=surprise_res["score"], sentiment=surprise_res["sentiment"],
        ai_explanation=explanation, release_time=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    impacts = AIEngine.dynamic_market_impact(event.event_name, event.currency, event.sentiment)
    for imp in impacts:
        m_imp = MarketImpact(event_id=event.id, asset=imp["asset"], direction=imp["direction"], confidence=imp["confidence"], volatility=imp["volatility"], reason=imp["reason"])
        db.add(m_imp)
        
        if imp["direction"] != "NEUTRAL":
            sig = TradingSignal(
                event_id=event.id, asset=imp["asset"], action=imp["direction"],
                entry_zone=f"Market price ({imp['asset']})", take_profit="TP Level 1/2", stop_loss="Invalidation high/low", risk_rating=imp["volatility"]
            )
            db.add(sig)
            
    db.commit()
    
    # Broadcast through Active WebSocket Pipes
    packet = {
        "type": "NEW_EVENT",
        "event_id": event.id,
        "event_name": event.event_name,
        "currency": event.currency,
        "impact": event.impact,
        "actual": event.actual,
        "forecast": event.forecast,
        "previous": event.previous,
        "sentiment": event.sentiment,
        "explanation": event.ai_explanation,
        "impacted_assets": impacts
    }
    await manager.broadcast(packet)
    return {"status": "event_simulated", "data": packet}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Maintain alive frame
    except WebSocketDisconnect:
        manager.disconnect(websocket)
