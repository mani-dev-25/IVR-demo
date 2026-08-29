import React, { useEffect, useRef, useState } from "react";
import { P, LANG_PROMPT_EN, LANG_PROMPT_HI, LANG_PROMPT_TA } from "./prompts.js";

const API = `${window.location.protocol}//${window.location.hostname}:8000/api`;
const KEYS = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", "CLEAR"], ["0", ""], ["#", "ENTER"]];

const MOCK_DB = {
  farmers: {
    "101101": { name: "S. Murugan", district: "Thanjavur", lang: "ta", phone: "9876543210" },
    "101102": { name: "K. Lakshmi", district: "Thanjavur", lang: "ta", phone: "9876543211" },
    "202201": { name: "R. Suresh", district: "Coimbatore", lang: "en", phone: "9876543212" },
    "202202": { name: "Priya Anand", district: "Coimbatore", lang: "en", phone: "9876543213" },
    "303301": { name: "Suresh Kumar Yadav", district: "Meerut", lang: "hi", phone: "9876543214" },
    "303302": { name: "Anita Sharma", district: "Meerut", lang: "hi", phone: "9876543215" },
  },
  locations: {
    Thanjavur: [
      { id: "THJ-01", name: "Thanjavur Main PDS Yard", km: 2.3 },
      { id: "THJ-02", name: "Orathanadu Procurement Centre", km: 5.1 },
      { id: "THJ-03", name: "Kumbakonam Regulated Market", km: 8.7 },
      { id: "THJ-04", name: "Pattukkottai Collection Point", km: 11.4 },
    ],
    Coimbatore: [
      { id: "CBE-01", name: "Coimbatore North APMC Yard", km: 3.0 },
      { id: "CBE-02", name: "Sulur Procurement Centre", km: 6.2 },
      { id: "CBE-03", name: "Pollachi Regulated Market", km: 14.5 },
    ],
    Meerut: [
      { id: "MRT-01", name: "Meerut Sadar Mandi", km: 1.8 },
      { id: "MRT-02", name: "Kharkhauda Procurement Centre", km: 9.3 },
      { id: "MRT-03", name: "Mawana Collection Yard", km: 12.1 },
      { id: "MRT-04", name: "Sardhana Regulated Market", km: 15.6 },
    ],
  },
  bookings: { "202201": { token: 47, date: "29 Aug 2026", time: "10:30 AM", location_id: "CBE-02", location_name: "Sulur Procurement Centre" } },
  queue: { "THJ-01": { people_ahead: 12, eta_minutes: 48 }, "THJ-02": { people_ahead: 4, eta_minutes: 20 }, "CBE-02": { people_ahead: 5, eta_minutes: 20 }, "MRT-01": { people_ahead: 15, eta_minutes: 45 } },
};

const DTMF = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477], "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477], "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};
let audioContext = null;
let currentAudio = null;
let currentUtterance = null;
let speechGeneration = 0;

function audioCtx() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioContext = new Ctx();
  }
  if (audioContext?.state === "suspended") audioContext.resume().catch(() => { });
  return audioContext;
}

function tone(key, special = false) {
  const ctx = audioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(special ? 0.10 : 0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (special ? 0.18 : 0.10));
    gain.connect(ctx.destination);
    if (DTMF[key]) {
      DTMF[key].forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.10);
      });
    } else {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = key === "CALL" ? 560 : 320;
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch (_) { }
}

// Every speech request gets a generation id. This prevents an old Hindi/Tamil/
// English request from starting after the caller has already selected a language
// or disconnected the call.
function stopSpeech() {
  speechGeneration += 1;
  try { window.speechSynthesis?.cancel(); } catch (_) { }
  if (currentAudio) {
    try {
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.removeAttribute("src");
      currentAudio.load();
    } catch (_) { }
    currentAudio = null;
  }
  if (currentUtterance) {
    currentUtterance.onend = null;
    currentUtterance.onerror = null;
  }
  currentUtterance = null;
}

function remoteSpeak(text, lang, done, status, generation) {
  const clean = String(text).replace(/<[^>]+>/g, "").trim();
  const url = `${API}/tts?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(clean)}`;
  const audio = new Audio();
  currentAudio = audio;
  audio.preload = "auto";
  audio.volume = 1;
  if (status && generation === speechGeneration) {
    status(lang === "ta-IN" ? "Tamil neural voice" : lang === "hi-IN" ? "Hindi neural voice" : "English neural voice");
  }
  const finish = (err) => {
    if (generation !== speechGeneration) return;
    if (currentAudio === audio) currentAudio = null;
    done?.(err);
  };
  audio.onended = () => finish();
  audio.onerror = () => finish(new Error("remote tts failed"));
  audio.src = url;
  return audio.play().catch(err => {
    if (generation !== speechGeneration) return Promise.reject(err);
    if (currentAudio === audio) currentAudio = null;
    throw err;
  });
}

function nativeSpeak(text, lang, done, status, generation) {
  if (generation !== speechGeneration) return;
  if (!window.speechSynthesis) throw new Error("Speech synthesis unavailable");
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.slice(0, 2).toLowerCase();
  const voice = voices.find(v => v.lang?.toLowerCase().startsWith(prefix));
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || lang;
  if (voice) u.voice = voice;
  u.rate = prefix === "ta" ? 0.88 : 0.93;
  u.pitch = 1;
  u.volume = 1;
  currentUtterance = u;
  u.onend = () => {
    if (generation !== speechGeneration) return;
    currentUtterance = null;
    done?.();
  };
  u.onerror = () => {
    if (generation !== speechGeneration) return;
    currentUtterance = null;
    done?.(new Error("native tts failed"));
  };
  status?.(prefix === "ta" ? "Tamil browser fallback" : prefix === "hi" ? "Hindi browser fallback" : "English browser fallback");
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(u);
}

function speak(text, lang, status, done) {
  stopSpeech();
  const generation = speechGeneration;
  return remoteSpeak(text, lang, done, status, generation).catch(() => {
    if (generation !== speechGeneration) return;
    try { nativeSpeak(text, lang, done, status, generation); }
    catch (_) {
      if (generation === speechGeneration) {
        status?.("Voice unavailable");
        done?.(new Error("all tts failed"));
      }
    }
  });
}

export default function App() {
  const [state, setState] = useState("IDLE");
  const [screenText, setScreenText] = useState("Press Green Call button to begin.");
  const [buffer, setBuffer] = useState("");
  const [soundStatus, setSoundStatus] = useState("Voice ready");
  const [log, setLog] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [backendOnline, setBackendOnline] = useState(null);
  const session = useRef({ lang: null, farmerId: "", farmer: null, locations: [], callerPhone: "" });
  const promptTimer = useRef(null);
  const busy = useRef(false);

  const lang = session.current.lang || "en";
  const p = P[lang];

  const logMessage = (who, text) => setLog(items => [...items, { who, text, at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);

  const say = (text, code = p.code) => {
    setScreenText(text);
    logMessage("system", text);
    speak(text, code, setSoundStatus);
  };

  const setFlow = next => setState(next);

  const endCall = () => {
    if (state === "IDLE") return;
    clearTimeout(promptTimer.current);
    stopSpeech();
    const goodbye = P[session.current.lang || "en"].goodbye;
    tone("END", true);
    setState("ENDED");
    setBuffer("");
    setScreenText(goodbye);
    logMessage("system", goodbye);
    speak(goodbye, P[session.current.lang || "en"].code, setSoundStatus, () => {
      setTimeout(() => {
        setState("IDLE");
        setScreenText("Call disconnected.\nPress Green Call button to begin.");
        setSoundStatus("Voice ready");
      }, 500);
    });
  };

  const playLanguageIntro = () => {
    clearTimeout(promptTimer.current);
    setFlow("LANG_SELECT");
    setScreenText(LANG_PROMPT_TA);
    logMessage("system", LANG_PROMPT_TA);
    speak(LANG_PROMPT_TA, "ta-IN", setSoundStatus, () => {
      promptTimer.current = setTimeout(() => {
        if (stateRef.current !== "LANG_SELECT") return;
        speak(LANG_PROMPT_EN, "en-IN", setSoundStatus, () => {
          promptTimer.current = setTimeout(() => {
            if (stateRef.current !== "LANG_SELECT") return;
            speak(LANG_PROMPT_HI, "hi-IN", setSoundStatus);
          }, 250);
        });
      }, 250);
    });
  };

  // A ref avoids stale state inside the multilingual greeting callback.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const startCall = () => {
    if (state !== "IDLE") return;
    tone("CALL", true);
    clearTimeout(promptTimer.current);
    stopSpeech();
    // Simulator-only caller identity. In a real IVR this value comes from the
    // incoming call metadata supplied by the telecom provider.
    const callerPhone = window.prompt(
      "SIMULATED CALLER PHONE\n\nEnter the registered 10-digit phone number for this demo:",
      "9876543210"
    );
    if (callerPhone === null) return;
    const normalizedPhone = callerPhone.replace(/\D/g, "");
    if (!/^\d{10}$/.test(normalizedPhone)) {
      window.alert("Please enter a valid 10-digit caller phone number.");
      return;
    }

    session.current = { lang: null, farmerId: "", farmer: null, locations: [], callerPhone: normalizedPhone };
    setLog([]);
    setBuffer("");
    setSeconds(0);
    setBackendOnline(null);
    setFlow("LANG_SELECT");
    logMessage("system", "CALL CONNECTED — keypad IVR session started.");
    logMessage("system", `Caller phone verified for simulation: ${normalizedPhone}`);

    // Strictly serialize the three language announcements. A cancelled
    // announcement can no longer resume and speak in the wrong language.
    const playNext = (text, code, next) => {
      speak(text, code, setSoundStatus, () => {
        if (stateRef.current !== "LANG_SELECT") return;
        if (next) next();
      });
    };
    playNext(LANG_PROMPT_TA, "ta-IN", () =>
      playNext(LANG_PROMPT_EN, "en-IN", () =>
        playNext(LANG_PROMPT_HI, "hi-IN")
      )
    );
  };

  useEffect(() => {
    if (state === "IDLE") return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    const keydown = e => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (/^[0-9*#]$/.test(e.key)) onKey(e.key);
      else if (e.key === "Enter") onKey("#");
      else if (e.key === "Backspace") onKey("*");
      else if (e.key.toLowerCase() === "c") startCall();
      else if (e.key === "Escape" || e.key.toLowerCase() === "e") endCall();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  async function apiGet(url) {
    try {
      const res = await fetch(url);
      setBackendOnline(true);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      setBackendOnline(false);
      return null;
    }
  }

  async function submitFarmerId() {
    if (busy.current) return;
    const id = buffer.trim();
    if (!/^\d{6}$/.test(id)) {
      say(p.idEnter);
      return;
    }
    busy.current = true;
    stopSpeech();
    setScreenText(lang === "ta" ? `விவசாயி அடையாள எண் ${id.split("").join(" ")} சரிபார்க்கப்படுகிறது.` : lang === "hi" ? `किसान आईडी ${id} की जांच की जा रही है।` : `Verifying Farmer ID ${id}.`);
    logMessage("you", `Farmer ID: ${id} #`);
    // Authentication requires BOTH the Farmer ID and the caller's registered phone.
    let authFarmer = null;
    try {
      const res = await fetch(`${API}/authenticate/${encodeURIComponent(id)}?phone=${encodeURIComponent(session.current.callerPhone)}`);
      setBackendOnline(true);
      if (res.ok) {
        const data = await res.json();
        authFarmer = data.farmer;
      }
    } catch (_) {
      setBackendOnline(false);
    }

    // Keep the local demo working when the backend is offline, but enforce the
    // exact same phone + Farmer ID check against the simulator's mock data.
    if (!authFarmer) {
      const mockFarmer = MOCK_DB.farmers[id];
      if (mockFarmer && mockFarmer.phone === session.current.callerPhone) authFarmer = mockFarmer;
    }

    busy.current = false;
    if (!authFarmer) {
      setFlow("ID_ENTRY");
      say(lang === "ta"
        ? "உங்கள் தொலைபேசி எண்ணும் விவசாயி அடையாள எண்ணும் பொருந்தவில்லை. மீண்டும் முயற்சி செய்யவும்."
        : lang === "hi"
          ? "आपका मोबाइल नंबर और किसान आईडी मेल नहीं खाते। कृपया फिर से प्रयास करें।"
          : "The caller phone number and Farmer ID do not match. Please try again.");
      return;
    }

    const farmer = authFarmer;
    session.current.farmerId = id;
    session.current.farmer = farmer;
    setBuffer("");
    setFlow("ID_CONFIRM");
    say(p.idConfirm(farmer.name));
  }

  async function loadLocations() {
    if (busy.current) return;
    busy.current = true;
    let locs = await apiGet(`${API}/locations?district=${encodeURIComponent(session.current.farmer.district)}`);
    if (!locs?.length) locs = MOCK_DB.locations[session.current.farmer.district] || [];
    session.current.locations = locs.slice(0, 6);
    busy.current = false;
    setFlow("LOCATION_LIST");
    say(p.locList(session.current.locations));
  }

  async function bookLocation(index) {
    if (busy.current) return;
    const loc = session.current.locations[index];
    if (!loc) return say(p.invalidKey);
    busy.current = true;
    logMessage("you", `Selected centre: ${loc.name}`);
    let booking = null;
    try {
      const res = await fetch(`${API}/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ farmer_id: session.current.farmerId, location_id: loc.id || loc._id }) });
      setBackendOnline(true);
      if (res.ok) booking = await res.json();
    } catch (_) { setBackendOnline(false); }
    if (!booking) booking = { token: Math.floor(Math.random() * 80) + 20, date: "29 Aug 2026", time: "10:30 AM", location_name: loc.name, location_id: loc.id };
    busy.current = false;
    setFlow("BOOKING_DONE");
    say(p.booked(booking));
  }

  async function previewBooking() {
    if (busy.current) return;
    busy.current = true;
    let booking = await apiGet(`${API}/bookings/${encodeURIComponent(session.current.farmerId)}`);
    if (!booking) booking = MOCK_DB.bookings[session.current.farmerId];
    busy.current = false;
    setFlow("PREVIEW");
    say(booking ? p.preview(booking) : p.noBooking);
  }

  async function liveQueue() {
    if (busy.current) return;
    busy.current = true;
    let booking = await apiGet(`${API}/bookings/${encodeURIComponent(session.current.farmerId)}`);
    if (!booking) booking = MOCK_DB.bookings[session.current.farmerId];
    let q = booking ? await apiGet(`${API}/queue/${encodeURIComponent(booking.location_id)}`) : null;
    if (!q && booking) q = MOCK_DB.queue[booking.location_id];
    busy.current = false;
    setFlow("QUEUE");
    if (!booking) return say(p.noBooking);
    if (!q) return say(p.invalidKey);
    say(p.queue(q, booking.location_name));
  }

  async function onKey(key) {
    tone(key);
    if (stateRef.current === "IDLE") {
      if (key === "CALL" || key === "OK") startCall();
      return;
    }
    if (stateRef.current === "ENDED") return;
    if (key === "CALL") return;
    logMessage("you", `Pressed ${key}`);

    const current = stateRef.current;
    if (current === "LANG_SELECT") {
      if (key === "1") { stopSpeech(); session.current.lang = "ta"; setFlow("ID_ENTRY"); setBuffer(""); say(P.ta.idEnter, "ta-IN"); return; }
      if (key === "2") { stopSpeech(); session.current.lang = "en"; setFlow("ID_ENTRY"); setBuffer(""); say(P.en.idEnter, "en-IN"); return; }
      if (key === "3") { stopSpeech(); session.current.lang = "hi"; setFlow("ID_ENTRY"); setBuffer(""); say(P.hi.idEnter, "hi-IN"); return; }
      return say(LANG_PROMPT_TA, "ta-IN");
    }

    if (current === "ID_ENTRY") {
      if (key === "*") { setBuffer(""); return; }
      if (key === "#" || key === "OK") return submitFarmerId();
      if (/^\d$/.test(key)) setBuffer(v => v.length < 6 ? v + key : v);
      return;
    }

    if (current === "ID_CONFIRM") {
      if (key === "1") return goMainMenu();
      if (key === "2") { setFlow("ID_ENTRY"); setBuffer(""); return say(p.idEnter); }
      return say(p.invalidKey);
    }

    if (current === "MAIN_MENU") {
      if (key === "1") return loadLocations();
      if (key === "2") return previewBooking();
      if (key === "3") return liveQueue();
      if (key === "9") return endCall();
      return say(p.invalidKey);
    }

    if (current === "LOCATION_LIST") {
      if (key === "9") return goMainMenu();
      if (/^[1-6]$/.test(key)) return bookLocation(Number(key) - 1);
      return say(p.invalidKey);
    }

    if (["BOOKING_DONE", "PREVIEW", "QUEUE"].includes(current)) {
      if (key === "9") return goMainMenu();
      // When the caller has no booking, the prompt explicitly says 1 = book.
      // Accept it from both Preview and Queue states instead of returning
      // "invalid option".
      if (key === "1") {
        const hasBooking = !!MOCK_DB.bookings[session.current.farmerId];
        if (!hasBooking && (current === "PREVIEW" || current === "QUEUE")) return loadLocations();
      }
      return say(p.invalidKey);
    }
  }

  function goMainMenu() {
    setFlow("MAIN_MENU");
    say(P[session.current.lang].mainMenu);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const scriptClass = lang === "ta" ? "script-ta" : lang === "hi" ? "script-hi" : "";
  const languageName = lang === "ta" ? "தமிழ்" : lang === "hi" ? "हिंदी" : "English";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="eyebrow">FARMER PROCUREMENT • IVR PROTOTYPE</div>
        <h1>Realistic Keypad IVR — Multilingual Helpline</h1>
        <p>DTMF keypad • neural Tamil / English / Hindi voice • farmer verification • booking • queue status</p>
      </header>

      <main className="demo-grid">
        <section className="phone-column">
          <div className="samsung-phone">
            <div className="earpiece-wrap"><div className="earpiece" /><div className="samsung-logo">SAMSUNG</div></div>
            <div className="screen-frame">
              <div className="lcd-screen">
                <div className="status-bar"><span>📶 IND IVR</span><span>{mm}:{ss} 🔋</span></div>
                <div className={`screen-content ${scriptClass}`}>
                  <div className="call-badge"><span className={state === "IDLE" ? "dot idle" : "dot"} /> {state === "IDLE" ? "READY" : `CALL • ${languageName}`}</div>
                  <div className="screen-copy">{screenText}<span className="cursor" /></div>
                </div>
                {state === "ID_ENTRY" && <div className="buffer-display"><span>{buffer || "_ _ _ _ _ _"}</span><small># ENTER</small></div>}
                <div className="softkey-bar"><span>{state === "ID_ENTRY" ? "* CLEAR" : "MENU"}</span><span>{state === "ID_ENTRY" ? "# SUBMIT" : "9 BACK"}</span></div>
              </div>
            </div>

            <div className="control-cluster">
              <button className="soft-btn" onClick={() => state === "IDLE" ? startCall() : state === "ID_ENTRY" ? onKey("*") : goMainMenu()}>MENU</button>
              <div className="dpad-container">
                <button className="dpad-btn dpad-up">▲</button><button className="dpad-btn dpad-left">◀</button>
                <button className="dpad-ok" onClick={() => onKey("OK")}>OK</button><button className="dpad-btn dpad-right">▶</button><button className="dpad-btn dpad-down">▼</button>
              </div>
              <button className="soft-btn" onClick={() => state === "ID_ENTRY" ? onKey("#") : state !== "IDLE" ? endCall() : null}>BACK</button>
              <button className="action-btn call-btn" onClick={startCall}>📞</button>
              <button className="action-btn end-btn" onClick={endCall}>📵</button>
            </div>

            <div className="keypad">
              {KEYS.map(([d, letters]) => <button key={d} className="key" onClick={() => onKey(d)}><span className="digit">{d}</span><span className="letters">{letters}</span></button>)}
            </div>
          </div>
        </section>

        <aside className="console-panel">
          <div className="panel-head"><div><strong>IVR Console</strong><span>Live session transcript</span></div><span className={`backend ${backendOnline === true ? "online" : backendOnline === false ? "offline" : "checking"}`}>{backendOnline === true ? "BACKEND ONLINE" : backendOnline === false ? "DEMO FALLBACK" : "LOCAL DEMO"}</span></div>
          <div className="voice-card"><div className="voice-icon">🔊</div><div><b>{soundStatus}</b><span>Microsoft neural voice first; browser fallback second</span></div></div>
          <button className="test-voice" onClick={() => speak("வணக்கம். இது விவசாயிகள் கொள்முதல் உதவி மையத்தின் தமிழ் குரல் சோதனை. உங்கள் முன்பதிவு, டோக்கன் மற்றும் வரிசை நிலை தகவல்களை தெளிவாக கேட்கலாம்.", "ta-IN", setSoundStatus)}>▶ Test premium Tamil voice</button>
          <div className="transcript">{log.length === 0 ? <div className="empty-log">Press the green call button to start a real IVR-style demo.</div> : log.map((item, i) => <div className={`log-line ${item.who}`} key={i}><div className="log-meta">{item.who === "you" ? "CALLER" : "IVR"} · {item.at}</div><div>{item.text}</div></div>)}</div>
          <div className="demo-info"><div><b>Demo IDs</b><span>
            Demo numbers<br />
            Farmer ID&nbsp;&nbsp;&nbsp;&nbsp;Registered phone<br/>
            101101&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;9876543210<br/>
            101102&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;9876543211<br/>
            202201&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;9876543212<br/>
            202202&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;9876543213<br/>
            303301&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;9876543214<br/>
            303302&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;9876543215
          </span></div><div><b>Flow</b><span>Language → Farmer ID → Confirm → Main Menu → Booking / Preview / Queue</span></div><div><b>Controls</b><span>Keyboard works too: 1–9, *, #, C = Call, Esc = End</span></div></div>
        </aside>
      </main>
    </div>
  );
}
