/*
 * Kawan CBT — Smart v3.4 consolidated edition
 * Full replacement for app.js
 * Upgrade layers: v3.0 safety-aware text checks; v3.1 session memory;
 * v3.2 answer-led follow-up; v3.3 contextual reflection/actions; v3.4 regression hooks
 * Notes:
 * - Rule-based support, not an AI diagnosis.
 * - Keyword detection is only a prompt for adult follow-up, not proof that an event occurred.
 */

// ====== Elements ======
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const resetBtn = document.getElementById("resetBtn");

const optionsEl = document.getElementById("options");
const optionsTitle = document.getElementById("optionsTitle");
const scenarioArea = document.getElementById("scenarioArea");

const kioskToggle = document.getElementById("kioskToggle");
const longToggle = document.getElementById("longToggle");
const themeToggle = document.getElementById("themeToggle");
const ttsToggle = document.getElementById("ttsToggle");
const privacyToggle = document.getElementById("privacyToggle");

const modePill = document.getElementById("modePill");
const stepPill = document.getElementById("stepPill");
const hintPill = document.getElementById("hintPill");
const progressBar = document.getElementById("progressBar");
const stepExplain = document.getElementById("stepExplain");
const toBottomBtn = document.getElementById("toBottomBtn");

const studentIdEl = document.getElementById("studentId");
const gradeSelect = document.getElementById("gradeSelect");
const charCount = document.getElementById("charCount");
const charHint = document.getElementById("charHint");
const clearDataBtn = document.getElementById("clearDataBtn");

const summaryModal = document.getElementById("summaryModal");
const summaryContent = document.getElementById("summaryContent");
const closeSummary = document.getElementById("closeSummary");
const copySummary = document.getElementById("copySummary");
const copyTeacherSummary = document.getElementById("copyTeacherSummary");
const exportStats = document.getElementById("exportStats");
const newStudent = document.getElementById("newStudent");
const tabMurid = document.getElementById("tabMurid");
const tabGuru = document.getElementById("tabGuru");

const teacherBtn = document.getElementById("teacherBtn");
const teacherModal = document.getElementById("teacherModal");
const teacherContent = document.getElementById("teacherContent");
const closeTeacher = document.getElementById("closeTeacher");
const closeTeacher2 = document.getElementById("closeTeacher2");
const copyTeacher = document.getElementById("copyTeacher");

let kioskMode = false;
let longMode = true;
let ttsEnabled = false;
let summaryView = "murid";
let state;

const INPUT_SOURCE = { TYPED: "typed", OPTION: "option" };
const LS_FAVS = "cbt_favs_final";
const LS_LOGS = "cbt_logs_final";
const LS_TOOL_SCORES = "cbt_tool_scores_final";

const BOT_NAME = "Kawan CBT";
const BOT_OPENING = "Hai, saya Kawan CBT. Kalau hati kamu rasa berat, kita boleh mula perlahan-lahan bersama.";
const BOT_CLOSING = "Hari ini kamu sudah buat satu langkah kecil yang berani. 🌈";
const BOT_STRENGTH_LABEL = "Kekuatan hari ini";

const SCHOOL_HELP = {
  safePlace: "Bilik Kaunseling / Pejabat Sekolah",
  trustedAdult: "Cikgu kelas / Kaunselor / Guru Bertugas",
  helpLines: [
    "Cikgu, saya perlukan bantuan sekejap.",
    "Cikgu, saya rasa tak selamat / takut.",
    "Cikgu, saya dibuli / diejek. Boleh tolong saya?",
    "Cikgu, boleh saya duduk di tempat selamat sekejap?",
    "Cikgu, saya perlukan kaunselor."
  ]
};

// ====== General utilities ======
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function normalize(s) { return String(s || "").toLowerCase().trim(); }
function shorten(text, max = 95) {
  const t = String(text || "").trim().replace(/\s+/g, " ");
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}
function isNumberLike(x) {
  const s = String(x ?? "").trim();
  return s !== "" && Number.isFinite(Number(s));
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
}
function privacyOn() { return !!privacyToggle?.checked; }
function canStore() { return !privacyOn(); }

const TEXT_ALIASES = [
  [/\b(?:x\s*tau|xtau|taktau|tak\s*tau|tk\s*tau|entah(?:lah)?|idk)\b/gi, "tak tahu"],
  [/\b(?:xde|takde)\b/gi, "tak ada"],
  [/\b(?:sy|sya)\b/gi, "saya"],
  [/\b(?:aq|aku)\b/gi, "saya"],
  [/\b(?:diorg|dorang)\b/gi, "mereka"],
  [/\b(?:kwn2|kwn)\b/gi, "kawan"],
  [/\bsbb\b/gi, "sebab"],
  [/\b(?:mcm|cm|cam)\b/gi, "macam"],
  [/\b(?:tkt|takot)\b/gi, "takut"],
  [/\b(?:rsau|riso)\b/gi, "risau"],
  [/\b(?:sedey|sedeh)\b/gi, "sedih"],
  [/\b(?:xnak|taknak)\b/gi, "tak nak"],
  [/\bmls\b/gi, "malas"],
  [/\bckp\b/gi, "cakap"],
  [/\bjer\b/gi, "je"]
];
function canonicalizeUserText(text) {
  let t = String(text || "").trim();
  TEXT_ALIASES.forEach(([pattern, replacement]) => { t = t.replace(pattern, replacement); });
  return t.replace(/\s+/g, " ").trim();
}

function gradeMode() {
  const v = gradeSelect?.value || "auto";
  if (v === "lower") return "lower";
  if (v === "upper") return "upper";
  if (kioskMode) return "lower";
  return "upper";
}
function shouldBeLong() {
  if (kioskMode || gradeMode() === "lower") return false;
  if (state?.lastInputSource === INPUT_SOURCE.TYPED) return true;
  return !!longMode;
}
function wrap(parts) { return (parts || []).filter(Boolean).join(shouldBeLong() ? "\n\n" : " "); }
function simplify(text) {
  if (gradeMode() !== "lower") return String(text);
  return String(text)
    .replace(/kadang-kadang/gi, "kadang")
    .replace(/perlahan-lahan/gi, "pelan-pelan")
    .replace(/terima kasih kerana/gi, "terima kasih sebab")
    .replace(/dengan/gi, "dgn")
    .replace(/realistik/gi, "mudah dibuat")
    .replace(/mungkin tidak 100% betul/gi, "mungkin tak betul sepenuhnya");
}
function applyKidsModeUI() { document.body.classList.toggle("kidsMode", gradeMode() === "lower"); }

// ====== Personalization / favourites ======
function getToolScores() { return loadJSON(LS_TOOL_SCORES, {}); }
function updateToolScore(action, delta) {
  if (!canStore() || !action) return;
  const scores = getToolScores();
  const rec = scores[action] || { uses: 0, totalDelta: 0 };
  rec.uses += 1;
  rec.totalDelta += delta;
  scores[action] = rec;
  saveJSON(LS_TOOL_SCORES, scores);
}
function rankTools(options) {
  const scores = getToolScores();
  return options.map(o => {
    const rec = scores[o.value] || { uses: 0, totalDelta: 0 };
    return { ...o, _avg: rec.uses ? rec.totalDelta / rec.uses : 0, _uses: rec.uses };
  }).sort((a, b) => (b._avg - a._avg) || (b._uses - a._uses))
    .map(({ _avg, _uses, ...rest }) => rest);
}
function getFavorites() { return loadJSON(LS_FAVS, []); }
function addFavorite(name) {
  if (!canStore() || !name) return;
  const favs = getFavorites();
  if (!favs.includes(name)) favs.push(name);
  saveJSON(LS_FAVS, favs);
}
function clearLocalData() {
  localStorage.removeItem(LS_FAVS);
  localStorage.removeItem(LS_LOGS);
  localStorage.removeItem(LS_TOOL_SCORES);
}

// ====== Voice ======
function canTTS() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}
function speak(text) {
  if (!ttsEnabled || !canTTS()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ms-MY";
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

// ====== Chat UI ======
function makeAvatar(who) {
  const a = document.createElement("div");
  a.className = `avatar ${who === "bot" ? "botA" : "userA"}`;
  a.textContent = who === "bot" ? "KCBT" : "ME";
  return a;
}
function addMsg(text, who = "bot", tag = null) {
  if (!chat) return;
  const row = document.createElement("div");
  row.className = `msg ${who}`;
  row.appendChild(makeAvatar(who));
  const wrapEl = document.createElement("div");
  wrapEl.className = "bubbleWrap";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (tag) {
    const t = document.createElement("div");
    t.className = `tag ${tag.kind}`;
    t.textContent = tag.text;
    bubble.appendChild(t);
  }
  const content = document.createElement("div");
  content.textContent = String(text ?? "");
  bubble.appendChild(content);
  wrapEl.appendChild(bubble);
  if (who === "bot") {
    const actions = document.createElement("div");
    actions.className = "bubbleActions";
    const spk = document.createElement("button");
    spk.type = "button";
    spk.className = "spkBtn";
    spk.textContent = "🔊 Dengar";
    spk.addEventListener("click", () => speak(String(text ?? "")));
    actions.appendChild(spk);
    wrapEl.appendChild(actions);
  }
  row.appendChild(wrapEl);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
  if (who === "bot") speak(String(text ?? ""));
}
function botTyping(delay = 260) {
  return new Promise(resolve => {
    if (!chat) return resolve();
    const row = document.createElement("div");
    row.className = "msg bot";
    row.appendChild(makeAvatar("bot"));
    const wrapEl = document.createElement("div");
    wrapEl.className = "bubbleWrap";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    bubble.appendChild(typing);
    wrapEl.appendChild(bubble);
    row.appendChild(wrapEl);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
    setTimeout(() => {
      if (chat.contains(row)) chat.removeChild(row);
      resolve();
    }, delay);
  });
}
async function botSay(text, tag = null, delay = 260) {
  await botTyping(delay);
  addMsg(text, "bot", tag);
}
function setOptions(title, options) {
  if (!optionsEl) return;
  if (optionsTitle) optionsTitle.textContent = title || "Pilih jawapan (atau taip):";
  optionsEl.innerHTML = "";
  (options || []).forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "optBtn";
    btn.textContent = opt.label;
    btn.addEventListener("click", () => handleUserInput(opt.value ?? opt.label, INPUT_SOURCE.OPTION));
    optionsEl.appendChild(btn);
  });
}
function clearOptions() { if (optionsEl) optionsEl.innerHTML = ""; }
function scrollBottom() { if (chat) chat.scrollTop = chat.scrollHeight; }

function setModeUI() {
  if (!modePill || !hintPill) return;
  const theme = document.body.classList.contains("dark") ? "Gelap" : "Ceria";
  const verbose = shouldBeLong() ? "Mendalam" : "Ringkas";
  modePill.textContent = `Mode: ${kioskMode ? "Kiosk" : "Normal"} • ${verbose} • Tema: ${theme} • ${privacyOn() ? "Privasi ON" : "Privasi OFF"}`;
  hintPill.textContent = kioskMode ? "Tip: guna butang" : "Tip: boleh taip";
}
function setProgress(step) {
  let s = step === 4.5 || step === 4.6 || step === 4.7 ? 5 : step;
  const shown = clamp(Math.round(Number(s) || 0), 0, 11);
  if (stepPill) stepPill.textContent = `Langkah: ${shown}/11`;
  if (progressBar) progressBar.style.width = `${(shown / 11) * 100}%`;
  if (stepExplain) stepExplain.textContent = `Penerangan: ${explainForStep(step)}`;
}
function explainForStep(step) {
  const map = {
    0: "Pilih situasi supaya Kawan CBT faham konteks kamu.",
    1: "Kenal pasti emosi sekarang.",
    2: "Skor 0–10 bantu kita faham kuatnya emosi.",
    3: "Bila emosi kuat, kita tenang dulu.",
    4: "Cerita ringkas apa yang berlaku.",
    4.4: "Pilih satu perkara untuk diteroka dahulu.",
    4.5: "Satu soalan ringkas supaya lebih jelas.",
    4.6: "Semak keselamatan kamu dahulu.",
    4.8: "Satu soalan susulan berdasarkan jawapan kamu.",
    4.7: "Kenal pasti orang dewasa yang boleh membantu.",
    5: "Cari fikiran yang paling kuat muncul.",
    6: "Lihat apa yang membuat fikiran itu terasa betul.",
    7: "Lihat juga sudut lain yang mungkin membantu.",
    8: "Bina fikiran baru yang lebih seimbang.",
    9: "Pilih tindakan kecil yang sesuai.",
    10: "Semak semula emosi selepas tindakan.",
    11: "Rumusan dan pelan kecil selepas ini."
  };
  const s = map[step] || "Langkah seterusnya.";
  return gradeMode() === "lower" ? simplify(s) : s;
}
function applyTheme() {
  document.body.classList.toggle("dark", !!themeToggle?.checked);
  setModeUI();
}
function applyTTS() {
  ttsEnabled = !!ttsToggle?.checked;
  if (ttsEnabled && !canTTS()) {
    ttsEnabled = false;
    if (ttsToggle) ttsToggle.checked = false;
    addMsg("Maaf, browser ini tidak menyokong suara. Cuba Chrome atau Edge ya.", "bot", { kind: "warn", text: "Suara" });
  }
}

// ====== Warm, emotion and CBT helpers ======
function warmOpeners() {
  return [
    "Tak apa kalau susah nak mula. Satu perkataan pun boleh.",
    "Di sini, kamu tak perlu jawab dengan sempurna.",
    "Kita boleh mula pelan-pelan ya.",
    "Saya akan dengar dulu, kita tak perlu cepat."
  ];
}
function reflectEmotion(emotion) {
  const e = String(emotion || "").trim();
  if (!e) return "";
  return pick([
    `Saya dengar kamu rasa “${e}”.`,
    `Baik, saya nampak perasaan “${e}” itu sedang kuat.`,
    `Oh… kamu rasa “${e}” sekarang.`,
    `Perasaan “${e}” itu memang penting.`
  ]);
}
function validateEmotion(emotion) {
  const e = normalize(emotion);
  if (e.includes("takut")) return "Rasa takut itu boleh difahami bila sesuatu terasa tak selamat.";
  if (e.includes("marah")) return "Marah boleh difahami apabila sesuatu terasa tidak adil.";
  if (e.includes("sedih")) return "Sedih boleh terasa berat. Terima kasih sebab berani cerita.";
  if (e.includes("risau") || e.includes("stress")) return "Bila risau, fikiran boleh jadi laju. Kita cuba satu demi satu.";
  if (e.includes("malu")) return "Bila malu, kita mungkin rasa nak sorok. Kamu tak keseorangan.";
  if (e.includes("keliru")) return "Keliru pun okay. Kadang-kadang perasaan bercampur-campur.";
  return "Perasaan kamu penting, dan saya sedang mendengar.";
}
function praiseSmall() {
  return pick([
    "Terima kasih sebab kongsi. Itu berani. 🌟",
    "Bagus. Kamu sedang cuba, dan itu penting. 👍",
    "Terima kasih kerana berani bercerita. 🌈",
    "Walaupun kecil, langkah ini tetap baik. 💛"
  ]);
}
function gentleBridge() {
  return pick([
    "Kita buat satu langkah kecil dulu ya.",
    "Saya ada di sini, kita jalan satu-satu.",
    "Kita tak perlu cepat. Kita cuma perlu mula."
  ]);
}
function naturalTransition(next) {
  const bank = {
    emotion: ["Mula-mula, saya nak faham rasa kamu dulu.", "Kita tengok emosi kamu dulu ya."],
    scale: ["Jom tengok kuat mana rasa itu sekarang.", "Kita bagi skor kecil supaya lebih jelas."],
    situation: ["Sekarang boleh cerita apa yang berlaku?", "Kalau kamu sedia, cerita sikit apa yang jadi."],
    thought: ["Bila itu berlaku, fikiran apa yang paling kuat muncul?", "Sekarang kita tengok apa yang otak kamu cakap masa itu."],
    action: ["Sekarang kita cari satu langkah kecil yang boleh dibuat.", "Mari cari langkah yang sesuai dengan keadaan kamu."]
  };
  return pick(bank[next] || ["Jom sambung langkah seterusnya."]);
}
function microCheckLine() { return "Kalau saya tersalah faham, kamu boleh betulkan saya ya."; }
function handleIDontKnow(text) {
  const t = normalize(text);
  return ["tak tahu", "tak pasti", "entahlah", "idk", "x tau", "xtau", "saya tak tahu", "tak tahu la", "malas cakap", "tak nak cakap"].includes(t);
}
// ====== Smart v3.1: session-only conversation memory ======
// This memory stays in the current session unless selected fields are included in the summary.
function rememberSmartAnswer(step, answer, source) {
  if (!state) return;
  if (!state.smartMemory) state.smartMemory = { turns: [], byStep: {} };
  const key = String(step);
  const item = { step: key, answer: shorten(answer, 280), source: source || INPUT_SOURCE.TYPED };
  state.smartMemory.turns.push(item);
  if (state.smartMemory.turns.length > 40) state.smartMemory.turns.shift();
  state.smartMemory.byStep[key] = item.answer;
  state.smartMemory.lastAnswer = item.answer;
}

function getRecentStudentAnswers(limit = 4) {
  const turns = state?.smartMemory?.turns || [];
  return turns.slice(-limit).map(x => x.answer).filter(Boolean);
}

function removeNegatedHarmMentions(text) {
  // Remove only clear denials of harm-related actions. Phrases such as
  // "tak berhenti mengejek" remain because the negation is about stopping,
  // not about the harmful act itself.
  let t = normalize(canonicalizeUserText(text));
  const rules = [
    /\b(?:saya|aku|dia|mereka|kawan(?: saya)?|orang itu)?\s*(?:tak|tidak|bukan|belum)(?:\s+pernah)?\s+(?:(?:kena|mengalami|melakukan|buat)\s+)?(?:dipukul|pukul|dibuli|buli|diejek|ejek|ditampar|tampar|ditendang|tendang|diugut|ugut|didera|dera|diganggu|ganggu|mengganggu|ditarik tudung|peras ugut)\b/gi,
    /\b(?:tak|tidak|bukan|belum)(?:\s+pernah)?\s+(?:berlaku|terjadi)\s+(?:buli|pukul|gangguan|ejekan|ugutan)\b/gi,
    /\b(?:tak|tidak)\s+ada\s+(?:orang(?:\s+yang)?\s+)?(?:memukul|pukul|mengugut|ugut|mengejek|ejek|membuli|buli)\b/gi,
    /\b(?:saya|aku)\s+(?:tak|tidak|bukan)\s+(?:rasa\s+)?(?:takut balik rumah|takut untuk balik rumah)\b/gi,
    /\bi\s+(?:am\s+)?not\s+(?:afraid|scared)\s+to\s+go\s+home\b/gi,
    /\b(?:my friend|he|she|they|someone)\s+(?:did not|didn't|does not|doesn't|never)\s+(?:hit|slap|kick|bully|tease|threaten|hurt)\b/gi,
    /\b(?:i|we)\s+(?:was not|wasn't|were not|weren't|am not)\s+(?:hit|bullied|threatened|hurt)\b/gi
  ];
  for (const pattern of rules) t = t.replace(pattern, " ");
  return t.replace(/\s+/g, " ").trim();
}

function isExplicitSelfHarmDenial(text) {
  const t = normalize(canonicalizeUserText(text));
  const malay = /\b(?:saya|aku)\s+(?:tak|tidak|bukan|belum)\s+(?:mahu|nak|akan|berniat|terfikir untuk)\s+(?:bunuh diri|mencederakan diri|cedera diri|potong diri|gantung diri)\b/.test(t);
  const english = /\b(?:i|i'm|i am)\s+(?:do not|don't|will not|won't)\s+(?:want to )?(?:kill myself|hurt myself|cut myself|harm myself)\b/.test(t);
  return malay || english;
}

function emotionGroup(emotion) {
  const e = normalize(emotion);
  if (e.includes("sedih") || e.includes("kecewa") || e.includes("sunyi")) return "sad";
  if (e.includes("risau") || e.includes("cemas") || e.includes("stress") || e.includes("keliru")) return "anx";
  if (e.includes("marah")) return "angry";
  if (e.includes("takut")) return "fear";
  if (e.includes("malu")) return "shame";
  if (e.includes("neutral") || e.includes("biasa")) return "neutral";
  return "unknown";
}
function situationTone(situation) {
  const t = normalize(situation);
  const neutral = ["biasa-biasa", "biasa je", "ok je", "tak ada apa", "saja", "normal je", "tak apa"];
  const positive = ["gembira", "seronok", "happy", "best", "lega", "syukur"];
  const stressful = ["diejek", "ejek", "buli", "dibuli", "malu", "tak nak sekolah", "takut", "menangis", "sedih", "marah", "risau", "cemas", "panik", "ugut", "pukul", "kasar", "dimarah", "jerit", "sunyi", "penat", "stress"];
  if (stressful.some(w => t.includes(w))) return "stress";
  if (positive.some(w => t.includes(w))) return "positive";
  if (neutral.some(w => t.includes(w))) return "neutral";
  return t.length <= 3 ? "neutral" : "unknown";
}
function detectEmotionsFromSituation(situation, scenarioKey) {
  const t = normalize(situation);
  const score = { Takut: 0, Risau: 0, Sedih: 0, Marah: 0, Malu: 0, Stress: 0, Neutral: 0 };
  const add = (e, n) => { score[e] = (score[e] || 0) + n; };
  if (["takut", "cemas", "panik", "ugut", "ancam", "tak selamat"].some(w => t.includes(w))) add("Takut", 3);
  if (["risau", "exam", "peperiksaan", "markah", "ujian", "stress", "tertekan"].some(w => t.includes(w))) add("Risau", 3);
  if (["sedih", "menangis", "sunyi", "tak ada kawan", "kecewa", "tersisih"].some(w => t.includes(w))) add("Sedih", 3);
  if (["marah", "geram", "benci", "tak adil"].some(w => t.includes(w))) add("Marah", 3);
  if (["malu", "diejek", "hina", "ketawa", "ejek"].some(w => t.includes(w))) add("Malu", 3);
  if (t.includes("stress")) add("Stress", 3);
  if (scenarioKey === "bully") { add("Takut", 1); add("Malu", 1); }
  if (scenarioKey === "exam") { add("Risau", 2); add("Stress", 1); }
  if (scenarioKey === "friend") add("Sedih", 2);
  if (scenarioKey === "teacher") add("Takut", 1);
  if (scenarioKey === "family") add("Sedih", 1);
  return Object.entries(score).sort((a, b) => b[1] - a[1]).filter((x, i) => x[1] > 0 && (i === 0 || x[1] >= 3)).slice(0, 2).map(x => x[0]);
}
function needsConsistencyCheck(currentEmotion, situation) {
  const eg = emotionGroup(currentEmotion);
  const st = situationTone(situation);
  const strong = eg !== "neutral" && eg !== "unknown";
  return (strong && (st === "neutral" || st === "positive")) || (eg === "neutral" && st === "stress");
}
function empathyExpandSituation(emotion, situation) {
  const emo = String(emotion || "tak sedap hati").trim();
  const sShort = shorten(situation || "", 105);
  const phrases = {
    sad: "Bila sedih, hati boleh rasa berat. Itu boleh difahami.",
    anx: "Bila risau, fikiran boleh jadi laju dan badan terasa tegang.",
    angry: "Bila marah, hati boleh rasa panas. Kita boleh faham perasaan itu tanpa terus bertindak.",
    fear: "Bila takut, badan boleh rasa tegang atau tak selesa.",
    shame: "Bila malu, kita mungkin rasa nak sembunyi. Tetapi kamu tetap berharga."
  };
  return [
    `Terima kasih sebab bercerita. ${reflectEmotion(emo)}`,
    sShort ? `Cerita kamu: “${sShort}”.` : "",
    phrases[emotionGroup(emo)] || "Terima kasih kerana berkongsi; saya sedang cuba memahami cerita kamu."
  ].filter(Boolean).join("\n");
}

// ====== Smart situation understanding ======
function detectIssueType(situation, scenarioKey) {
  const t = removeNegatedHarmMentions(situation);
  const has = words => words.some(w => t.includes(w));
  if (has([
    "buli", "dibuli", "ejek", "diejek", "hina", "menghina", "ugut", "diugut",
    "pukul", "dipukul", "kena pukul", "tampar", "ditampar", "tendang", "ditendang",
    "tarik tudung", "minta duit", "mintak duit", "paksa", "peras ugut", "baling air",
    "ganggu", "tolak saya", "ditolak", "tolak-tolak", "menyakitkan saya",
    "made fun of me", "making fun of me", "teased me", "keep teasing me",
    "bullied me", "being bullied", "classmates laugh at me", "they laugh at me",
    "hit me", "slapped me", "kicked me", "threatened me", "pushed me",
    "forced me to give money", "made me give money"
  ])) return "bully";
  if (has(["exam", "peperiksaan", "ujian", "markah", "kerja sekolah", "tugasan", "latihan", "ulangkaji", "ulang kaji", "homework", "tak sempat belajar"])) return "exam";
  if (has(["cikgu", "guru", "dimarah", "kena marah", "ditegur", "jerit pada saya", "cikgu marah"])) return "teacher";
  if (has(["ibu", "ayah", "mak", "bapa", "keluarga", "rumah", "adik", "abang", "kakak", "ibu bapa", "bergaduh di rumah"])) return "family";
  if (has(["kawan", "tak ajak", "tak nak kawan", "tinggalkan saya", "main bersama", "bergaduh", "salah faham", "tak layan", "tak reply", "dipulau", "tak mahu main", "tak mahu berkawan", "tak diajak"])) return "friend";
  return ({ exam: "exam", bully: "bully", friend: "friend", teacher: "teacher", family: "family", other: "other" })[scenarioKey] || "other";
}

function issueTypeLabel(type) {
  const labels = {
    bully: "Buli / gangguan",
    friend: "Hubungan dengan kawan",
    exam: "Peperiksaan / kerja sekolah",
    teacher: "Perkara berkaitan cikgu",
    family: "Keluarga / di rumah",
    other: "Perkara lain"
  };
  return labels[type] || labels.other;
}

// Detect more than one concern without treating every mention of a person as an issue.
// Bullying is kept as a priority route when an actual harm/harassment word appears.
function detectIssueTypes(situation, scenarioKey) {
  const t = removeNegatedHarmMentions(situation);
  const found = [];
  const has = words => words.some(w => t.includes(w));
  const add = type => { if (!found.includes(type)) found.push(type); };

  if (has([
    "buli", "dibuli", "ejek", "diejek", "hina", "menghina", "ugut", "diugut",
    "pukul", "dipukul", "kena pukul", "tampar", "ditampar", "tendang", "ditendang",
    "tarik tudung", "minta duit", "mintak duit", "paksa beri duit", "peras ugut",
    "baling air", "ditolak", "tolak-tolak", "ganggu saya", "mengganggu saya",
    "made fun of me", "making fun of me", "teased me", "keep teasing me",
    "bullied me", "being bullied", "classmates laugh at me", "they laugh at me",
    "hit me", "slapped me", "kicked me", "threatened me", "pushed me",
    "forced me to give money", "made me give money"
  ])) add("bully");
  if (has(["exam", "peperiksaan", "ujian", "markah", "kerja sekolah", "tugasan", "latihan", "ulangkaji", "ulang kaji", "homework", "tak sempat belajar"])) add("exam");
  if (has(["cikgu marah", "cikgu menjerit", "kena marah", "dimarah cikgu", "dimarahi cikgu", "ditegur cikgu", "cikgu tegur", "cikgu memalukan", "cikgu buat saya takut"])) add("teacher");
  const familyWords = has(["ibu saya", "mak saya", "ayah saya", "keluarga saya", "ibu bapa", "di rumah", "kat rumah", "adik saya", "abang saya", "kakak saya", "bergaduh di rumah", "takut balik rumah"]);
  if (familyWords && !t.includes("nama bapa")) add("family");
  if (has(["tak ajak", "tak nak kawan", "tinggalkan saya", "main bersama", "bergaduh dengan kawan", "salah faham dengan kawan", "tak layan", "tak reply", "dipulau", "tak mahu main", "tak mahu berkawan", "tak diajak", "tak ajak saya", "kawan menjauh", "kawan tak bercakap dengan saya"])) add("friend");

  if (!found.length) {
    const fallback = ({ exam: "exam", bully: "bully", friend: "friend", teacher: "teacher", family: "family", other: "other" })[scenarioKey] || "other";
    found.push(fallback);
  }
  const order = ["bully", "family", "teacher", "friend", "exam", "other"];
  return found.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function classifyShortResponse(text) {
  const t = normalize(canonicalizeUserText(text))
    .replace(/[.!?,…]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "unknown";

  // Check the exact input and a version without common first-person lead-ins.
  // This recognises everyday replies such as “Saya tak nak cerita lagi”.
  const variants = [
    t,
    t.replace(/^(?:saya rasa|saya|aku|i am|i'm|i)\s+/i, "").trim()
  ].filter(Boolean);
  const preferNot = [
    "tak nak cakap", "tak mahu cakap", "tak nak cerita", "tak mahu cerita",
    "tak nak jawab", "tak mahu jawab", "belum bersedia", "tak selesa cerita",
    "rahsia", "tak mahu kongsi", "tak nak kongsi", "i don't want to talk",
    "i do not want to talk", "i don't want to share", "i am not ready", "not comfortable sharing"
  ];
  if (preferNot.some(x => variants.some(v => v === x || v.startsWith(x + " ")))) return "prefer";

  const neutral = [
    "biasa", "biasa-biasa", "biasa-biasa saja", "biasa saja", "biasa je",
    "biasa-biasa je", "ok", "okay", "ok je", "okay je", "tak ada apa",
    "takde apa", "normal", "normal je", "nothing", "nothing is wrong",
    "no issue", "fine", "just normal"
  ];
  if (variants.some(v => neutral.includes(v))) return "neutral";
  if (variants.some(v => handleIDontKnow(v) || ["entah", "hmm", "err", "tak pasti lagi", "susah nak cakap"].includes(v))) return "unknown";
  if (t.length <= 2) return "unknown";
  return "content";
}

function clarifyRetryOptions(issueType) {
  const bank = {
    friend: [
      { label: "Saya mahu mereka ajak saya bermain", value: "Saya mahu mereka ajak saya bermain" },
      { label: "Saya mahu mereka berhenti mengejek", value: "Saya mahu mereka berhenti mengejek" },
      { label: "Saya mahu ada kawan untuk berbual", value: "Saya mahu ada kawan untuk berbual" },
      { label: "Saya belum pasti", value: "Tak pasti" }
    ],
    exam: [
      { label: "Saya takut markah rendah", value: "Saya takut markah rendah" },
      { label: "Saya tak faham topik", value: "Saya tak faham topik" },
      { label: "Masa belajar tak cukup", value: "Masa belajar tak cukup" },
      { label: "Saya belum pasti", value: "Tak pasti" }
    ],
    teacher: [
      { label: "Saya malu apabila ditegur", value: "Saya malu apabila ditegur" },
      { label: "Saya takut dimarah lagi", value: "Saya takut dimarah lagi" },
      { label: "Saya tak faham teguran", value: "Saya tak faham teguran" },
      { label: "Saya belum pasti", value: "Tak pasti" }
    ],
    other: [
      { label: "Hari ini", value: "Hari ini" },
      { label: "Semasa di sekolah", value: "Semasa di sekolah" },
      { label: "Sudah beberapa kali", value: "Sudah beberapa kali" },
      { label: "Saya belum pasti", value: "Tak pasti" }
    ]
  };
  return bank[issueType] || bank.other;
}

function smartFollowUpData(issueType) {
  const bank = {
    bully: {
      question: "Perkara ini masih berlaku sekarang atau sudah berhenti?",
      options: [
        { label: "Masih berlaku sekarang", value: "Masih berlaku sekarang" },
        { label: "Kadang-kadang masih berlaku", value: "Kadang-kadang masih berlaku" },
        { label: "Sudah berhenti", value: "Sudah berhenti" },
        { label: "Tak pasti", value: "Tak pasti" }
      ]
    },
    friend: {
      question: "Apa yang paling kamu harap kawan-kawan buat?",
      options: [
        { label: "Ajak saya bermain sekali", value: "Saya harap mereka ajak saya bermain sekali" },
        { label: "Dengar dan faham saya", value: "Saya harap mereka dengar dan faham saya" },
        { label: "Berhenti cakap sesuatu yang menyakitkan", value: "Saya harap mereka berhenti cakap sesuatu yang menyakitkan" },
        { label: "Tak pasti", value: "Tak pasti" }
      ]
    },
    exam: {
      question: "Apa yang paling merisaukan kamu tentang peperiksaan atau kerja sekolah?",
      options: [
        { label: "Takut gagal atau markah rendah", value: "Saya takut gagal atau dapat markah rendah" },
        { label: "Ada topik yang saya tak faham", value: "Ada topik yang saya tak faham" },
        { label: "Tak cukup masa untuk belajar", value: "Saya rasa tak cukup masa untuk belajar" },
        { label: "Belum cukup bersedia", value: "Saya belum cukup bersedia" }
      ]
    },
    teacher: {
      question: "Apa yang paling mengganggu kamu apabila cikgu marah atau menegur?",
      options: [
        { label: "Cara cikgu bercakap", value: "Cara cikgu bercakap membuat saya terganggu" },
        { label: "Ditegur di depan orang", value: "Saya malu apabila ditegur di depan orang" },
        { label: "Saya takut dimarah lagi", value: "Saya takut dimarah lagi" },
        { label: "Saya tak faham apa kesalahan saya", value: "Saya tak faham apa kesalahan saya" }
      ]
    },
    family: {
      question: "Sekarang, kamu rasa selamat di rumah?",
      options: [
        { label: "Ya, saya rasa selamat", value: "Ya, saya rasa selamat di rumah" },
        { label: "Tidak, saya rasa tak selamat", value: "Tidak, saya tak rasa selamat di rumah" },
        { label: "Saya tak pasti", value: "Saya tak pasti" }
      ]
    },
    other: {
      question: "Perkara ini biasanya berlaku bila?",
      options: [
        { label: "Hari ini", value: "Hari ini" },
        { label: "Semasa di sekolah", value: "Semasa di sekolah" },
        { label: "Apabila saya bersendirian", value: "Apabila saya bersendirian" },
        { label: "Sudah beberapa kali", value: "Sudah beberapa kali" },
        { label: "Tak pasti", value: "Tak pasti" }
      ]
    }
  };
  return bank[issueType] || bank.other;
}
// ====== Smart v3.2: one answer-led follow-up, then move forward ======
function smartSecondFollowUp(issueType, answer) {
  const a = normalize(answer || "");
  if (issueType === "bully") {
    if (a.includes("sudah berhenti") || a.includes("telah berhenti")) {
      return {
        question: "Walaupun perkara itu sudah berhenti, adakah ia masih mengganggu perasaan kamu sekarang?",
        options: [
          { label: "Ya, saya masih teringat atau terganggu", value: "Ya, saya masih teringat atau terganggu" },
          { label: "Kadang-kadang saya teringat", value: "Kadang-kadang saya teringat" },
          { label: "Tidak begitu mengganggu sekarang", value: "Tidak begitu mengganggu sekarang" },
          { label: "Saya belum pasti", value: "Tak pasti" }
        ]
      };
    }
    // If it is ongoing or unclear, safety routing takes priority instead.
    return null;
  }
  if (issueType === "friend") {
    return {
      question: "Bila perkara itu berlaku, apa yang biasanya kamu buat?",
      options: [
        { label: "Saya diam atau menjauh", value: "Saya biasanya diam atau menjauh" },
        { label: "Saya cuba ajak mereka bercakap atau bermain", value: "Saya cuba ajak mereka bercakap atau bermain" },
        { label: "Saya cari kawan lain atau orang yang saya percaya", value: "Saya cari kawan lain atau orang yang saya percaya" },
        { label: "Saya belum pasti", value: "Tak pasti" }
      ]
    };
  }
  if (issueType === "exam") {
    if (a.includes("topik") || a.includes("tak faham")) {
      return {
        question: "Bila jumpa topik yang susah, apa yang paling membantu kamu?",
        options: [
          { label: "Cikgu terangkan semula", value: "Saya perlukan cikgu terangkan semula" },
          { label: "Buat latihan satu demi satu", value: "Saya mahu buat latihan satu demi satu" },
          { label: "Belajar bersama orang yang boleh membantu", value: "Saya mahu belajar bersama orang yang boleh membantu" },
          { label: "Saya belum pasti", value: "Tak pasti" }
        ]
      };
    }
    if (a.includes("masa") || a.includes("tak cukup masa")) {
      return {
        question: "Apa yang biasanya paling mengganggu masa kamu untuk belajar?",
        options: [
          { label: "Saya penat selepas sekolah", value: "Saya penat selepas sekolah" },
          { label: "Banyak kerja sekolah", value: "Kerja sekolah saya banyak" },
          { label: "Telefon atau permainan mudah mengganggu", value: "Telefon atau permainan mudah mengganggu saya" },
          { label: "Saya belum pasti", value: "Tak pasti" }
        ]
      };
    }
    return {
      question: "Apakah satu bantuan kecil yang paling berguna untuk persediaan kamu?",
      options: [
        { label: "Buat jadual belajar yang ringkas", value: "Saya mahu buat jadual belajar ringkas" },
        { label: "Minta cikgu bantu topik yang susah", value: "Saya mahu minta cikgu bantu topik yang susah" },
        { label: "Mulakan satu latihan dahulu", value: "Saya mahu mulakan satu latihan dahulu" },
        { label: "Saya belum pasti", value: "Tak pasti" }
      ]
    };
  }
  if (issueType === "teacher") {
    return {
      question: "Apa yang kamu perlukan supaya keadaan itu lebih mudah dihadapi?",
      options: [
        { label: "Cikgu terangkan dengan lebih jelas", value: "Saya mahu cikgu terangkan dengan lebih jelas" },
        { label: "Ditegur secara peribadi jika sesuai", value: "Saya lebih selesa jika ditegur secara peribadi" },
        { label: "Bantuan guru yang saya percaya", value: "Saya mahu bantuan guru yang saya percaya" },
        { label: "Saya belum pasti", value: "Tak pasti" }
      ]
    };
  }
  if (issueType === "family") {
    return {
      question: "Memandangkan kamu rasa selamat sekarang, apa yang paling kamu harap dapat berubah di rumah?",
      options: [
        { label: "Cara kami bercakap antara satu sama lain", value: "Saya harap cara kami bercakap berubah" },
        { label: "Saya mahu perasaan saya didengar", value: "Saya mahu perasaan saya didengar" },
        { label: "Saya mahu bantuan orang dewasa yang saya percaya", value: "Saya mahu bantuan orang dewasa yang saya percaya" },
        { label: "Saya belum pasti", value: "Tak pasti" }
      ]
    };
  }
  return null;
}

async function continueAfterSmartFollowUp() {
  const answer = normalize(state.clarifyA || "");
  const safetyRelevant =
    (state.issueType === "bully" && /masih berlaku|kadang-kadang|tak pasti|tak tahu|berlaku sekarang|still happening|sometimes still|not sure|unsure|don't know|do not know/.test(answer)) ||
    (state.issueType === "family" && /tidak|tak rasa selamat|tak pasti|tak tahu|tidak selamat|\bno\b|not safe|not sure|unsure|don't know|do not know/.test(answer));
  if (safetyRelevant) {
    await proceedToThought();
    return;
  }

  const next = smartSecondFollowUp(state.issueType, state.clarifyA);
  if (!next) {
    await proceedToThought();
    return;
  }

  state.dynamicFollowUpQuestion = next.question;
  state.step = 4.8;
  state.dynamicRetryCount = 0;
  setProgress(4.8);
  await botSay(simplify(wrap([
    smartAnswerReflection(state.issueType, state.clarifyA),
    next.question,
    "Pilih jawapan yang paling dekat. Kamu juga boleh taip sendiri atau langkau soalan ini."
  ])), { kind: "info", text: "Soalan susulan berdasarkan jawapan kamu" });
  setOptions("Pilih jawapan:", [
    ...next.options,
    { label: "Saya nak taip sendiri", value: "__type_dynamic_followup__" },
    { label: "Langkau soalan ini", value: "__skip_dynamic_followup__" }
  ]);
}

function smartThoughtOptions(issueType, scenario) {
  const bank = {
    bully: [
      "Saya takut perkara ini berlaku lagi.",
      "Saya rasa saya tak selamat.",
      "Saya rasa semua ini salah saya.",
      "Saya rasa tiada siapa akan membantu saya."
    ],
    friend: [
      "Mereka tak mahu berkawan dengan saya.",
      "Saya rasa saya ditinggalkan.",
      "Saya takut perkara ini berlaku lagi."
    ],
    exam: [
      "Saya takut gagal.",
      "Saya rasa saya belum cukup bersedia.",
      "Saya risau saya tak dapat jawab soalan."
    ],
    teacher: [
      "Saya takut cikgu marah saya lagi.",
      "Saya rasa saya budak nakal.",
      "Saya rasa cikgu salah faham tentang saya."
    ],
    family: [
      "Saya rasa semuanya salah saya.",
      "Saya risau perkara ini akan berlaku lagi.",
      "Saya rasa tiada orang yang mendengar saya."
    ],
    other: (scenario && scenario.thoughtOptions) || [
      "Saya tak cukup bagus.", "Semua akan jadi teruk.", "Saya tak boleh buat apa-apa."
    ]
  };
  return bank[issueType] || bank.other;
}
function smartAnswerReflection(issueType, answer) {
  const a = normalize(answer);
  if (!a || a.includes("murid memilih untuk tidak menjawab")) return "";
  if (issueType === "friend") {
    if (a.includes("ajak saya bermain") || a.includes("ajak saya main")) return "Saya dengar kamu berharap dapat dilibatkan apabila mereka bermain. Betul begitu?";
    if (a.includes("dengar dan faham")) return "Nampaknya kamu mahu perasaan kamu didengar dan difahami.";
    if (a.includes("berhenti cakap") || a.includes("menyakitkan")) return "Kamu berharap kata-kata yang menyakitkan itu berhenti. Itu perkara yang wajar diberi perhatian.";
  }
  if (issueType === "exam") {
    if (a.includes("topik") || a.includes("tak faham")) return "Topik yang belum difahami nampaknya salah satu perkara yang membebankan kamu.";
    if (a.includes("masa") || a.includes("tak cukup masa")) return "Kamu nampaknya risau tentang masa yang ada untuk membuat persediaan.";
    if (a.includes("gagal") || a.includes("markah rendah")) return "Markah dan kemungkinan gagal nampaknya perkara yang paling merisaukan kamu.";
  }
  if (issueType === "teacher") {
    if (a.includes("depan orang") || a.includes("malu")) return "Ditegur di depan orang nampaknya membuat kamu rasa malu atau tidak selesa.";
    if (a.includes("takut dimarah")) return "Kamu nampaknya risau perkara itu akan berulang.";
    if (a.includes("tak faham")) return "Kamu mahu memahami apa yang perlu dibaiki, bukan sekadar dimarahi.";
  }
  if (issueType === "family") {
    if (a.includes("selamat di rumah")) return "Terima kasih kerana memberitahu saya tentang rasa selamat kamu.";
    if (a.includes("tak didengar") || a.includes("tidak didengar")) return "Kamu berharap ada orang yang mendengar apa yang kamu rasa.";
  }
  if (issueType === "bully") {
    if (a.includes("sudah berhenti")) return "Walaupun perkara itu sudah berhenti, kita boleh faham sama ada kesannya masih terasa.";
    if (a.includes("masih berlaku") || a.includes("kadang-kadang")) return "Saya ambil serius apabila kamu beritahu perkara itu masih berlaku.";
  }
  return `Saya dengar kamu berkata: “${shorten(answer, 90)}”. Kalau saya salah faham, kamu boleh betulkan saya.`;
}

function smartSituationReflection() {
  const t = shorten(state.situation || "", 110);
  const openings = {
    bully: "Terima kasih kerana beritahu saya. Jika seseorang mengganggu atau menyakiti kamu, itu bukan sesuatu yang perlu kamu tanggung seorang diri.",
    friend: "Apabila hubungan dengan kawan tak seperti yang kita harapkan, memang boleh timbul rasa tersisih atau kecewa. Kita cuba faham keadaan dahulu.",
    exam: "Tekanan peperiksaan boleh terasa berat. Kita cuba bezakan perkara yang sedang berlaku dengan perkara yang kamu bimbangkan.",
    teacher: "Apabila dimarah atau ditegur, kita boleh rasa takut, malu atau kecewa. Teguran tidak semestinya bermaksud kamu seorang murid yang teruk.",
    family: "Hal keluarga kadang-kadang terasa berat. Kita boleh bincang setakat yang kamu selesa, dan kamu tak perlu menyalahkan diri sendiri secara automatik.",
    other: "Terima kasih sebab bercerita. Kita cuba faham keadaan ini satu demi satu."
  };
  const recent = state.dynamicFollowUpA ? `Kamu juga berkongsi: “${shorten(state.dynamicFollowUpA, 95)}”.` : "";
  const clarify = state.clarifyA && !state.clarifyReflectionShown ? smartAnswerReflection(state.issueType, state.clarifyA) : "";
  return [openings[state.issueType] || openings.other, t ? `Cerita kamu: “${t}”.` : "", clarify, recent].filter(Boolean).join("\n");
}

function smartThoughtQuestion() {
  const a = normalize(state.clarifyA || "");
  if (state.issueType === "friend") return "Apabila kawan tidak mengajak kamu bermain atau tidak memberi respons seperti yang kamu harapkan, apa yang kamu mula fikir tentang diri kamu atau hubungan kamu dengan mereka?";
  if (state.issueType === "exam" && (a.includes("topik") || a.includes("tak faham"))) return "Bila kamu berdepan topik yang susah, apa yang kamu fikir tentang kemampuan kamu?";
  if (state.issueType === "exam" && (a.includes("masa") || a.includes("tak cukup masa"))) return "Bila kamu rasa masa belajar tak cukup, apa yang kamu paling takut akan berlaku?";
  if (state.issueType === "teacher" && (a.includes("depan orang") || a.includes("malu"))) return "Apabila ditegur di depan orang, apa yang kamu fikir orang lain atau cikgu fikir tentang kamu?";
  if (state.issueType === "teacher" && a.includes("tak faham")) return "Apabila kamu tak faham teguran cikgu, apa yang kamu fikir tentang diri atau keadaan itu?";
  if (state.issueType === "bully") return "Bila perkara itu berlaku atau kamu teringat tentangnya, apa fikiran paling kuat yang muncul?";
  if (state.issueType === "family") return "Bila perkara itu berlaku di rumah, apa fikiran paling kuat yang muncul dalam kepala kamu?";
  return "Bila perkara itu berlaku, apa fikiran paling kuat yang muncul dalam kepala kamu?";
}

// ====== Cognitive distortions and balanced thoughts ======
const DISTORTIONS = [
  { key: "all_or_nothing", name: "Hitam-putih", patterns: ["mesti", "selalu", "tak pernah", "semua", "langsung"] },
  { key: "catastrophizing", name: "Membesar-besarkan", patterns: ["teruk sangat", "habis", "hancur", "pasti gagal", "malu besar"] },
  { key: "mind_reading", name: "Membaca fikiran orang", patterns: ["mereka fikir", "dia fikir", "semua orang ketawa", "semua orang benci"] },
  { key: "labeling", name: "Melabel diri", patterns: ["saya bodoh", "saya teruk", "saya gagal", "saya lemah", "saya tak berguna"] },
  { key: "overgeneral", name: "Generalisasi melampau", patterns: ["setiap kali", "sentiasa", "semua kali"] },
  { key: "should", name: "‘Sepatutnya’ berat", patterns: ["sepatutnya", "patutnya"] }
];
function detectDistortion(thought) {
  const t = normalize(thought);
  return DISTORTIONS.find(d => d.patterns.some(p => t.includes(p))) || null;
}
function reframeSuggestions(distortion, thought) {
  const shortT = shorten(thought, 70);
  if (!distortion) return [
    "Mungkin ada cara. Saya cuba satu langkah kecil dulu.",
    "Saya belum boleh lagi, tapi saya sedang belajar.",
    "Ini susah, tapi saya boleh cuba satu-satu."
  ];
  switch (distortion.key) {
    case "all_or_nothing": return ["Tak perlu sempurna. Cukup cuba sedikit demi sedikit.", "Ada bahagian yang saya boleh buat, walaupun belum semua.", `Walaupun “${shortT}”, mungkin masih ada jalan tengah.`];
    case "catastrophizing": return ["Ini mungkin tak seteruk yang otak saya bayang.", "Kalau susah, saya masih boleh minta bantuan.", "Saya fokus pada apa yang boleh dibuat sekarang."];
    case "mind_reading": return ["Saya belum pasti apa orang fikir. Saya tak perlu meneka.", "Mungkin orang lain tak fikir seteruk itu.", "Saya boleh bercakap dengan orang yang baik."];
    case "labeling": return ["Satu kesilapan tak bermakna saya teruk.", "Saya murid yang sedang belajar.", "Saya boleh cuba lagi dengan cara baru."];
    case "overgeneral": return ["Ini satu situasi, bukan semua situasi.", "Kadang-kadang jadi, kadang-kadang tidak.", "Saya cari satu contoh yang berbeza."];
    case "should": return ["Saya boleh cuba, tapi saya tak perlu menekan diri kuat sangat.", "Saya berhak belajar perlahan-lahan.", "Saya pilih satu langkah yang saya mampu buat."];
    default: return reframeSuggestions(null, thought);
  }
}
function smartReframeSuggestions(issueType, distortion, thought) {
  const bank = {
    bully: [
      "Apa yang berlaku bukan bukti bahawa saya tidak berharga.",
      "Saya berhak rasa selamat dan mendapatkan bantuan.",
      "Saya tak perlu menyelesaikan masalah ini seorang diri."
    ],
    friend: [
      "Saya belum tahu sepenuhnya sebab mereka buat begitu.",
      "Rasa tersisih memang menyakitkan, tetapi itu tak bermakna saya tidak berharga.",
      "Saya boleh cuba bercakap dengan seorang kawan yang saya percaya."
    ],
    exam: [
      "Saya tak perlu kuasai semuanya sekali gus. Saya boleh mula dengan satu bahagian.",
      "Satu keputusan peperiksaan tidak menentukan nilai diri saya.",
      "Saya boleh minta bantuan tentang topik yang masih susah."
    ],
    teacher: [
      "Ditegur tidak bermakna saya seorang murid yang teruk.",
      "Saya boleh belajar daripada teguran tanpa menghina diri sendiri.",
      "Apabila keadaan tenang, saya boleh bertanya apa yang perlu saya baiki."
    ],
    family: [
      "Perasaan saya juga penting dan saya layak didengar.",
      "Saya tak perlu menanggung semua perkara seorang diri.",
      "Saya boleh mencari orang dewasa yang saya percaya untuk mendapatkan bantuan."
    ]
  };
  return bank[issueType] || reframeSuggestions(distortion, thought);
}

// ====== Safety detection ======
const RED_WORDS = [
  "bunuh diri", "nak mati", "cedera diri", "potong diri", "gantung diri",
  "rogol", "dera", "ugut bunuh", "nak cederakan diri", "tak nak hidup"
];
const ORANGE_WORDS = [
  "takut balik rumah", "selalu kena pukul", "kena pukul", "dipukul", "ditampar", "ditendang",
  "ditarik tudung", "dipaksa beri duit", "paksa beri duit", "peras ugut", "diugut", "diancam",
  "tak selamat", "panic", "cemas teruk", "dibuli setiap hari", "saya dah tak tahan", "takut jumpa dia"
];
const YELLOW_WORDS = ["sunyi sangat", "penat sangat", "tak ada siapa peduli", "tak nak datang sekolah", "semua salah saya"];
function safetyLevelFromText(text) {
  const original = normalize(canonicalizeUserText(text));
  const harmAware = removeNegatedHarmMentions(original);

  const selfHarmSignal = /\b(?:tak nak hidup|tak mahu hidup|nak mati|mahu mati|nak bunuh diri|mahu bunuh diri|cuba bunuh diri|bunuh diri sekarang|nak cederakan diri|mahu cederakan diri|potong diri|gantung diri|cedera diri|want to die|don't want to live|do not want to live|kill myself|suicide|self[- ]?harm|hurt myself|cut myself|hang myself)\b/.test(original);
  if (selfHarmSignal) {
    if (isExplicitSelfHarmDenial(original) && !/\b(?:tak nak hidup|tak mahu hidup|nak mati|mahu mati)\b/.test(original)) return "orange";
    return "red";
  }

  if (/\b(?:rogol|dirogol|dera|didera|ugut bunuh|diugut bunuh|rape|sexually abused)\b/.test(harmAware)) return "orange";

  const orangeWords = [
    "takut balik rumah", "selalu kena pukul", "kena pukul", "dipukul", "ditampar", "ditendang",
    "ditarik tudung", "dipaksa beri duit", "paksa beri duit", "peras ugut", "diugut", "diancam",
    "tak selamat", "tidak selamat", "dibuli setiap hari", "saya dah tak tahan", "takut jumpa dia",
    "pukul saya", "tak berhenti mengejek", "tak berhenti mengganggu", "masih mengejek",
    "masih mengganggu", "masih dibuli", "masih dipukul", "masih diugut",
    "hit me", "slapped me", "kicked me", "threatened me", "not safe", "don't feel safe",
    "do not feel safe", "unsafe", "afraid to go home", "forced to give money",
    "can't stop teasing", "won't stop teasing"
  ];
  if (orangeWords.some(w => harmAware.includes(w))) return "orange";

  const yellowWords = [
    "sunyi sangat", "penat sangat", "tak ada siapa peduli", "tiada siapa peduli",
    "tak nak datang sekolah", "semua salah saya", "saya rasa tak berharga",
    "panic", "panik", "cemas teruk", "sangat cemas", "terlalu risau"
  ];
  if (yellowWords.some(w => original.includes(w))) return "yellow";
  return "green";
}
function safetyResponse(level) {
  if (level === "red") return {
    tag: { kind: "danger", text: "Keselamatan dulu" },
    msg: simplify(wrap([
      "Saya sangat risau tentang keselamatan kamu.",
      "Tolong jangan hadapi ini seorang diri.",
      `Sekarang beritahu orang dewasa yang dipercayai: ${SCHOOL_HELP.trustedAdult}.`,
      `Jika berada di sekolah, pergi ke ${SCHOOL_HELP.safePlace}. Jika bahaya berlaku sekarang, dapatkan bantuan orang dewasa dengan segera.`
    ]))
  };
  if (level === "orange") return {
    tag: { kind: "warn", text: "Perlu bantuan orang dewasa" },
    msg: simplify(wrap([
      "Terima kasih sebab beritahu. Saya ambil serius perkara yang kamu kongsi.",
      `Saya galakkan kamu beritahu ${SCHOOL_HELP.trustedAdult} dan pergi ke ${SCHOOL_HELP.safePlace}.`,
      "Kamu tak perlu menyelesaikan perkara ini seorang diri."
    ]))
  };
  if (level === "yellow") return {
    tag: { kind: "warn", text: "Saya dengar ini berat" },
    msg: simplify(wrap([
      "Saya dengar hati kamu sedang sangat penat.",
      "Kita boleh teruskan perlahan-lahan. Jika boleh, beritahu juga orang dewasa yang kamu percaya."
    ]))
  };
  return null;
}

// ====== Guides / tools ======
const GUIDES = {
  "Nafas Pelangi (Nafas 4-4-4 × 5 kali)": ["🌈 Nafas Pelangi", "Tarik nafas 4 kiraan.", "Tahan 4 kiraan.", "Hembus 4 kiraan.", "Ulang 5 kali."],
  "Jejak Tenang (Grounding 5-4-3-2-1)": ["🌿 Jejak Tenang", "5 benda kamu nampak.", "4 benda kamu sentuh.", "3 bunyi kamu dengar.", "2 bau kamu hidu.", "1 perkara yang kamu syukuri."],
  "Langkah Kecil Berani (Pecahkan tugas jadi 1 langkah kecil)": ["🧩 Langkah Kecil Berani", "Tulis tugasan.", "Pecah jadi bahagian kecil.", "Buat satu bahagian selama 5 minit.", "Rehat sekejap, kemudian sambung jika mampu."],
  "Tiga Risau, Satu Langkah (Tulis 3 risau → pilih 1 langkah kecil)": ["✍️ Tiga Risau, Satu Langkah", "Tulis 3 perkara yang kamu risau.", "Pilih 1 yang paling ringan.", "Buat 1 langkah kecil."],
  "Butang Bertenang (Stop–Nafas–Pilih)": ["🛑 Butang Bertenang", "STOP 3 saat.", "Tarik dan hembus nafas perlahan 3 kali.", "Pilih 1 tindakan yang baik."],
  "Rehat Lembut (Minum air & rehat 2 minit)": ["💧 Rehat Lembut", "Minum beberapa teguk air.", "Rehatkan bahu.", "Pandang satu tempat dan kira 20 saat."],
  "Sudut Selamat (Pergi tempat selamat)": ["🛡️ Sudut Selamat", `Pergi ke: ${SCHOOL_HELP.safePlace}.`, `Jumpa: ${SCHOOL_HELP.trustedAdult}.`, "Cakap: ‘Cikgu, saya perlukan bantuan.’"],
  "Ayat Baik untuk Diri (Cakap baik dengan diri)": ["💛 Ayat Baik untuk Diri", "Letak tangan di dada jika selesa.", "Cakap perlahan: ‘Saya sedang susah, tapi saya masih berharga.’", "Ulang 3 kali."],
  "Jambatan Kawan (Ayat mula semula dengan kawan)": ["🧑‍🤝‍🧑 Jambatan Kawan", "Contoh ayat:", "‘Saya masih nak berkawan, boleh kita cakap elok-elok?’", "‘Boleh kita cuba faham satu sama lain?’"],
  "Lima Minit Dulu (Buat 5 minit ulang kaji sahaja)": ["📚 Lima Minit Dulu", "Ambil satu buku sahaja.", "Buat 5 minit dahulu.", "Tanda satu bahagian yang siap.", "Rehat, kemudian sambung jika mampu."],
  "Catat & Beritahu (Tulis apa yang berlaku & jumpa cikgu)": ["📝 Catat & Beritahu", "Tulis ringkas apa yang berlaku, jika selamat untuk berbuat demikian.", "Catat siapa terlibat dan bila berlaku.", "Tunjukkan kepada cikgu atau kaunselor yang dipercayai."]
};
const TOOLBOX = {
  Risau: [
    { label: "🌈 Nafas Pelangi", value: "Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
    { label: "🌿 Jejak Tenang", value: "Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label: "🧩 Langkah Kecil Berani", value: "Langkah Kecil Berani (Pecahkan tugas jadi 1 langkah kecil)" },
    { label: "✍️ Tiga Risau, Satu Langkah", value: "Tiga Risau, Satu Langkah (Tulis 3 risau → pilih 1 langkah kecil)" },
    { label: "💛 Ayat Baik untuk Diri", value: "Ayat Baik untuk Diri (Cakap baik dengan diri)" },
    { label: "🗣️ Ayat minta tolong", value: "__help_script__" }
  ],
  Marah: [
    { label: "🛑 Butang Bertenang", value: "Butang Bertenang (Stop–Nafas–Pilih)" },
    { label: "💧 Rehat Lembut", value: "Rehat Lembut (Minum air & rehat 2 minit)" },
    { label: "🌿 Jejak Tenang", value: "Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label: "💛 Ayat Baik untuk Diri", value: "Ayat Baik untuk Diri (Cakap baik dengan diri)" },
    { label: "🗣️ Ayat minta tolong", value: "__help_script__" }
  ],
  Sedih: [
    { label: "🌈 Nafas Pelangi", value: "Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
    { label: "🌿 Jejak Tenang", value: "Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label: "💧 Rehat Lembut", value: "Rehat Lembut (Minum air & rehat 2 minit)" },
    { label: "💛 Ayat Baik untuk Diri", value: "Ayat Baik untuk Diri (Cakap baik dengan diri)" },
    { label: "🗣️ Ayat minta tolong", value: "__help_script__" }
  ],
  Takut: [
    { label: "🛡️ Sudut Selamat", value: "Sudut Selamat (Pergi tempat selamat)" },
    { label: "🌈 Nafas Pelangi", value: "Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
    { label: "🌿 Jejak Tenang", value: "Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label: "📝 Catat & Beritahu", value: "Catat & Beritahu (Tulis apa yang berlaku & jumpa cikgu)" },
    { label: "🗣️ Ayat minta tolong", value: "__help_script__" }
  ],
  Malu: [
    { label: "🌈 Nafas Pelangi", value: "Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
    { label: "🌿 Jejak Tenang", value: "Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label: "💧 Rehat Lembut", value: "Rehat Lembut (Minum air & rehat 2 minit)" },
    { label: "💛 Ayat Baik untuk Diri", value: "Ayat Baik untuk Diri (Cakap baik dengan diri)" },
    { label: "🗣️ Ayat minta tolong", value: "__help_script__" }
  ],
  Neutral: [
    { label: "💧 Rehat Lembut", value: "Rehat Lembut (Minum air & rehat 2 minit)" },
    { label: "🌈 Nafas Pelangi", value: "Nafas Pelangi (Nafas 4-4-4 × 5 kali)" }
  ]
};
function toolboxFor(emotion) {
  const e = normalize(emotion);
  if (e.includes("risau") || e.includes("stress") || e.includes("keliru")) return TOOLBOX.Risau;
  if (e.includes("marah")) return TOOLBOX.Marah;
  if (e.includes("sedih")) return TOOLBOX.Sedih;
  if (e.includes("takut")) return TOOLBOX.Takut;
  if (e.includes("malu")) return TOOLBOX.Malu;
  return TOOLBOX.Neutral;
}
function scenarioBoostTools(scenarioKey, emotion) {
  const extra = {
    exam: [
      { label: "📚 Lima Minit Dulu", value: "Lima Minit Dulu (Buat 5 minit ulang kaji sahaja)" },
      { label: "🧩 Langkah Kecil Berani", value: "Langkah Kecil Berani (Pecahkan tugas jadi 1 langkah kecil)" }
    ],
    bully: [
      { label: "🛡️ Sudut Selamat", value: "Sudut Selamat (Pergi tempat selamat)" },
      { label: "📝 Catat & Beritahu", value: "Catat & Beritahu (Tulis apa yang berlaku & jumpa cikgu)" }
    ],
    friend: [
      { label: "🧑‍🤝‍🧑 Jambatan Kawan", value: "Jambatan Kawan (Ayat mula semula dengan kawan)" },
      { label: "💛 Ayat Baik untuk Diri", value: "Ayat Baik untuk Diri (Cakap baik dengan diri)" }
    ],
    teacher: [{ label: "💧 Rehat Lembut", value: "Rehat Lembut (Minum air & rehat 2 minit)" }],
    family: [
      { label: "🌈 Nafas Pelangi", value: "Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
      { label: "📝 Catat & Beritahu", value: "Catat & Beritahu (Tulis apa yang berlaku & jumpa cikgu)" }
    ],
    other: []
  };
  const merged = [...(extra[scenarioKey] || []), ...toolboxFor(emotion)];
  const seen = new Set();
  return merged.filter(item => { if (seen.has(item.value)) return false; seen.add(item.value); return true; });
}

// ====== Scenarios ======
const SCENARIOS = {
  exam: { name: "Peperiksaan / Kerja Sekolah", example: "Saya risau bila exam sebab takut salah banyak.", thoughtOptions: ["Saya mesti dapat A, kalau tak saya gagal.", "Saya akan lupa semua.", "Saya memang tak pandai.", "Saya akan kecewakan cikgu atau ibu bapa."] },
  bully: { name: "Buli / Diejek", example: "Saya malu dan takut sebab ada orang ejek saya.", thoughtOptions: ["Mereka semua ketawakan saya.", "Saya tak selamat di sekolah.", "Tak ada siapa akan tolong saya.", "Ini salah saya."] },
  friend: { name: "Kawan / Bergaduh", example: "Saya sedih sebab kawan tak nak main dengan saya.", thoughtOptions: ["Mereka tak suka saya.", "Saya tak penting.", "Saya tak ada kawan.", "Saya akan keseorangan."] },
  teacher: { name: "Dimarah Cikgu", example: "Saya takut bila cikgu marah saya.", thoughtOptions: ["Cikgu benci saya.", "Saya budak nakal.", "Saya memang teruk."] },
  family: { name: "Keluarga / Di rumah", example: "Saya sedih atau risau di rumah sebab dimarah.", thoughtOptions: ["Ini semua salah saya.", "Mereka tak sayang saya.", "Saya tak berguna."] },
  other: { name: "Lain-lain", example: "Saya rasa risau tentang sesuatu di sekolah.", thoughtOptions: ["Saya tak cukup bagus.", "Semua akan jadi teruk.", "Saya tak boleh buat apa-apa."] }
};

// ====== State ======
function resetState() {
  if (state?.kioskAutoTimer) clearInterval(state.kioskAutoTimer);
  state = {
    step: 0, studentId: "", scenarioKey: null, scenarioName: "", emotion: "",
    intensityPre: null, intensityPost: null, intensityTrend: null,
    situation: "", clarifyQ: "", clarifyA: "", issueType: "other",
    detectedIssues: [], additionalIssues: [], clarifyRetryCount: 0,
    emotionRetryCount: 0, noCurrentIssue: false,
    safeNow: "", trustedPerson: "", safetySupportMode: false,
    thought: "", distortion: null, evidenceFor: "", evidenceAgainst: "",
    beliefThought: null, newThought: "", beliefNew: null,
    calmingAction: "", action: "", lastInputSource: INPUT_SOURCE.OPTION,
    kioskAutoTimer: null, safetyFlag: "green", followUpPlan: "", strengthOfDay: "",
    summarySaved: false, helpScriptOriginStep: null, awaitingTypedField: null,
    smartMemory: { turns: [], byStep: {} },
    dynamicFollowUpQuestion: "", dynamicFollowUpA: "", dynamicRetryCount: 0,
    lastSafetyDisclosure: "", interventionReason: "", clarifyReflectionShown: false
  };
}

// ====== Scenario and flow prompts ======
function showScenarioPrompt() {
  if (scenarioArea) scenarioArea.style.display = "block";
  const favs = getFavorites();
  const favBtn = favs.length ? [{ label: `⭐ Kegemaran: ${shorten(favs[0], 22)}`, value: "__show_favs__" }] : [];
  setOptions("Tip: pilih satu situasi di atas untuk mula.", [
    ...favBtn,
    { label: "Saya nak mula tanpa pilih", value: "__skip_scenario__" }
  ]);
  state.step = 0;
  setProgress(0);
}
async function scenarioSelect(key) {
  const scn = SCENARIOS[key] || SCENARIOS.other;
  state.scenarioKey = key;
  state.scenarioName = scn.name;
  state.issueType = key;
  if (scenarioArea) scenarioArea.style.display = "none";
  addMsg(`Saya pilih: ${scn.name}`, "user");
  state.step = 1;
  setProgress(1);
  await botSay(simplify(wrap([
    "Baik. Terima kasih sebab memilih situasi ini.", praiseSmall(), naturalTransition("emotion"), "Emosi kamu sekarang apa?"
  ])), { kind: "info", text: "Mula bersama" });
  setOptions("Pilih emosi:", [
    { label: "😟 Risau", value: "Risau" }, { label: "😡 Marah", value: "Marah" },
    { label: "😢 Sedih", value: "Sedih" }, { label: "😨 Takut", value: "Takut" },
    { label: "😳 Malu", value: "Malu" }, { label: "😵 Stress", value: "Stress" },
    { label: "😕 Keliru", value: "Keliru" }, { label: "😐 Neutral", value: "Neutral" },
    { label: "😐 Tak pasti", value: "Tak pasti" }
  ]);
}

// ====== Smart follow-up route ======
async function askEmotionClarification() {
  state.emotionRetryCount = (state.emotionRetryCount || 0) + 1;
  await botSay(simplify(wrap([
    "Tak apa kalau susah nak namakan perasaan sekarang.",
    "Cuba pilih yang paling dekat. Kalau tak pasti juga, kamu boleh pilih ‘Tak pasti’."
  ])), { kind: "info", text: "Kenal pasti perasaan" });
  setOptions("Yang mana paling dekat?", [
    { label: "😟 Risau", value: "Risau" },
    { label: "😢 Sedih", value: "Sedih" },
    { label: "😡 Marah", value: "Marah" },
    { label: "😨 Takut", value: "Takut" },
    { label: "😳 Malu", value: "Malu" },
    { label: "😵 Stress", value: "Stress" },
    { label: "😐 Biasa / neutral", value: "Neutral" },
    { label: "🤔 Tak pasti", value: "Tak pasti" }
  ]);
}

async function askSmartFollowUp() {
  const data = smartFollowUpData(state.issueType);
  state.clarifyRetryCount = 0;
  state.clarifyQ = data.question;
  state.step = 4.5;
  setProgress(4.5);
  const intro = state.issueType === "bully"
    ? "Terima kasih sebab cerita. Saya tak mahu terus minta kamu fikir positif. Saya nak faham keadaan kamu dahulu."
    : "Terima kasih sebab berkongsi. Saya nak tanya satu perkara supaya saya lebih faham.";
  await botSay(simplify(wrap([intro, data.question])), { kind: "info", text: "Teroka dengan lebih tepat" });
  setOptions("Pilih jawapan yang paling dekat:", [
    ...data.options,
    { label: "Saya nak taip sendiri", value: "__type_clarify__" }
  ]);
}
async function startSafetySupportFlow() {
  state.safetySupportMode = true;
  state.step = 4.6;
  setProgress(4.6);
  await botSay(simplify(wrap([
    "Terima kasih sebab beritahu saya.",
    "Kita tak perlu teruskan latihan mencari fikiran positif dahulu.",
    "Saya nak pastikan keselamatan kamu. Adakah kamu rasa selamat sekarang, di tempat kamu berada?"
  ])), { kind: "warn", text: "Semak keselamatan" });
  setOptions("Pilih jawapan:", [
    { label: "✅ Ya, saya rasa selamat", value: "Ya, saya rasa selamat sekarang" },
    { label: "⚠️ Tidak, saya tak rasa selamat", value: "Tidak, saya tak rasa selamat sekarang" },
    { label: "🤔 Saya tak pasti", value: "Saya tak pasti" }
  ]);
}
async function proceedToThought() {
  const answer = normalize(state.clarifyA);
  const ongoingBully = state.issueType === "bully" && /(masih berlaku|kadang-kadang|tak pasti|tak tahu|berlaku sekarang|still happening|sometimes still|not sure|unsure|don't know|do not know)/i.test(answer);
  const unsafeFamily = state.issueType === "family" && /(tidak|tak rasa selamat|tak pasti|tak tahu|tidak selamat|\bno\b|not safe|not sure|unsure|don't know|do not know)/i.test(answer);
  if (ongoingBully || unsafeFamily) {
    state.safetySupportMode = true;
    if (state.safetyFlag === "green" || state.safetyFlag === "yellow") state.safetyFlag = "orange";
    await botSay(simplify(wrap([
      "Saya dengar apa yang kamu ceritakan.",
      state.situation ? `Perkara yang berlaku: “${shorten(state.situation, 100)}”.` : "",
      state.clarifyA ? `Jawapan kamu: “${shorten(state.clarifyA, 100)}”.` : "",
      "Saya tidak akan meminta kamu menafikan apa yang berlaku. Kita utamakan keselamatan dan sokongan yang sesuai dahulu."
    ])), { kind: "warn", text: "Utamakan keselamatan" });
    await startSafetySupportFlow();
    return;
  }

  const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;
  state.step = 5;
  setProgress(5);
  await botSay(simplify(wrap([
    praiseSmall(), smartSituationReflection(), microCheckLine(),
    smartThoughtQuestion()
  ])), { kind: "info", text: "Fikiran berdasarkan cerita kamu" });
  setOptions("Pilih fikiran yang paling dekat:", [
    ...smartThoughtOptions(state.issueType, scn).map(x => ({ label: x, value: x })),
    { label: "Saya tak pasti", value: "tak pasti" },
    { label: "Saya nak taip sendiri", value: "__type_thought__" }
  ]);
}

async function askEvidenceFor() {
  state.step = 6;
  setProgress(6);
  const data = {
    bully: {
      question: "Apa yang berlaku atau apa yang orang itu buat sampai fikiran ini muncul?",
      options: ["Mereka benar-benar mengejek atau mengganggu saya.", "Saya takut perkara itu berulang.", "Saya belum pasti."]
    },
    friend: {
      question: "Apa yang kawan buat atau cakap sampai fikiran itu muncul?",
      options: ["Mereka tak ajak saya bermain.", "Mereka cakap sesuatu yang menyakitkan.", "Saya belum pasti sebabnya."]
    },
    exam: {
      question: "Apa yang membuat fikiran itu terasa betul?",
      options: ["Saya belum habis ulang kaji.", "Latihan yang saya buat masih susah.", "Saya pernah jawab banyak soalan dengan salah."]
    },
    teacher: {
      question: "Apa yang cikgu buat atau cakap hingga fikiran itu muncul?",
      options: ["Cikgu bercakap dengan suara kuat.", "Cikgu menegur kesalahan saya.", "Saya tak pasti maksud cikgu."]
    },
    family: {
      question: "Apa yang berlaku sampai fikiran itu muncul?",
      options: ["Saya dimarah.", "Ada pertengkaran di rumah.", "Saya rasa tidak didengar."]
    },
    other: {
      question: "Apa yang membuat fikiran itu terasa betul?",
      options: ["Saya pernah mengalami perkara yang sama.", "Ada sesuatu yang belum selesai.", "Tak pasti."]
    }
  };
  const chosen = data[state.issueType] || data.other;
  await botSay(simplify(wrap([
    "Kita tengok apa yang membuat kamu berfikir begitu.", chosen.question,
    "Kamu boleh pilih contoh atau taip jawapan sendiri."
  ])), { kind: "info", text: "Fahami fikiran asal" });
  setOptions("Contoh jawapan:", [
    ...chosen.options.map(x => ({ label: x, value: x })),
    { label: "Tak pasti", value: "tak pasti" },
    { label: "Saya nak taip sendiri", value: "__type_evidence_for__" }
  ]);
}
async function askEvidenceAgainst() {
  state.step = 7;
  setProgress(7);
  const data = {
    bully: {
      intro: "Kita tidak menafikan apa yang berlaku. Kita cuma fikirkan apa yang boleh membantu kamu berasa lebih disokong.",
      question: "Apakah perkara yang boleh membantu kamu supaya tidak perlu hadapi ini seorang diri?",
      options: ["Ada guru yang boleh saya beritahu.", "Ada kawan yang boleh menemani saya.", "Saya boleh minta bantuan orang dewasa."]
    },
    friend: {
      intro: "Kita bukan menafikan apa yang berlaku. Kita semak sama ada kesimpulan tentang diri kamu sudah tentu benar.",
      question: "Ada tak perkara yang menunjukkan keadaan mungkin belum jelas sepenuhnya?",
      options: ["Saya belum tahu sepenuhnya sebab mereka buat begitu.", "Ada kawan yang pernah bercakap baik dengan saya.", "Saya boleh bercakap dengan seorang kawan yang saya percaya."]
    },
    exam: {
      intro: "Walaupun peperiksaan mencabar, kita tengok juga perkara yang masih boleh kamu usahakan.",
      question: "Apa yang menunjukkan masih ada ruang untuk mencuba?",
      options: ["Saya masih ada masa untuk ulang kaji sedikit.", "Saya boleh minta cikgu terangkan topik yang susah.", "Saya boleh mula dengan satu bahagian dahulu."]
    },
    teacher: {
      intro: "Kita boleh belajar daripada teguran tanpa terus menghukum diri sendiri.",
      question: "Adakah mungkin teguran itu berkaitan dengan perbuatan tertentu, bukan seluruh diri kamu?",
      options: ["Saya boleh kenal pasti perkara yang perlu dibaiki.", "Saya boleh bertanya jika saya tak faham teguran itu.", "Saya tak perlu melabel seluruh diri saya berdasarkan satu kejadian."]
    },
    family: {
      intro: "Kita tak perlu menafikan perasaan kamu atau terus menyalahkan sesiapa.",
      question: "Siapa yang boleh mendengar atau membantu kamu apabila perkara ini terasa berat?",
      options: ["Kaunselor atau guru yang saya percaya.", "Ahli keluarga yang membuat saya rasa selamat.", "Saya belum pasti siapa yang boleh membantu."]
    },
    other: {
      intro: "Sekarang kita tengok satu sudut yang lain secara perlahan-lahan.",
      question: "Ada tak perkara yang menunjukkan fikiran itu mungkin tidak sepenuhnya tepat?",
      options: ["Saya pernah menghadapi perkara ini dengan lebih baik.", "Ada orang yang boleh membantu saya.", "Saya masih ada satu langkah kecil yang boleh dicuba."]
    }
  };
  const chosen = data[state.issueType] || data.other;
  await botSay(simplify(wrap([
    chosen.intro, chosen.question, "Pilih jawapan yang paling dekat, atau taip jawapan sendiri."
  ])), { kind: "info", text: "Lihat sudut lain" });
  setOptions("Contoh jawapan:", [
    ...chosen.options.map(x => ({ label: x, value: x })),
    { label: "Tak pasti", value: "tak pasti" },
    { label: "Saya nak taip sendiri", value: "__type_evidence_against__" }
  ]);
}
async function askBeliefAndNewThought() {
  state.step = 8;
  setProgress(8);
  await botSay(simplify(wrap([
    "Fikiran asal itu terasa kuat mana dalam hati kamu?",
    "Pilih nombor 0–10. 0 = tak percaya langsung, 10 = sangat percaya."
  ])), { kind: "info", text: "Skor fikiran asal" });
  setOptions("Pilih nombor:", [0, 2, 4, 6, 8, 10].map(n => ({ label: String(n), value: String(n) })));
}
async function showNewThoughtOptions() {
  const hints = smartReframeSuggestions(state.issueType, state.distortion, state.thought);
  await botSay(simplify(wrap([
    "Baik, sekarang kita cuba cari fikiran yang lebih seimbang.",
    "Fikiran baru bukan bermaksud kita menafikan apa yang berlaku. Kita cari ayat yang adil kepada diri kamu dan membantu kamu memilih langkah seterusnya."
  ])), { kind: "info", text: "Fikiran lebih seimbang" });
  setOptions("Pilih ayat yang paling dekat:", [
    { label: `🌤️ ${hints[0]}`, value: "__new__" + hints[0] },
    { label: `🌤️ ${hints[1]}`, value: "__new__" + hints[1] },
    { label: `🌤️ ${hints[2]}`, value: "__new__" + hints[2] },
    { label: "Saya nak taip sendiri", value: "__type_new_thought__" }
  ]);
}
async function askBeliefNew() {
  await botSay(simplify(wrap([
    "Bila baca fikiran baru itu, ia terasa meyakinkan berapa kuat?",
    "Pilih 0–10, atau langkau jika tak mahu jawab."
  ])), { kind: "info", text: "Skor fikiran baru" });
  setOptions("Pilih:", [
    ...[0, 2, 4, 6, 8, 10].map(n => ({ label: String(n), value: `__beliefNew__${n}` })),
    { label: "Langkau", value: "__beliefNew__skip" }
  ]);
}
async function askAction() {
  state.step = 9;
  setProgress(9);
  // Use the current focus selected by the student. This matters when they first
  // described multiple concerns and chose one to explore.
  const focus = state.issueType || state.scenarioKey || "other";
  const base = scenarioBoostTools(focus, state.emotion);
  const favs = getFavorites().slice(0, 2).map(f => ({ label: `⭐ ${shorten(f, 22)}`, value: f }));
  const ranked = rankTools(base.filter(x => !String(x.value).startsWith("__")));
  const merged = [...favs, ...ranked, ...base.filter(x => String(x.value).startsWith("__"))];
  state.interventionReason = `${issueTypeLabel(focus)} + ${state.emotion || "emosi belum dikenal pasti"}`;
  await botSay(simplify(wrap([
    naturalTransition("action"),
    state.issueType === "bully"
      ? "Pilih langkah yang membantu kamu mendapat sokongan atau menjaga diri. Kamu tak perlu berdepan dengan orang yang mengganggu seorang diri."
      : state.issueType === "exam"
        ? "Kita utamakan langkah yang boleh membantu persediaan kamu sedikit demi sedikit."
        : state.issueType === "friend"
          ? "Pilih langkah yang sesuai untuk kamu. Kamu tidak perlu memaksa diri berbaik jika belum bersedia."
          : "Saya susun pilihan berdasarkan perkara yang kamu ceritakan."
  ])), { kind: "info", text: "Langkah kecil" });
  setOptions("Pilih satu langkah kecil:", merged);
}
async function askPostIntensity() {
  state.step = 10;
  setProgress(10);
  await botSay(simplify("Sebelum kita tamat, emosi kamu sekarang kuat mana (0–10)?"), { kind: "info", text: "Skor selepas" });
  setOptions("Pilih nombor:", [0, 2, 4, 6, 8, 10].map(n => ({ label: String(n), value: String(n) })));
}
async function showMicroPlan() {
  state.step = 11;
  setProgress(11);
  await botSay(simplify("Sebelum sesi tamat, jom pilih satu pelan kecil selepas ini."), { kind: "ok", text: "Pelan kecil" });
  let plans;
  if (state.issueType === "exam") {
    plans = [
      { label: "📚 Saya akan buat 5 minit ulang kaji dahulu", value: "plan_5min" },
      { label: "👩‍🏫 Saya akan minta bantuan cikgu untuk topik susah", value: "plan_tell_teacher" },
      { label: "💛 Saya akan cuba bercakap baik dengan diri", value: "plan_selfkind" },
      { label: "🔄 Mula sesi baru", value: "__restart__" }
    ];
  } else if (state.issueType === "friend") {
    plans = [
      { label: "🗣️ Saya akan cuba bercakap dengan kawan yang saya percaya", value: "plan_talk_friend" },
      { label: "👩‍🏫 Saya akan minta pandangan cikgu / kaunselor", value: "plan_tell_teacher" },
      { label: "💛 Saya akan cakap baik dengan diri", value: "plan_selfkind" },
      { label: "🔄 Mula sesi baru", value: "__restart__" }
    ];
  } else if (state.issueType === "bully") {
    plans = [
      { label: "👩‍🏫 Saya akan beritahu orang dewasa yang dipercayai", value: "plan_tell_teacher" },
      { label: "📝 Saya akan catat perkara yang berlaku", value: "plan_record_event" },
      { label: "🌈 Saya akan guna Nafas Pelangi jika perlu bertenang", value: "plan_breath" },
      { label: "🔄 Mula sesi baru", value: "__restart__" }
    ];
  } else if (state.issueType === "teacher" || state.issueType === "family") {
    plans = [
      { label: "👩‍🏫 Saya akan berkongsi dengan guru / kaunselor yang dipercayai", value: "plan_tell_teacher" },
      { label: "🌈 Saya akan guna Nafas Pelangi bila perlu", value: "plan_breath" },
      { label: "💛 Saya akan bercakap baik dengan diri", value: "plan_selfkind" },
      { label: "🔄 Mula sesi baru", value: "__restart__" }
    ];
  } else {
    plans = [
      { label: "🧩 Saya akan buat 5 minit dahulu", value: "plan_5min" },
      { label: "🌈 Saya akan guna Nafas Pelangi bila risau", value: "plan_breath" },
      { label: "👩‍🏫 Saya akan jumpa cikgu / kaunselor", value: "plan_tell_teacher" },
      { label: "💛 Saya akan cakap baik dengan diri", value: "plan_selfkind" },
      { label: "🔄 Mula sesi baru", value: "__restart__" }
    ];
  }
  setOptions("Pilih satu pelan:", plans);
  scheduleKioskAutoReset();
}

// ====== Guides and help ======
async function runGuide(actionValue, isCalming = false) {
  const lines = GUIDES[actionValue];
  if (!lines) return false;
  await botSay(simplify(lines.join("\n")), { kind: "info", text: isCalming ? "Tenang dulu" : "Panduan lembut" });
  const isFav = getFavorites().includes(actionValue);
  setOptions("Dah siap buat? (pilih satu)", [
    { label: "✅ Ya, saya sudah buat", value: "__done_action__" },
    { label: "🔁 Ulang panduan", value: "__repeat_action__" },
    { label: isFav ? "⭐ Sudah disimpan" : "⭐ Simpan kaedah ini", value: "__bookmark__" },
    { label: "🗣️ Ayat untuk minta tolong", value: "__help_script__" }
  ]);
  return true;
}
async function showHelpScript() {
  state.helpScriptOriginStep = state.step;
  addMsg("Saya nak ayat untuk minta tolong", "user");
  const lines = ["Baik. Kamu boleh guna ayat ini:", ...SCHOOL_HELP.helpLines.map((x, i) => `${i + 1}) ${x}`), "", `Pergi ke: ${SCHOOL_HELP.safePlace}`, `Jumpa: ${SCHOOL_HELP.trustedAdult}`];
  await botSay(simplify(lines.join("\n")), { kind: "warn", text: "Ayat bantuan" });
  setOptions("Lepas itu:", [
    { label: "✅ Saya akan jumpa cikgu", value: "__will_seek_help__" },
    { label: "🔄 Mula semula", value: "__restart__" }
  ]);
}

// ====== Summary / teacher guide ======
function buildStrengthOfDay() {
  const map = [];
  if (state.situation) map.push("kamu berani bercerita");
  if (state.thought) map.push("kamu cuba memahami fikiran sendiri");
  if (state.newThought) map.push("kamu cuba memilih fikiran yang lebih lembut");
  if (state.action || state.calmingAction) map.push("kamu memilih satu langkah kecil");
  return map[map.length - 1] || "kamu sudi mula mencuba";
}
function buildWarmProgressNote() {
  if (typeof state.intensityPre !== "number" || typeof state.intensityPost !== "number") return "Apa yang paling penting: kamu sudah cuba memahami hati sendiri hari ini.";
  if (state.intensityPost < state.intensityPre) return "Perasaan kamu nampak sedikit lebih ringan. Walaupun kecil, itu tetap kemajuan yang baik.";
  if (state.intensityPost === state.intensityPre) return "Perasaan kamu masih sama kuat. Itu pun okay. Kadang-kadang hati perlukan lebih masa.";
  return "Perasaan kamu nampak lebih kuat sedikit selepas bercerita. Itu boleh berlaku bila hati mula meluahkan perkara yang berat. Cuba pilih langkah paling lembut atau cari orang dewasa yang dipercayai.";
}
function buildRumusanSesi() {
  state.strengthOfDay = buildStrengthOfDay();
  return simplify([
    "💛 RUMUSAN BERSAMA KAWAN CBT", "",
    `Hari ini, saya dengar cerita kamu tentang: ${state.situation || state.scenarioName || "-"}`,
    `Perkara tambahan yang kamu kongsi: ${state.clarifyA || "-"}`,
    state.dynamicFollowUpA ? `Jawapan susulan: ${state.dynamicFollowUpA}` : "",
    state.additionalIssues?.length ? `Perkara lain yang turut disebut: ${state.additionalIssues.map(issueTypeLabel).join(", ")}` : "",
    `Perasaan utama kamu: ${state.emotion || "-"}`,
    `Skor emosi kamu: ${state.intensityPre ?? "-"} / 10 → ${state.intensityPost ?? "-"} / 10`, "",
    state.thought ? `Fikiran yang paling kuat tadi: ${state.thought}` : "Fikiran yang paling kuat tadi: -",
    state.newThought ? `Fikiran baru yang lebih seimbang: ${state.newThought}` : "Fikiran baru yang lebih seimbang: -",
    state.action || state.calmingAction ? `Langkah kecil yang kamu pilih: ${state.action || state.calmingAction}` : "Langkah kecil yang kamu pilih: -",
    state.followUpPlan ? `Pelan kecil selepas ini: ${state.followUpPlan}` : "Pelan kecil selepas ini: -", "",
    `${BOT_STRENGTH_LABEL}: Hari ini kamu menunjukkan bahawa ${state.strengthOfDay}.`,
    "", `Nota daripada ${BOT_NAME}:`, buildWarmProgressNote(), "", BOT_CLOSING
  ].join("\n"));
}
function buildTeacherSummary() {
  let progressFlag = "Tidak pasti";
  if (typeof state.intensityPre === "number" && typeof state.intensityPost === "number") {
    if (state.intensityPost < state.intensityPre) progressFlag = "Berkurang";
    else if (state.intensityPost === state.intensityPre) progressFlag = "Kekal";
    else progressFlag = "Meningkat";
  }
  const safetyPath = state.safetySupportMode || ["red", "orange", "yellow"].includes(state.safetyFlag);
  return [
    "👩‍🏫 RINGKASAN GURU / KAUNSELOR", "",
    `Kod murid: ${state.studentId || "-"}`,
    `Kategori dipilih: ${state.scenarioName || "-"}`,
    `Kategori isu (anggaran sistem, perlu semakan manusia): ${state.issueType || "other"}`,
    `Perkara lain yang turut disebut: ${state.additionalIssues?.length ? state.additionalIssues.map(issueTypeLabel).join(", ") : "-"}`,
    `Cerita murid: ${state.situation || "-"}`,
    `Butiran lanjut: ${state.clarifyA || "-"}`,
    `Soalan susulan sistem: ${state.dynamicFollowUpQuestion || "-"}`,
    `Jawapan susulan murid: ${state.dynamicFollowUpA || "-"}`,
    `Petunjuk keselamatan (teks asal): ${state.lastSafetyDisclosure || "-"}`,
    `Keadaan keselamatan: ${state.safeNow || "-"}`,
    `Orang yang boleh membantu: ${state.trustedPerson || "-"}`,
    `Emosi utama: ${state.emotion || "-"}`,
    `Skor emosi: ${state.intensityPre ?? "-"} / 10 → ${state.intensityPost ?? "-"} / 10`,
    `Perubahan: ${progressFlag}`,
    `Safety flag: ${state.safetyFlag || "green"}`,
    `Fikiran asal: ${state.thought || "-"}`,
    `Fikiran baru: ${state.newThought || "-"}`,
    `Tindakan dipilih: ${state.action || state.calmingAction || "-"}`,
    `Pelan kecil: ${state.followUpPlan || "-"}`, "",
    safetyPath
      ? `Cadangan: semak keselamatan murid, maklumkan ${SCHOOL_HELP.trustedAdult} yang sesuai dan ikuti prosedur rujukan sekolah. Kategori automatik ini perlu disemak manusia.`
      : progressFlag === "Meningkat"
        ? `Cadangan: semak semula keadaan murid dan pertimbang follow-up dengan ${SCHOOL_HELP.trustedAdult}.`
        : "Cadangan: teruskan pemantauan yang sesuai dan galakkan langkah kecil yang dipilih."
  ].join("\n");
}
function renderSummaryView() {
  if (summaryContent) summaryContent.textContent = summaryView === "guru" ? buildTeacherSummary() : buildRumusanSesi();
  tabMurid?.classList.toggle("active", summaryView === "murid");
  tabGuru?.classList.toggle("active", summaryView === "guru");
}
function showSummaryModal() {
  clearOptions();
  summaryView = "murid";
  renderSummaryView();
  summaryModal?.classList.remove("hidden");
  if (newStudent) newStudent.textContent = kioskMode ? "Sesi Murid Seterusnya" : "Sesi Baharu";
  if (canStore() && !state.summarySaved && !window.KAWAN_SECURE_RECORDS_MODE) {
    const logs = loadJSON(LS_LOGS, []);
    logs.push({
      ts: new Date().toISOString(), studentId: state.studentId || "",
      scenario: state.scenarioName || "", issueType: state.issueType || "other",
      detectedIssues: state.detectedIssues || [], additionalIssues: state.additionalIssues || [],
      noCurrentIssue: !!state.noCurrentIssue,
      situation: state.situation || "", clarifyA: state.clarifyA || "",
      dynamicFollowUpQuestion: state.dynamicFollowUpQuestion || "",
      dynamicFollowUpA: state.dynamicFollowUpA || "",
      lastSafetyDisclosure: state.lastSafetyDisclosure || "",
      safeNow: state.safeNow || "", trustedPerson: state.trustedPerson || "",
      emotion: state.emotion || "", pre: state.intensityPre ?? null, post: state.intensityPost ?? null,
      calming: state.calmingAction || "", action: state.action || "", thought: state.thought || "",
      newThought: state.newThought || "", safetyFlag: state.safetyFlag || "green",
      safetySupportMode: !!state.safetySupportMode,
      followUpPlan: state.followUpPlan || "", strengthOfDay: state.strengthOfDay || ""
    });
    saveJSON(LS_LOGS, logs.slice(-200));
    state.summarySaved = true;
  }
}
function closeSummaryModal() { summaryModal?.classList.add("hidden"); }
function copyText(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
  } else fallbackCopyText(text);
}
function fallbackCopyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (_) {}
  ta.remove();
}
function buildTeacherGuide() {
  return [
    "✅ Ayat yang membantu:",
    "• ‘Terima kasih sebab beritahu saya.’",
    "• ‘Saya dengar kamu rasa ____. Itu masuk akal.’",
    "• ‘Jom buat satu langkah kecil dulu.’", "",
    "✅ Soalan lembut:",
    "• ‘Apa yang berlaku?’",
    "• ‘Apa yang kamu perlukan sekarang?’",
    "• ‘Adakah kamu rasa selamat sekarang?’", "",
    "❌ Elakkan:",
    "• ‘Itu benda kecil sahaja.’",
    "• ‘Jangan fikir macam tu.’",
    "• ‘Awak over sangat.’", "",
    "🚨 Rujuk segera jika:",
    "• Murid sebut cederakan diri / dera / ancaman.",
    "• Murid takut balik rumah / takut jumpa seseorang.",
    "• Murid tunjuk tanda tidak selamat.", "",
    `📍 Tempat selamat: ${SCHOOL_HELP.safePlace}`,
    `👥 Orang dewasa: ${SCHOOL_HELP.trustedAdult}`
  ].join("\n");
}
function openTeacher() {
  if (teacherContent) teacherContent.textContent = buildTeacherGuide();
  teacherModal?.classList.remove("hidden");
}
function closeTeacherModal() { teacherModal?.classList.add("hidden"); }

// ====== Kiosk ======
function scheduleKioskAutoReset() {
  if (!kioskMode) return;
  if (state.kioskAutoTimer) clearInterval(state.kioskAutoTimer);
  let left = 10;
  state.kioskAutoTimer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearInterval(state.kioskAutoTimer);
      state.kioskAutoTimer = null;
      if (studentIdEl) studentIdEl.value = "";
      start();
    }
  }, 1000);
}

// ====== Start ======
async function start() {
  if (chat) chat.innerHTML = "";
  resetState();
  kioskMode = !!kioskToggle?.checked;
  longMode = kioskMode ? false : !!longToggle?.checked;
  if (summaryModal) summaryModal.classList.add("hidden");
  if (scenarioArea) scenarioArea.style.display = "block";
  applyTheme();
  applyTTS();
  applyKidsModeUI();
  setModeUI();
  setProgress(0);
  await botSay(simplify(wrap([BOT_OPENING, pick(warmOpeners()), "Pilih situasi untuk mula ya."])), { kind: "ok", text: "Selamat datang" });
  showScenarioPrompt();
}

// ====== Main handler ======
async function handleUserInput(text, source = INPUT_SOURCE.TYPED) {
  const raw = canonicalizeUserText(String(text || "").trim());
  if (!raw) return;

  kioskMode = !!kioskToggle?.checked;
  longMode = kioskMode ? false : !!longToggle?.checked;
  ttsEnabled = !!ttsToggle?.checked;
  applyKidsModeUI();
  state.lastInputSource = source;
  setModeUI();
  state.studentId = (studentIdEl?.value || "").trim();
  if (!raw.startsWith("__")) rememberSmartAnswer(state.step, raw, source);

  // Internal navigation commands are handled before echoing them to chat.
  if (raw === "__restart__") { await start(); return; }
  if (raw === "__skip_scenario__") { await scenarioSelect("other"); return; }
  if (raw === "__skip_dynamic_followup__") {
    addMsg("Saya mahu langkau soalan ini", "user");
    state.dynamicFollowUpA = "Murid memilih untuk melangkau soalan susulan.";
    await proceedToThought();
    return;
  }
  if (raw === "__continue_to_thought__") {
    addMsg("Saya mahu teruskan tanpa menjawab soalan ini", "user");
    state.dynamicFollowUpA = "Murid memilih untuk tidak menjawab soalan susulan buat masa ini.";
    await proceedToThought();
    return;
  }
  if (raw === "__help_script__") { await showHelpScript(); return; }
  if (raw === "__show_favs__") {
    const favs = getFavorites();
    if (!favs.length) { await botSay("Belum ada kegemaran lagi. Nanti kamu boleh simpan satu panduan. ⭐", { kind: "info", text: "Kegemaran" }); return; }
    await botSay("Pilih kaedah kegemaran kamu:", { kind: "info", text: "Kegemaran" });
    setOptions("Pilih:", favs.slice(0, 8).map(x => ({ label: `⭐ ${shorten(x, 28)}`, value: x })));
    return;
  }
  if (raw === "__bookmark__") {
    const name = state.action || state.calmingAction;
    if (name) addFavorite(name);
    await botSay(`Dah simpan ⭐: ${name || "-"}`, { kind: "ok", text: "Disimpan" }, 180);
    return;
  }
  if (raw === "__repeat_action__") {
    addMsg("Ulang panduan", "user");
    await runGuide(state.action || state.calmingAction, state.step === 3);
    return;
  }
  if (raw === "__done_action__") {
    addMsg("Saya sudah buat ✅", "user");
    if (state.step === 3) {
      await botSay("Bagus. Kamu sudah cuba menenangkan diri. 🌿", { kind: "ok", text: "Hebat" });
      state.step = 4;
      setProgress(4);
      const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;
      await botSay(simplify(wrap([naturalTransition("situation"), "Apa yang berlaku? Cerita ringkas ya."])), { kind: "info", text: "Situasi" });
      setOptions("Contoh:", [
        { label: scn.example, value: scn.example },
        { label: "Saya tak tahu nak cerita.", value: "tak tahu" }
      ]);
      return;
    }
    if (state.step === 9) {
      await botSay("Bagus. Kamu sudah cuba langkah kecil itu. 🌟", { kind: "ok", text: "Siap" });
      await askPostIntensity();
      return;
    }
    return;
  }
  const typedFieldCommands = {
    "__type_clarify__": "clarify",
    "__type_thought__": "thought",
    "__type_evidence_for__": "evidenceFor",
    "__type_evidence_against__": "evidenceAgainst",
    "__type_new_thought__": "newThought",
    "__type_dynamic_followup__": "dynamicFollowUp"
  };
  if (typedFieldCommands[raw]) {
    state.awaitingTypedField = typedFieldCommands[raw];
    const prompts = {
      clarify: "Baik, taip jawapan kamu sendiri. Satu ayat pendek pun okay.",
      thought: "Taip fikiran kamu sendiri. Satu ayat pendek pun okay.",
      evidenceFor: "Taip apa yang membuat fikiran itu terasa betul.",
      evidenceAgainst: "Taip perkara lain yang mungkin membantu kamu melihat keadaan dengan lebih seimbang.",
      newThought: "Taip fikiran baru dengan perkataan kamu sendiri.",
      dynamicFollowUp: "Taip jawapan kamu sendiri. Satu ayat pendek pun okay."
    };
    await botSay(prompts[state.awaitingTypedField], { kind: "info", text: "Jawapan sendiri" });
    clearOptions();
    return;
  }

  if (raw.startsWith("__set_emotion__")) {
    state.emotion = raw.replace("__set_emotion__", "").trim() || state.emotion;
    addMsg(`Emosi dipilih: ${state.emotion}`, "user");
    await askSmartFollowUp();
    return;
  }

  if (raw.startsWith("__choose_issue__")) {
    const chosen = raw.replace("__choose_issue__", "");
    if (["bully", "friend", "exam", "teacher", "family", "other"].includes(chosen)) {
      state.issueType = chosen;
      state.additionalIssues = (state.detectedIssues || []).filter(x => x !== chosen);
      addMsg(`Saya mahu fokus dahulu pada: ${issueTypeLabel(chosen)}`, "user");
      await askSmartFollowUp();
    }
    return;
  }
  if (raw === "__situation_try_again__") {
    addMsg("Saya mahu cuba bercerita", "user");
    state.step = 4;
    setProgress(4);
    await botSay(simplify(wrap([
      "Boleh. Kita ambil masa perlahan-lahan.",
      "Cuba ceritakan satu perkara sahaja yang kamu ingat. Kamu juga boleh taip dengan perkataan sendiri."
    ])), { kind: "info", text: "Cuba semula dengan perlahan" });
    const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;
    setOptions("Contoh jika membantu:", [
      { label: scn.example, value: scn.example },
      { label: "Saya malu sebab diejek.", value: "Saya malu sebab diejek." },
      { label: "Saya risau sebab peperiksaan.", value: "Saya risau sebab peperiksaan." },
      { label: "Saya sedih sebab kawan tak ajak main.", value: "Saya sedih sebab kawan tak ajak main." }
    ]);
    return;
  }
  if (raw === "__situation_no_issue__") {
    addMsg("Saya cuma mahu belajar cara menjaga emosi", "user");
    state.noCurrentIssue = true;
    state.situation = "Murid menyatakan tiada isu khusus yang mengganggu pada masa ini.";
    state.issueType = "other";
    await botSay(simplify(wrap([
      "Itu pun okay. Kita tak perlu mencari masalah kalau sekarang tiada perkara yang mengganggu.",
      "Kamu mahu belajar satu cara menjaga emosi, atau tamatkan sesi di sini?"
    ])), { kind: "info", text: "Ikut keperluan kamu" });
    setOptions("Pilih:", [
      { label: "🌈 Saya mahu belajar satu cara", value: "__no_issue_skill__" },
      { label: "✅ Tamatkan sesi", value: "__end_no_issue__" }
    ]);
    return;
  }
  if (raw === "__no_issue_skill__") {
    addMsg("Saya mahu belajar satu cara menjaga emosi", "user");
    state.noCurrentIssue = true;
    state.situation = "Murid mahu belajar kemahiran menjaga emosi; tiada isu khusus diteroka.";
    state.issueType = "other";
    await askAction();
    return;
  }
  if (raw === "__end_no_issue__") {
    addMsg("Saya mahu tamatkan sesi", "user");
    state.noCurrentIssue = true;
    state.situation = state.situation || "Murid menyatakan tiada isu khusus yang mengganggu pada masa ini.";
    state.followUpPlan = "Tiada isu khusus diteroka dalam sesi ini; boleh kembali jika memerlukan sokongan.";
    await botSay(simplify("Terima kasih kerana singgah. Kamu tak perlu berkongsi sesuatu yang kamu belum sedia ceritakan. Kawan CBT sentiasa boleh digunakan semula bila kamu perlukan."), { kind: "ok", text: "Sesi ditamatkan" });
    showSummaryModal();
    return;
  }
  if (raw === "__continue_without_clarify__") {
    addMsg("Saya mahu teruskan tanpa menjawab soalan tadi", "user");
    if (["bully", "family"].includes(state.issueType)) {
      state.clarifyA = "Tak pasti";
      state.safetySupportMode = true;
      if (state.safetyFlag === "green") state.safetyFlag = "yellow";
      await botSay(simplify("Tak apa. Sebab soalan ini berkaitan keadaan yang mungkin penting untuk keselamatan, kita cari orang dewasa yang boleh membantu tanpa memaksa kamu bercerita lebih lanjut."), { kind: "warn", text: "Cari sokongan" });
      await startSafetySupportFlow();
      return;
    }
    state.clarifyA = "Murid memilih untuk tidak menjawab soalan tambahan buat masa ini.";
    await proceedToThought();
    return;
  }
  if (raw === "__end_current_session__") {
    addMsg("Saya mahu berhenti dahulu", "user");
    state.followUpPlan = "Murid memilih untuk berhenti meneroka buat masa ini; pertimbang susulan yang sesuai.";
    if (["bully", "family"].includes(state.issueType)) {
      state.safetySupportMode = true;
      if (state.safetyFlag === "green") state.safetyFlag = "yellow";
    }
    await botSay(simplify("Tak apa. Terima kasih kerana beritahu saya. Kamu tidak perlu meneruskan cerita sebelum bersedia. Jika perkara ini melibatkan keselamatan, sila beritahu orang dewasa yang dipercayai."), { kind: "info", text: "Kamu boleh berhenti" });
    showSummaryModal();
    return;
  }

  if (raw === "__seek_safe_place__") {
    addMsg(`Saya akan pergi ke ${SCHOOL_HELP.safePlace}.`, "user");
    state.followUpPlan = `Pergi ke ${SCHOOL_HELP.safePlace} dan beritahu ${SCHOOL_HELP.trustedAdult}.`;
    state.safetySupportMode = true;
    await botSay(`Baik. Pergi ke ${SCHOOL_HELP.safePlace} dan beritahu ${SCHOOL_HELP.trustedAdult}.`, { kind: "warn", text: "Dapatkan bantuan" });
    showSummaryModal();
    return;
  }
  if (raw === "__will_seek_help__") {
    addMsg("Saya akan jumpa cikgu", "user");
    state.followUpPlan = `Beritahu ${SCHOOL_HELP.trustedAdult}.`;
    if (state.safetySupportMode) { showSummaryModal(); return; }
    if (state.helpScriptOriginStep === 9) { await askPostIntensity(); return; }
    setOptions("Pilihan:", [{ label: "🔄 Sambung sesi", value: "__restart__" }]);
    return;
  }

  // Safety flow steps must be handled before keyword detection so the answer
  // “Tidak, saya tak rasa selamat sekarang” is not intercepted by the generic rule.
  if (state.step === 4.6) {
    addMsg(raw, "user");
    state.safeNow = raw;
    const unsafe = /tidak|tak rasa selamat|tak pasti|tak tahu|\bno\b|not safe|don't feel safe|do not feel safe|unsafe|not sure|unsure|don't know|do not know/i.test(normalize(raw));
    if (unsafe && state.safetyFlag === "green") state.safetyFlag = "orange";
    if (unsafe) {
      await botSay(simplify(wrap([
        "Terima kasih kerana beritahu saya dengan jujur.",
        "Lebih baik kita dapatkan bantuan orang dewasa yang boleh bersama kamu dan menilai keadaan dengan selamat."
      ])), { kind: "warn", text: "Cari sokongan sekarang" });
    } else {
      await botSay(simplify("Bagus kamu sudah beritahu. Walaupun kamu rasa selamat sekarang, kita masih boleh cari orang dewasa yang boleh membantu."), { kind: "info", text: "Cari sokongan" });
    }
    state.step = 4.7;
    setProgress(4.7);
    await botSay(simplify("Siapa orang dewasa yang kamu rasa boleh membantu kamu?"), { kind: "info", text: "Kenal pasti sokongan" });
    setOptions("Pilih orang yang sesuai:", [
      { label: "Cikgu kelas", value: "Cikgu kelas" },
      { label: "Guru Bimbingan dan Kaunseling", value: "Guru Bimbingan dan Kaunseling" },
      { label: "Guru bertugas", value: "Guru bertugas" },
      { label: "Ahli keluarga yang dipercayai", value: "Ahli keluarga yang dipercayai" },
      { label: "Saya belum pasti", value: "Saya belum pasti" }
    ]);
    return;
  }
  if (state.step === 4.7) {
    const newSafetyLevel = safetyLevelFromText(raw);
    if (newSafetyLevel === "red" || newSafetyLevel === "orange") {
      addMsg(raw, "user");
      state.safeNow = raw;
      state.lastSafetyDisclosure = raw;
      state.safetyFlag = newSafetyLevel;
      state.safetySupportMode = true;
      const updatedSafety = safetyResponse(newSafetyLevel);
      if (updatedSafety) await botSay(updatedSafety.msg, updatedSafety.tag, 220);
      await botSay(simplify("Terima kasih sebab beritahu saya. Sekarang, siapa orang dewasa yang boleh bersama kamu dan membantu dengan selamat?"), { kind: "warn", text: "Pilih orang dewasa" });
      setOptions("Pilih orang yang sesuai:", [
        { label: "Cikgu kelas", value: "Cikgu kelas" },
        { label: "Guru Bimbingan dan Kaunseling", value: "Guru Bimbingan dan Kaunseling" },
        { label: "Guru bertugas", value: "Guru bertugas" },
        { label: "Ahli keluarga yang dipercayai", value: "Ahli keluarga yang dipercayai" },
        { label: "Saya belum pasti", value: "Saya belum pasti" }
      ]);
      return;
    }
    addMsg(raw, "user");
    const unsureAdult = /belum pasti|tak pasti|tak tahu|tiada siapa|tak ada siapa|saya tak percaya sesiapa|i don't know|no one/i.test(normalize(raw));
    state.trustedPerson = unsureAdult ? "Belum dikenal pasti; perlu bantuan orang dewasa di sekolah" : raw;
    state.followUpPlan = unsureAdult
      ? `Minta bantuan ${SCHOOL_HELP.trustedAdult} untuk menentukan langkah yang selamat.`
      : `Beritahu ${raw} tentang perkara yang berlaku.`;
    await botSay(simplify(wrap([
      unsureAdult
        ? `Tak apa kalau kamu belum tahu siapa. Kamu boleh mula dengan ${SCHOOL_HELP.trustedAdult} di ${SCHOOL_HELP.safePlace}.`
        : "Terima kasih. Kita sudah kenal pasti langkah untuk mendapatkan sokongan.",
      "Kamu tak perlu menghadapi perkara ini seorang diri.",
      "Jika kamu tidak selamat sekarang, pergi kepada orang dewasa yang dipercayai dengan segera."
    ])), { kind: "warn", text: "Langkah mendapatkan bantuan" });
    showSummaryModal();
    return;
  }

  // Safety-related answers to the smart follow-up are saved as part of the case
  // before entering the adult-support route (especially the family safety question).
  if (state.step === 4.5) {
    const clarifySafetyLevel = safetyLevelFromText(raw);
    if (clarifySafetyLevel !== "green") {
      state.clarifyA = raw;
      state.safetyFlag = clarifySafetyLevel;
      state.safetySupportMode = true;
      state.awaitingTypedField = null;
      addMsg(raw, "user");
      const clarificationSafety = safetyResponse(clarifySafetyLevel);
      if (clarificationSafety) await botSay(clarificationSafety.msg, clarificationSafety.tag, 220);
      await startSafetySupportFlow();
      return;
    }
  }

  // Immediate safety response for direct disclosures. This is a keyword aid,
  // not a diagnosis or confirmation. Store the original situation if it occurs at step 4.
  const lvl = safetyLevelFromText(raw);
  if (lvl !== "green") {
    state.safetyFlag = lvl;
    state.safetySupportMode = true;
    state.lastSafetyDisclosure = raw;
    state.awaitingTypedField = null;
    if (state.step === 4) {
      state.situation = raw;
      state.issueType = detectIssueType(raw, state.scenarioKey);
      state.detectedIssues = detectIssueTypes(raw, state.scenarioKey);
    } else if (state.step === 4.5) {
      state.clarifyA = raw;
    } else if (state.step === 4.8) {
      state.dynamicFollowUpA = raw;
    } else if (state.step === 5 && !state.thought) {
      state.thought = raw;
    } else if (state.step === 6 && !state.evidenceFor) {
      state.evidenceFor = raw;
    } else if (state.step === 7 && !state.evidenceAgainst) {
      state.evidenceAgainst = raw;
    } else if (state.step === 8 && !state.newThought) {
      state.newThought = raw;
    }
    addMsg(raw, "user");
    const safety = safetyResponse(lvl);
    if (safety) {
      await botSay(safety.msg, safety.tag, 220);
      if (lvl === "red" || lvl === "orange") {
        // Continue with a direct current-safety check after giving the immediate support message.
        // Keep the original disclosure in the case record; this is not a diagnosis.
        await startSafetySupportFlow();
      } else {
        setOptions("Pilih bantuan:", [
          { label: "🗣️ Ayat untuk minta tolong", value: "__help_script__" },
          { label: `📍 Pergi ${SCHOOL_HELP.safePlace}`, value: "__seek_safe_place__" },
          { label: "🔄 Mula semula", value: "__restart__" }
        ]);
      }
    }
    return;
  }

  // Handle text typed after the student chose “taip sendiri”.
  if (state.awaitingTypedField) {
    const field = state.awaitingTypedField;
    state.awaitingTypedField = null;
    addMsg(raw, "user");
    if (field === "clarify") {
      state.clarifyA = raw;
      await proceedToThought();
      return;
    }
    if (field === "thought") {
      state.thought = raw;
      state.distortion = detectDistortion(raw);
      await askEvidenceFor();
      return;
    }
    if (field === "evidenceFor") {
      state.evidenceFor = raw;
      await askEvidenceAgainst();
      return;
    }
    if (field === "evidenceAgainst") {
      state.evidenceAgainst = raw;
      await askBeliefAndNewThought();
      return;
    }
    if (field === "newThought") {
      state.newThought = raw;
      await askBeliefNew();
      return;
    }
    if (field === "dynamicFollowUp") {
      state.dynamicFollowUpA = raw;
      await proceedToThought();
      return;
    }
  }

  // Display a readable version of a selected thought instead of internal command.
  let displayRaw = raw;
  if (raw.startsWith("__new__")) displayRaw = raw.slice(7);
  else if (raw.startsWith("__beliefNew__")) displayRaw = raw.endsWith("skip") ? "Langkau skor fikiran baru" : `Skor fikiran baru: ${raw.replace("__beliefNew__", "")}/10`;
  addMsg(displayRaw, "user");

  const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;

  // A saved favourite can be opened directly from the start screen.
  if (state.step === 0 && GUIDES[raw]) {
    state.calmingAction = raw;
    state.step = 3;
    setProgress(3);
    await runGuide(raw, true);
    return;
  }

  if (state.step === 1) {
    const emotionAnswerKind = classifyShortResponse(raw);
    if (((source === INPUT_SOURCE.TYPED && ["unknown", "neutral", "prefer"].includes(emotionAnswerKind)) ||
         raw === "Tak pasti") && (state.emotionRetryCount || 0) < 1) {
      await askEmotionClarification();
      return;
    }
    state.emotion = emotionAnswerKind === "neutral" ? "Neutral" :
      (emotionAnswerKind === "unknown" || emotionAnswerKind === "prefer" ? "Tak pasti" : raw);
    state.step = 2;
    setProgress(2);
    await botSay(simplify(wrap([
      reflectEmotion(state.emotion), validateEmotion(state.emotion), gentleBridge(), naturalTransition("scale"),
      "Kalau 0 sampai 10, kuat mana perasaan itu sekarang?"
    ])), { kind: "info", text: "Skala emosi" });
    setOptions("Pilih nombor:", [2, 4, 6, 8, 10].map(n => ({ label: String(n), value: String(n) })));
    return;
  }

  if (state.step === 2) {
    const n = clamp(isNumberLike(raw) ? Number(raw) : 6, 0, 10);
    state.intensityPre = n;
    if (n >= 8) {
      state.step = 3;
      setProgress(3);
      await botSay(simplify(`Baik. Emosi kamu sekarang ${n}/10, jadi kita tenangkan hati dan badan dulu ya.`), { kind: "warn", text: "Tenang dulu" });
      setOptions("Pilih satu cara:", scenarioBoostTools(state.scenarioKey, state.emotion).slice(0, 5));
      return;
    }
    state.step = 4;
    setProgress(4);
    await botSay(simplify(wrap([`Baik. Emosi kamu ${n}/10.`, praiseSmall(), naturalTransition("situation"), "Sekarang, apa yang berlaku?"])), { kind: "info", text: "Situasi" });
    setOptions("Contoh:", [
      { label: scn.example, value: scn.example },
      { label: "Saya tak tahu nak cerita.", value: "tak tahu" }
    ]);
    return;
  }

  if (state.step === 3) {
    state.calmingAction = raw;
    const guided = await runGuide(state.calmingAction, true);
    if (guided) return;
    state.step = 4;
    setProgress(4);
    await botSay("Baik. Sekarang cerita ringkas apa yang berlaku.", { kind: "info", text: "Situasi" });
    setOptions("Contoh:", [
      { label: scn.example, value: scn.example },
      { label: "Saya tak tahu nak cerita.", value: "tak tahu" }
    ]);
    return;
  }

  if (state.step === 4) {
    const situationAnswerKind = classifyShortResponse(raw);

    if (situationAnswerKind === "prefer") {
      await botSay(simplify(wrap([
        "Tak apa. Kamu tak perlu cerita perkara yang belum selesa untuk dikongsi.",
        "Kita boleh cuba lagi dengan perlahan, belajar satu kemahiran, atau berhenti dahulu."
      ])), { kind: "info", text: "Ikut keselesaan kamu" });
      setOptions("Apa yang kamu mahu buat?", [
        { label: "Saya mahu cuba bercerita", value: "__situation_try_again__" },
        { label: "Saya mahu belajar cara menjaga emosi", value: "__situation_no_issue__" },
        { label: "Saya mahu berhenti dahulu", value: "__end_current_session__" }
      ]);
      return;
    }

    if (situationAnswerKind === "neutral") {
      await botSay(simplify(wrap([
        "Tak apa kalau sekarang rasa biasa-biasa saja.",
        "Kamu tak perlu reka masalah. Adakah ada perkara yang kamu mahu kongsi, atau kamu cuma mahu belajar cara menjaga emosi?"
      ])), { kind: "info", text: "Ikut keadaan kamu sekarang" });
      setOptions("Pilih yang paling dekat:", [
        { label: "Ada perkara yang saya mahu cerita", value: "__situation_try_again__" },
        { label: "Saya cuma mahu belajar cara menjaga emosi", value: "__situation_no_issue__" },
        { label: "Saya belum pasti", value: "__situation_try_again__" }
      ]);
      return;
    }

    if (handleIDontKnow(raw)) {
      await botSay(simplify(wrap([
        "Tak apa. Kamu boleh pilih contoh yang paling dekat, atau taip dengan perkataan sendiri.",
        "Tak perlu tulis panjang. Satu ayat pun cukup."
      ])), { kind: "info", text: "Pelan-pelan" });
      setOptions("Contoh:", [
        { label: scn.example, value: scn.example },
        { label: "Saya risau sebab peperiksaan.", value: "Saya risau sebab peperiksaan." },
        { label: "Saya malu sebab diejek.", value: "Saya malu sebab diejek." },
        { label: "Saya sedih sebab kawan tak ajak main.", value: "Saya sedih sebab kawan tak ajak main." }
      ]);
      return;
    }

    state.situation = raw;
    state.detectedIssues = detectIssueTypes(state.situation, state.scenarioKey);
    state.issueType = detectIssueType(state.situation, state.scenarioKey);

    // If the student mentions several non-urgent concerns, let them choose one to explore first.
    // Safety-related bullying is prioritised instead of being hidden among ordinary topics.
    if (state.detectedIssues.length > 1 && !state.detectedIssues.includes("bully")) {
      state.step = 4.4;
      state.additionalIssues = state.detectedIssues.slice();
      setProgress(4.4);
      const labels = state.detectedIssues.map(issueTypeLabel);
      await botSay(simplify(wrap([
        "Saya dengar ada beberapa perkara dalam cerita kamu.",
        `Saya tangkap perkara ini: ${labels.join(", ")}.`,
        "Kita tak perlu selesaikan semuanya sekali gus. Mana satu yang paling mengganggu kamu sekarang?"
      ])), { kind: "info", text: "Pilih fokus dahulu" });
      setOptions("Kita mula dengan satu perkara:", state.detectedIssues.map(type => ({
        label: issueTypeLabel(type),
        value: `__choose_issue__${type}`
      })));
      return;
    }

    state.additionalIssues = state.detectedIssues.filter(x => x !== state.issueType);
    if (state.issueType === "bully" && state.safetyFlag === "green") state.safetyFlag = "yellow";
    const suggested = detectEmotionsFromSituation(state.situation, state.scenarioKey);
    const current = state.emotion || "Neutral";
    if (needsConsistencyCheck(current, state.situation) && suggested.length) {
      await botSay(simplify(wrap([
        "Saya nak semak emosi sekejap supaya saya tak salah faham 🙂",
        `Emosi asal: “${current}”`, `Emosi lain yang mungkin dekat: ${suggested.join(" + ")}`,
        "Yang paling tepat untuk kamu?"
      ])), { kind: "info", text: "Semak emosi" });
      const opts = [{ label: `✅ Kekal: ${current}`, value: `__set_emotion__${current}` }];
      suggested.forEach(e => { if (e !== current) opts.push({ label: `⭐ Tukar: ${e}`, value: `__set_emotion__${e}` }); });
      setOptions("Pilih:", opts);
      return;
    }
    await askSmartFollowUp();
    return;
  }

  if (state.step === 4.4) {
    // Normally handled by the internal __choose_issue__ command above.
    await botSay("Pilih satu perkara daripada pilihan di atas supaya kita boleh fokus dahulu.", { kind: "info", text: "Pilih fokus" });
    return;
  }

  if (state.step === 4.5) {
    const answerKind = classifyShortResponse(raw);
    if (answerKind === "prefer") {
      state.clarifyA = "Murid memilih untuk tidak menjawab soalan tambahan buat masa ini.";
      await botSay(simplify(wrap([
        "Tak apa. Kamu tak perlu menjawab soalan ini jika belum selesa.",
        "Kita boleh teruskan berdasarkan perkara yang kamu sudah kongsi, atau berhenti dahulu."
      ])), { kind: "info", text: "Kamu boleh pilih" });
      setOptions("Apa yang kamu mahu buat?", [
        { label: "Teruskan perlahan-lahan", value: "__continue_without_clarify__" },
        { label: "Saya mahu berhenti dahulu", value: "__end_current_session__" }
      ]);
      return;
    }

    if (["unknown", "neutral"].includes(answerKind) && !["bully", "family"].includes(state.issueType) && state.clarifyRetryCount < 1) {
      state.clarifyRetryCount += 1;
      await botSay(simplify(wrap([
        "Tak apa kalau belum pasti.",
        "Saya cuba tanya dengan cara lebih mudah. Pilih yang paling dekat, atau pilih ‘Saya belum pasti’."
      ])), { kind: "info", text: "Soalan yang lebih mudah" });
      setOptions("Pilih satu:", clarifyRetryOptions(state.issueType));
      return;
    }

    state.clarifyA = answerKind === "unknown" || answerKind === "neutral" ? "Tak pasti" : raw;
    await continueAfterSmartFollowUp();
    return;
  }

  if (state.step === 4.8) {
    const followKind = classifyShortResponse(raw);
    if (followKind === "prefer") {
      await botSay(simplify("Tak apa. Kamu tak perlu menjawab soalan ini. Kita boleh teruskan berdasarkan perkara yang kamu sudah kongsi."), { kind: "info", text: "Ikut keselesaan kamu" });
      setOptions("Apa yang kamu mahu buat?", [
        { label: "Teruskan", value: "__continue_to_thought__" },
        { label: "Saya mahu berhenti dahulu", value: "__end_current_session__" }
      ]);
      return;
    }
    if (followKind === "unknown" && source === INPUT_SOURCE.TYPED && state.dynamicRetryCount < 1) {
      state.dynamicRetryCount += 1;
      await botSay(simplify("Tak apa kalau belum pasti. Pilih jawapan yang paling hampir, atau langkau soalan ini."), { kind: "info", text: "Jawapan ringkas" });
      const next = smartSecondFollowUp(state.issueType, state.clarifyA);
      setOptions("Pilih jawapan:", [
        ...(next?.options || []).map(o => ({ label: o.label, value: o.value })),
        { label: "Langkau soalan ini", value: "__skip_dynamic_followup__" }
      ]);
      return;
    }
    state.dynamicFollowUpA = (followKind === "unknown" || followKind === "neutral") ? "Tak pasti" : raw;
    await proceedToThought();
    return;
  }

  if (state.step === 5) {
    if (handleIDontKnow(raw)) {
      await botSay("Tak apa. Pilih satu fikiran yang paling dekat dengan kamu.", { kind: "info", text: "Fikiran" });
      setOptions("Pilih:", [
        { label: "Saya tak cukup bagus.", value: "Saya tak cukup bagus." },
        { label: "Saya pasti gagal.", value: "Saya pasti gagal." },
        { label: "Tak ada siapa tolong saya.", value: "Tak ada siapa tolong saya." }
      ]);
      return;
    }
    state.thought = raw;
    state.distortion = detectDistortion(state.thought);
    await askEvidenceFor();
    return;
  }

  if (state.step === 6) {
    state.evidenceFor = handleIDontKnow(raw) ? "Tak pasti" : raw;
    await askEvidenceAgainst();
    return;
  }

  if (state.step === 7) {
    state.evidenceAgainst = handleIDontKnow(raw) ? "Tak pasti" : raw;
    await askBeliefAndNewThought();
    return;
  }

  if (state.step === 8) {
    if (raw.startsWith("__beliefNew__")) {
      const v = raw.replace("__beliefNew__", "");
      state.beliefNew = v === "skip" ? null : clamp(Number(v), 0, 10);
      await askAction();
      return;
    }
    if (raw.startsWith("__new__")) {
      state.newThought = raw.slice(7).trim();
      await askBeliefNew();
      return;
    }
    if (isNumberLike(raw)) {
      state.beliefThought = clamp(Number(raw), 0, 10);
      await showNewThoughtOptions();
      return;
    }
    state.beliefThought = 6;
    await showNewThoughtOptions();
    return;
  }

  if (state.step === 9) {
    state.action = raw;
    if (raw === "__help_script__") { await showHelpScript(); return; }
    const guided = await runGuide(state.action, false);
    if (!guided) {
      await botSay("Baik. Itu satu langkah yang bagus. ✅", { kind: "ok", text: "Langkah dipilih" });
      await askPostIntensity();
    }
    return;
  }

  if (state.step === 10) {
    const n = clamp(isNumberLike(raw) ? Number(raw) : (state.intensityPre ?? 0), 0, 10);
    state.intensityPost = n;
    const delta = (state.intensityPre ?? 0) - n;
    if (state.action) updateToolScore(state.action, delta);
    let closing;
    if (n > state.intensityPre) {
      closing = wrap(["Terima kasih sebab teruskan sampai sini.", "Saya nampak emosi kamu masih berat atau terasa lebih kuat sekarang.", "Itu boleh berlaku apabila kita mula meluahkan perkara yang susah.", "Pilih langkah paling lembut atau beritahu orang dewasa yang kamu percaya ya."]);
    } else if (n === state.intensityPre) {
      closing = wrap(["Terima kasih sebab teruskan sampai sini.", "Perasaan kamu masih sama kuat, dan itu pun okay.", "Kadang-kadang hati perlukan masa lebih sedikit."]);
    } else {
      closing = wrap(["Bagus. Emosi kamu nampak sedikit lebih ringan sekarang.", "Walaupun kecil, itu tetap kemajuan yang baik."]);
    }
    await botSay(simplify(closing), { kind: "ok", text: "Penutup sesi" }, 220);
    await showMicroPlan();
    return;
  }

  if (state.step === 11) {
    let planText = "";
    if (raw === "plan_5min") {
      state.followUpPlan = "Buat 5 minit dahulu.";
      planText = "Baik. Selepas ini kamu cuma perlu buat 5 minit dahulu. Itu sudah cukup baik. 👍";
    } else if (raw === "plan_breath") {
      state.followUpPlan = "Guna Nafas Pelangi bila risau.";
      planText = "Baik. Bila rasa risau, kamu boleh guna Nafas Pelangi. 🌈";
    } else if (raw === "plan_talk_friend") {
      state.followUpPlan = "Cuba bercakap dengan seorang kawan yang dipercayai, jika saya rasa selesa dan selamat.";
      planText = "Baik. Pilih masa yang sesuai dan bercakap hanya jika kamu rasa selesa dan selamat. Kamu tak perlu memaksa diri. 💛";
    } else if (raw === "plan_record_event") {
      state.followUpPlan = "Catat perkara yang berlaku dan kongsikan dengan orang dewasa yang dipercayai.";
      planText = "Baik. Catat perkara yang kamu ingat dan tunjukkan kepada orang dewasa yang boleh membantu. Kamu tak perlu menghadapinya seorang diri. 📝";
    } else if (raw === "plan_tell_teacher") {
      state.followUpPlan = `Jumpa ${SCHOOL_HELP.trustedAdult}.`;
      planText = `Baik. Kamu akan jumpa ${SCHOOL_HELP.trustedAdult}. Itu satu langkah yang sangat berani. 🌟`;
    } else if (raw === "plan_selfkind") {
      state.followUpPlan = "Cakap baik dengan diri.";
      planText = "Baik. Bila hati susah, kamu akan cuba cakap baik dengan diri. Itu juga satu kekuatan. 💛";
    } else {
      planText = "Baik. Kamu boleh mula sesi baru bila sedia.";
    }
    await botSay(simplify(wrap([planText, BOT_CLOSING])), { kind: "ok", text: "Pelan siap" }, 200);
    renderSummaryView();
    showSummaryModal();
  }
}

// ====== Events ======
if (form) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    await handleUserInput(input?.value || "", INPUT_SOURCE.TYPED);
    if (input) {
      input.value = "";
      input.style.height = "auto";
      updateCharUI();
      input.focus();
    }
  });
}
if (input) {
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form?.requestSubmit();
    }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
    updateCharUI();
  });
}
function updateCharUI() {
  if (!input || !charCount || !charHint) return;
  const max = 280;
  const len = input.value.length;
  charCount.textContent = `${len}/${max}`;
  if (len > max) charHint.textContent = "Agak panjang. Boleh ringkaskan sedikit ya.";
  else if (len > 180) charHint.textContent = "Bagus. Ringkas pun tetap okay.";
  else charHint.textContent = "Tip: satu ayat pendek pun okay.";
}
resetBtn?.addEventListener("click", start);
kioskToggle?.addEventListener("change", () => {
  kioskMode = kioskToggle.checked;
  if (kioskMode && longToggle) longToggle.checked = false;
  start();
});
longToggle?.addEventListener("change", () => { longMode = !!longToggle.checked; setModeUI(); });
themeToggle?.addEventListener("change", applyTheme);
ttsToggle?.addEventListener("change", applyTTS);
privacyToggle?.addEventListener("change", setModeUI);
gradeSelect?.addEventListener("change", () => { applyKidsModeUI(); setModeUI(); });
document.querySelectorAll(".cardBtn").forEach(btn => btn.addEventListener("click", () => scenarioSelect(btn.dataset.scn)));
toBottomBtn?.addEventListener("click", scrollBottom);

// Summary events
closeSummary?.addEventListener("click", closeSummaryModal);
tabMurid?.addEventListener("click", () => { summaryView = "murid"; renderSummaryView(); });
tabGuru?.addEventListener("click", () => { summaryView = "guru"; renderSummaryView(); });
copySummary?.addEventListener("click", () => { copyText(buildRumusanSesi()); addMsg("Rumusan murid telah di-copy ✅", "bot", { kind: "ok", text: "Siap" }); });
copyTeacherSummary?.addEventListener("click", () => { copyText(buildTeacherSummary()); addMsg("Ringkasan guru telah di-copy ✅", "bot", { kind: "ok", text: "Siap" }); });
exportStats?.addEventListener("click", () => {
  const logs = loadJSON(LS_LOGS, []);
  copyText(JSON.stringify(logs[logs.length - 1] || null, null, 2));
  addMsg("Rekod sesi terakhir telah di-copy ✅", "bot", { kind: "ok", text: "Siap" });
});
newStudent?.addEventListener("click", () => {
  closeSummaryModal();
  if (kioskMode && studentIdEl) studentIdEl.value = "";
  start();
});

// Teacher modal
teacherBtn?.addEventListener("click", openTeacher);
closeTeacher?.addEventListener("click", closeTeacherModal);
closeTeacher2?.addEventListener("click", closeTeacherModal);
copyTeacher?.addEventListener("click", () => { copyText(buildTeacherGuide()); addMsg("Panduan guru telah di-copy ✅", "bot", { kind: "ok", text: "Siap" }); });

// Clear local data
clearDataBtn?.addEventListener("click", async () => {
  clearLocalData();
  await botSay("Dah padam data local (kegemaran dan statistik). ✅", { kind: "ok", text: "Clear" }, 180);
});

// ====== Init ======
resetState();
applyTheme();
applyTTS();
applyKidsModeUI();
setModeUI();
updateCharUI();
start();
