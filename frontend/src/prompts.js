// Production-style IVR prompts.
// The first prompt is intentionally multilingual so a caller can choose a language
// without needing to understand English. Once a language is selected, every prompt
// and every confirmation is spoken in that language only.

export const LANG_PROMPT_TA = "விவசாயிகள் கொள்முதல் உதவி மையத்திற்கு வரவேற்கிறோம். " +
  "தமிழில் தொடர, எண் ஒன்றை அழுத்தவும். " +
  "ஆங்கிலத்தில் தொடர, எண் இரண்டை அழுத்தவும். " +
  "இந்தியில் தொடர, எண் மூன்றை அழுத்தவும்.";

export const LANG_PROMPT_EN =
  "Welcome to the Farmer Procurement Helpline. " +
  "For Tamil, press 1. For English, press 2. For Hindi, press 3.";

export const LANG_PROMPT_HI =
  "किसान खरीद सहायता केंद्र में आपका स्वागत है। " +
  "तमिल के लिए 1 दबाएं। अंग्रेज़ी के लिए 2 दबाएं। हिंदी के लिए 3 दबाएं।";

export const LANG_PROMPT = LANG_PROMPT_TA;

const taLocation = (name) => ({
  "Thanjavur Main PDS Yard": "தஞ்சாவூர் முக்கிய கொள்முதல் மையம்",
  "Orathanadu Procurement Centre": "ஒரத்தநாடு கொள்முதல் மையம்",
  "Kumbakonam Regulated Market": "கும்பகோணம் ஒழுங்குமுறை சந்தை",
  "Pattukkottai Collection Point": "பட்டுக்கோட்டை சேகரிப்பு மையம்",
  "Coimbatore North APMC Yard": "கோயம்புத்தூர் வடக்கு ஏபிஎம்சி கொள்முதல் மையம்",
  "Sulur Procurement Centre": "சூலூர் கொள்முதல் மையம்",
  "Pollachi Regulated Market": "பொள்ளாச்சி ஒழுங்குமுறை சந்தை",
  "Meerut Sadar Mandi": "மீரட் சதார் மண்டி",
  "Kharkhauda Procurement Centre": "கார்கோடா கொள்முதல் மையம்",
  "Mawana Collection Yard": "மவானா சேகரிப்பு மையம்",
  "Sardhana Regulated Market": "சர்தானா ஒழுங்குமுறை சந்தை",
}[name] || name);

const hiLocation = (name) => ({
  "Thanjavur Main PDS Yard": "तंजावुर मुख्य खरीद केंद्र",
  "Orathanadu Procurement Centre": "ओराथानाडु खरीद केंद्र",
  "Kumbakonam Regulated Market": "कुंभकोणम विनियमित बाजार",
  "Pattukkottai Collection Point": "पट्टुकोट्टई संग्रह केंद्र",
  "Coimbatore North APMC Yard": "कोयंबटूर उत्तर एपीएमसी खरीद केंद्र",
  "Sulur Procurement Centre": "सुलूर खरीद केंद्र",
  "Pollachi Regulated Market": "पोलाची विनियमित बाजार",
  "Meerut Sadar Mandi": "मेरठ सदर मंडी",
  "Kharkhauda Procurement Centre": "खरखौदा खरीद केंद्र",
  "Mawana Collection Yard": "मवाना संग्रह केंद्र",
  "Sardhana Regulated Market": "सरधना विनियमित बाजार",
}[name] || name);

const tamilKm = (km) => `${String(km).replace(".", " புள்ளி ")} கிலோமீட்டர்`;
const tamilNumber = (n) => String(n).replace(/\d/g, d => "௦௧௨௩௪௫௬௭௮௯"[Number(d)]);
const tamilFarmerName = (name) => ({ "S. Murugan": "எஸ். முருகன்", "K. Lakshmi": "கே. லட்சுமி" }[name] || name);
const tamilId = (id) => String(id).split("").map(d => tamilNumber(d)).join(" ");
const tamilDate = (date) => {
  const m = String(date || "").match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return date;
  const months = {
    Jan: "ஜனவரி", Feb: "பிப்ரவரி", Mar: "மார்ச்", Apr: "ஏப்ரல்", May: "மே", Jun: "ஜூன்",
    Jul: "ஜூலை", Aug: "ஆகஸ்ட்", Sep: "செப்டம்பர்", Oct: "அக்டோபர்", Nov: "நவம்பர்", Dec: "டிசம்பர்"
  };
  return `${m[1]} ${months[m[2]] || m[2]} ${m[3]}`;
};
const tamilTime = (time) => {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return time;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const period = m[3].toUpperCase() === "AM" ? "காலை" : "மதியம்";
  return min === 0 ? `${period} ${h} மணி` : `${period} ${h} மணி ${min} நிமிடம்`;
};

export const P = {
  en: {
    code: "en-IN",
    idEnter: "Please enter your six digit Farmer ID, then press hash.",
    idInvalid: "Sorry. This Farmer ID was not found. Please check the number and try again.",
    idConfirm: (n) => `Your Farmer ID belongs to ${n}. Press 1 to confirm, or 2 to enter it again.`,
    mainMenu: "Main menu. Press 1 to book a procurement slot. Press 2 to hear your current booking. Press 3 to check the live queue. Press 9 to return to the previous menu.",
    locList: (list) =>
      "Nearby procurement centres. " +
      list.map((l, i) => `Press ${i + 1} for ${l.name}, ${l.km} kilometres away.`).join(" ") +
      " Press 9 to return to the main menu.",
    booked: (b) => `Your slot has been booked successfully. Your token number is ${b.token}. Date ${b.date}. Time ${b.time}. Centre ${b.location_name}. Please arrive on time.`,
    noBooking: "You do not have an active booking. Press 1 to book a slot or press 9 for the main menu.",
    preview: (b) => `Your token number is ${b.token}. Date ${b.date}. Time ${b.time}. Centre ${b.location_name}.`,
    queue: (q, name) => `At ${name}, there are ${q.people_ahead} farmers ahead of you. Estimated waiting time is ${q.eta_minutes} minutes. Press 9 for the main menu.`,
    goodbye: "Thank you for calling the Farmer Procurement Helpline. Your call has ended. Goodbye.",
    invalidKey: "Invalid option. Please press a valid key.",
    retry: "Let's try again.",
    timeout: "We did not receive your response. Please make your selection again.",
  },
  ta: {
    code: "ta-IN",

    idEnter:
      "தயவுசெய்து உங்கள் ஆறு இலக்க விவசாயி அடையாள எண்ணை உள்ளிடவும். " +
      "பிறகு ஹேஷ் குறியீட்டை அழுத்தவும்.",

    idInvalid:
      "மன்னிக்கவும். இந்த விவசாயி அடையாள எண் கிடைக்கவில்லை. " +
      "எண்ணை சரிபார்த்து மீண்டும் முயற்சி செய்யவும்.",

    idConfirm: (n) =>
      `உங்கள் விவசாயி அடையாள எண் ${tamilFarmerName(n)} அவர்களுடையது. ` +
      "உறுதிப்படுத்த, எண் ஒன்றை அழுத்தவும். " +
      "மீண்டும் உள்ளிட, எண் இரண்டை அழுத்தவும்.",

    mainMenu:
      "முதன்மை மெனு. " +
      "கொள்முதல் நேரத்தை முன்பதிவு செய்ய, எண் ஒன்றை அழுத்தவும். " +
      "உங்கள் முன்பதிவு விவரங்களை கேட்க, எண் இரண்டை அழுத்தவும். " +
      "நேரடி வரிசை நிலையை அறிய, எண் மூன்றை அழுத்தவும். " +
      "வெளியே செல்ல, எண் ஒன்பதை அழுத்தவும்.",

    locList: (list) =>
      "உங்களுக்கு அருகிலுள்ள கொள்முதல் மையங்கள். " +
      list
        .map(
          (l, i) =>
            `${tamilNumber(i + 1)} அழுத்தவும், ${taLocation(l.name)}. ` +
            `இந்த மையம் உங்களிடமிருந்து ${tamilKm(l.km)} தொலைவில் உள்ளது.`
        )
        .join(" ") +
      " வெளியே செல்ல, எண் ஒன்பதை அழுத்தவும்.",

    booked: (b) =>
      `உங்கள் கொள்முதல் நேர முன்பதிவு வெற்றிகரமாக முடிந்தது. ` +
      `உங்கள் டோக்கன் எண் ${b.token}. ` +
      `தேதி ${tamilDate(b.date)}. ` +
      `நேரம் ${tamilTime(b.time)}. ` +
      `கொள்முதல் மையம் ${taLocation(b.location_name)}. ` +
      "தயவுசெய்து குறிப்பிட்ட நேரத்திற்கு முன்பாக மையத்திற்கு வரவும்.",

    noBooking:
      "உங்களிடம் தற்போது எந்த முன்பதிவும் இல்லை. " +
      "புதிய கொள்முதல் நேரத்தை முன்பதிவு செய்ய, எண் ஒன்றை அழுத்தவும். " +
      "வெளியே செல்ல, எண் ஒன்பதை அழுத்தவும்.",

    preview: (b) =>
      `உங்கள் டோக்கன் எண் ${b.token}. ` +
      `தேதி ${tamilDate(b.date)}. ` +
      `நேரம் ${tamilTime(b.time)}. ` +
      `கொள்முதல் மையம் ${taLocation(b.location_name)}.`,

    queue: (q, name) =>
      `${taLocation(name)} மையத்தில், ` +
      `உங்களுக்கு முன்னால் ${q.people_ahead} விவசாயிகள் உள்ளனர். ` +
      `காத்திருக்கும் நேரம் சுமார் ${q.eta_minutes} நிமிடங்கள். ` +
      "வெளியே செல்ல, எண் ஒன்பதை அழுத்தவும்.",

    goodbye:
      "விவசாயிகள் கொள்முதல் உதவி மையத்தை தொடர்பு கொண்டதற்கு நன்றி. " +
      "உங்கள் அழைப்பு முடிக்கப்பட்டது. வணக்கம்.",

    invalidKey:
      "தவறான தேர்வு. தயவுசெய்து சரியான எண்ணை அழுத்தவும்.",

    retry:
      "மீண்டும் முயற்சி செய்யலாம்.",

    timeout:
      "உங்கள் பதில் கிடைக்கவில்லை. தயவுசெய்து மீண்டும் தேர்வு செய்யவும்.",
  },

  hi: {
    code: "hi-IN",
    idEnter: "कृपया अपनी छह अंकों की किसान आईडी दर्ज करें। उसके बाद हैश दबाएं।",
    idInvalid: "क्षमा करें। यह किसान आईडी नहीं मिली। कृपया नंबर जांचकर फिर से प्रयास करें।",
    idConfirm: (n) => `आपकी किसान आईडी ${n} के नाम पर है। पुष्टि के लिए 1 दबाएं। दोबारा दर्ज करने के लिए 2 दबाएं।`,
    mainMenu: "मुख्य मेनू। खरीद स्लॉट बुक करने के लिए 1 दबाएं। अपनी वर्तमान बुकिंग सुनने के लिए 2 दबाएं। लाइव कतार की स्थिति जानने के लिए 3 दबाएं। पिछले मेनू पर जाने के लिए 9 दबाएं।",
    locList: (list) =>
      "आपके पास के खरीद केंद्र। " +
      list.map((l, i) => ` ${i + 1} दबाएं, ${hiLocation(l.name)} के लिए। यह ${l.km} किलोमीटर दूर है।`).join(" ") +
      " मुख्य मेनू के लिए 9 दबाएं।",
    booked: (b) => `आपका खरीद स्लॉट सफलतापूर्वक बुक हो गया है। आपका टोकन नंबर ${b.token} है। तारीख ${b.date}। समय ${b.time}। खरीद केंद्र ${hiLocation(b.location_name)}। कृपया समय से पहले केंद्र पर पहुंचें।`,
    noBooking: "आपकी अभी कोई सक्रिय बुकिंग नहीं है। स्लॉट बुक करने के लिए 1 दबाएं। मुख्य मेनू के लिए 9 दबाएं।",
    preview: (b) => `आपका टोकन नंबर ${b.token} है। तारीख ${b.date}। समय ${b.time}। खरीद केंद्र ${hiLocation(b.location_name)}।`,
    queue: (q, name) => `${hiLocation(name)} में, आपसे पहले ${q.people_ahead} किसान हैं। अनुमानित प्रतीक्षा समय ${q.eta_minutes} मिनट है। मुख्य मेनू के लिए 9 दबाएं।`,
    goodbye: "किसान खरीद सहायता केंद्र पर कॉल करने के लिए धन्यवाद। आपकी कॉल समाप्त हो गई है। नमस्ते।",
    invalidKey: "गलत विकल्प। कृपया सही नंबर दबाएं।",
    retry: "आइए फिर से प्रयास करते हैं।",
    timeout: "आपका जवाब नहीं मिला। कृपया फिर से विकल्प चुनें।",
  },
};
