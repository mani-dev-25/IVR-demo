"""
main.py — Farmer Procurement IVR backend

Endpoints mirror what a real IVR/telephony gateway (Exotel/Twilio/Asterisk +
your own webhook) would call at each step of the keypad flow. Swap fake_db
for real MongoDB (see fake_db.py docstring) when you're ready to go live.

Run:
    pip install fastapi uvicorn pydantic --break-system-packages
    uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import edge_tts
from datetime import datetime, timedelta

from fake_db import db

app = FastAPI(title="Farmer Procurement IVR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

SLOT_TIMES = ["09:00 AM", "10:30 AM", "12:00 PM", "02:00 PM"]
MAX_TTS_CHARS = 1800
TTS_CACHE: dict[tuple[str, str], bytes] = {}
TTS_CACHE_MAX = 64


# ---------- neural TTS ----------
TTS_VOICES = {
    "ta-IN": "ta-IN-PallaviNeural",
    "en-IN": "en-IN-NeerjaNeural",
    "hi-IN": "hi-IN-SwaraNeural",
}


@app.get("/api/tts")
async def text_to_speech(
    text: str = Query(..., min_length=1, max_length=MAX_TTS_CHARS),
    lang: str = Query("ta-IN"),
):
    """Generate high-quality Indian neural speech for the local IVR demo."""
    voice = TTS_VOICES.get(lang)
    if not voice:
        raise HTTPException(status_code=400, detail="Unsupported language")

    cache_key = (lang, text.strip())
    cached = TTS_CACHE.get(cache_key)
    if cached:
        return Response(
            content=cached,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=3600"},
        )

    try:
        communicate = edge_tts.Communicate(
            text=text.strip(),
            voice=voice,
            rate="-8%" if lang == "ta-IN" else "-5%",
            volume="+0%",
            pitch="+0Hz",
        )

        audio = bytearray()
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                audio.extend(chunk.get("data", b""))

        if not audio:
            raise RuntimeError("TTS provider returned no audio")

        audio_bytes = bytes(audio)
        if len(TTS_CACHE) >= TTS_CACHE_MAX:
            TTS_CACHE.pop(next(iter(TTS_CACHE)))
        TTS_CACHE[cache_key] = audio_bytes
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": 'inline; filename="ivr-voice.mp3"',
            },
        )
    except Exception as exc:
        print(f"TTS error: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Neural voice generation failed. Check internet connectivity.",
        )


# ---------- schemas ----------
class BookRequest(BaseModel):
    farmer_id: str
    location_id: str


# ---------- 1. validate farmer id ----------
@app.get("/api/farmers/{farmer_id}")
async def validate_farmer(farmer_id: str):
    farmer = await db.farmers.find_one({"_id": farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer ID not found")
    return farmer


# ---------- 2a. nearby locations for booking ----------
@app.get("/api/locations")
async def get_locations(district: str):
    locs = await db.locations.find({"district": district})
    locs.sort(key=lambda l: l["km"])
    return locs[:6]  # keypad only has options 1-6


# ---------- 2b. book a slot ----------
@app.post("/api/bookings")
async def book_slot(req: BookRequest):
    farmer = await db.farmers.find_one({"_id": req.farmer_id})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer ID not found")
    location = await db.locations.find_one({"_id": req.location_id})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    existing = await db.bookings.find_one({"_id": req.farmer_id})
    if existing:
        return existing

    booking = {
        "_id": req.farmer_id,
        "token": db.next_token(),
        "date": (datetime.now() + timedelta(days=1)).strftime("%d %b %Y"),
        "time": random.choice(SLOT_TIMES),
        "location_id": req.location_id,
        "location_name": location["name"],
    }
    await db.bookings.insert_one(dict(booking))
    await db.queue.update_one({"_id": req.location_id}, {"$inc": {"people_ahead": 1}})
    return booking


# ---------- 3. preview existing booking ----------
@app.get("/api/bookings/{farmer_id}")
async def get_booking(farmer_id: str):
    booking = await db.bookings.find_one({"_id": farmer_id})
    if not booking:
        raise HTTPException(status_code=404, detail="No active booking")
    return booking


# ---------- 4. live queue status ----------
@app.get("/api/queue/{location_id}")
async def get_queue(location_id: str):
    q = await db.queue.find_one({"_id": location_id})
    if not q:
        raise HTTPException(status_code=404, detail="Location not found")
    return {
        "location_id": location_id,
        "people_ahead": q["people_ahead"],
        "eta_minutes": q["people_ahead"] * q["avg_minutes"],
    }


@app.get("/")
async def root():
    return {"status": "ok", "service": "Farmer Procurement IVR API"}
