import math
import httpx
from typing import Dict, Any, List

class AIEngine:
    @staticmethod
    def calculate_surprise(actual: float, forecast: float, previous: float, currency: str) -> dict:
        """
        Calculates standardized statistical surprise and directional sentiment bias.
        """
        if forecast is None or actual is None:
            return {"score": 0.0, "sentiment": "NEUTRAL"}
        
        diff = actual - forecast
        denominator = abs(forecast) if forecast != 0 else (abs(previous) if previous != 0 else 1.0)
        score = (diff / denominator) * 10.0
        
        # Determine standard bias mapping (invert rules for specific pairs if necessary, e.g., Unemployment)
        is_positive_bullish = True
        if "unemployment" in currency.lower() or "claims" in currency.lower():
            is_positive_bullish = False
            
        if abs(score) < 0.05:
            sentiment = "NEUTRAL"
        elif score > 0:
            sentiment = "BULLISH" if is_positive_bullish else "BEARISH"
        else:
            sentiment = "BEARISH" if is_positive_bullish else "BULLISH"
            
        return {"score": round(score, 2), "sentiment": sentiment}

    @staticmethod
    def generate_explanation(event_name: str, actual: float, forecast: float, sentiment: str) -> str:
        return (
            f"The release of {event_name} generated an actual printing of {actual} versus a market forecast consensus of {forecast}. "
            f"This absolute delta induces a structural validation favoring a {sentiment} trajectory. "
            f"Institutional matching flows suggest dynamic cross-asset positioning changes over the coming trading sessions."
        )

    @staticmethod
    def dynamic_market_impact(event_name: str, currency: str, sentiment: str) -> List[Dict[str, Any]]:
        assets_map = {
            "USD": ["EURUSD", "USDJPY", "XAUUSD", "NASDAQ", "SP500"],
            "EUR": ["EURUSD", "EURGBP", "EURJPY"],
            "GBP": ["GBPUSD", "GBPJPY"]
        }
        target_assets = assets_map.get(currency.upper(), ["EURUSD", "XAUUSD", "BTCUSD"])
        impacts = []
        
        for asset in target_assets:
            # Simple mapping logic for demonstration stability
            if sentiment == "BULLISH":
                direction = "SELL" if asset.startswith("EUR") or asset.startswith("GBP") or asset in ["XAUUSD"] else "BUY"
            elif sentiment == "BEARISH":
                direction = "BUY" if asset.startswith("EUR") or asset.startswith("GBP") or asset in ["XAUUSD"] else "SELL"
            else:
                direction = "NEUTRAL"
                
            impacts.append({
                "asset": asset,
                "direction": direction,
                "confidence": 88.5 if direction != "NEUTRAL" else 50.0,
                "volatility": "HIGH" if direction != "NEUTRAL" else "LOW",
                "reason": f"Macro realignment stemming from direct deviations relative to modern historical run-rates for {event_name}."
            })
        return impacts

    @staticmethod
    def analyze_speech_nlp(text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        hawkish_indicators = ["tightening", "inflation pressure", "hike", "restrictive", "elevated"]
        dovish_indicators = ["easing", "transitory", "cut", "accommodation", "slowdown", "softening"]
        
        hawk_count = sum(text_lower.count(word) for word in hawkish_indicators)
        dove_count = sum(text_lower.count(word) for word in dovish_indicators)
        
        score = 0.0
        if (hawk_count + dove_count) > 0:
            score = (hawk_count - dove_count) / (hawk_count + dove_count)
            
        if score > 0.4: classification = "Strong Hawkish"
        elif score > 0.05: classification = "Hawkish"
        elif score < -0.4: classification = "Strong Dovish"
        elif score < -0.05: classification = "Dovish"
        else: classification = "Neutral"
        
        return {"classification": classification, "score": round(score, 2)}

class NotificationRouter:
    @staticmethod
    async def dispatch_telegram(bot_token: str, chat_id: str, payload: str):
        if not bot_token or not chat_id: return
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        async with httpx.AsyncClient() as client:
            await client.post(url, json={"chat_id": chat_id, "text": payload, "parse_mode": "HTML"})

    @staticmethod
    async def dispatch_discord(webhook_url: str, payload: dict):
        if not webhook_url: return
        async with httpx.AsyncClient() as client:
            await client.post(webhook_url, json={"content": payload.get("text", "")})
