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

// ====== Input Source ======
const INPUT_SOURCE = { TYPED: "typed", OPTION: "option" };

// ====== Storage Keys ======
const LS_FAVS = "cbt_favs_final";
const LS_LOGS = "cbt_logs_final";
const LS_TOOL_SCORES = "cbt_tool_scores_final";

// ====== Identity ======
const BOT_NAME = "Kawan CBT";
const BOT_OPENING = "Hai, saya Kawan CBT. Kalau hati kamu rasa berat, kita boleh mula perlahan-lahan bersama.";
const BOT_CLOSING = "Hari ini kamu sudah buat satu langkah kecil yang berani. 🌈";
const BOT_STRENGTH_LABEL = "Kekuatan hari ini";

// ====== Help ======
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

// ====== Utils ======
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function normalize(s){ return (s || "").toLowerCase().trim(); }
function shorten(text, max=95){
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}
function isNumberLike(x){
  const n = Number(String(x).trim());
  return Number.isFinite(n);
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}
function saveJSON(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
}
function privacyOn(){ return !!privacyToggle?.checked; }
function canStore(){ return !privacyOn(); }

// ====== Grade mode ======
function gradeMode(){
  const v = gradeSelect?.value || "auto";
  if (v === "lower") return "lower";
  if (v === "upper") return "upper";
  if (kioskMode) return "lower";
  return "upper";
}

function shouldBeLong(){
  if (kioskMode) return false;
  if (gradeMode() === "lower") return false;
  if (state?.lastInputSource === INPUT_SOURCE.TYPED) return true;
  return !!longMode;
}

function wrap(parts){
  const clean = (parts || []).filter(Boolean);
  return shouldBeLong() ? clean.join("\n\n") : clean.join(" ");
}

function simplify(text){
  if (gradeMode() !== "lower") return text;
  return String(text)
    .replace(/kadang-kadang/g, "kadang")
    .replace(/perlahan-lahan/g, "pelan-pelan")
    .replace(/terima kasih kerana/gi, "terima kasih sebab")
    .replace(/dengan/gi, "dgn")
    .replace(/realistik/gi, "mudah dibuat")
    .replace(/mungkin tidak 100% betul/gi, "mungkin tak betul sepenuhnya");
}

function applyKidsModeUI(){
  document.body.classList.toggle("kidsMode", gradeMode() === "lower");
}

// ====== Normalization ======
const TEXT_ALIASES = [
  [/x tau|xtau|taktau|tak tau|tk tau|entah|idk/gi, "tak tahu"],
  [/xde|takde/gi, "tak ada"],
  [/sy|sya/gi, "saya"],
  [/aq|aku/gi, "saya"],
  [/diorg|dorang/gi, "mereka"],
  [/kwn|kawan2/gi, "kawan"],
  [/sbb/gi, "sebab"],
  [/mcm|cm|cam/gi, "macam"],
  [/tkt|takot/gi, "takut"],
  [/rsau|riso/gi, "risau"],
  [/sedey|sedeh/gi, "sedih"],
  [/xnak|taknak/gi, "tak nak"],
  [/mls/gi, "malas"],
  [/ckp/gi, "cakap"],
  [/jer/gi, "je"]
];

function canonicalizeUserText(text){
  let t = String(text || "").trim();
  TEXT_ALIASES.forEach(([pattern, replacement]) => {
    t = t.replace(pattern, replacement);
  });
  return t.replace(/\s+/g, " ").trim();
}

// ====== Personalization ======
function getToolScores(){ return loadJSON(LS_TOOL_SCORES, {}); }
function updateToolScore(action, delta){
  if (!canStore()) return;
  const scores = getToolScores();
  const rec = scores[action] || { uses:0, totalDelta:0 };
  rec.uses += 1;
  rec.totalDelta += delta;
  scores[action] = rec;
  saveJSON(LS_TOOL_SCORES, scores);
}
function rankTools(options){
  const scores = getToolScores();
  const withScore = options.map(o => {
    const rec = scores[o.value] || { uses:0, totalDelta:0 };
    const avg = rec.uses ? (rec.totalDelta / rec.uses) : 0;
    return { ...o, _avg: avg, _uses: rec.uses };
  });
  withScore.sort((a,b) => (b._avg - a._avg) || (b._uses - a._uses));
  return withScore.map(({_avg,_uses,...rest}) => rest);
}

// ====== Favorites ======
function getFavorites(){ return loadJSON(LS_FAVS, []); }
function addFavorite(name){
  if (!canStore()) return;
  const favs = getFavorites();
  if (!favs.includes(name)) favs.push(name);
  saveJSON(LS_FAVS, favs);
}
function clearLocalData(){
  localStorage.removeItem(LS_FAVS);
  localStorage.removeItem(LS_LOGS);
  localStorage.removeItem(LS_TOOL_SCORES);
}

// ====== TTS ======
function canTTS(){
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}
function speak(text){
  if (!ttsEnabled || !canTTS()) return;
  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ms-MY";
    u.rate = 1.0;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  }catch(e){}
}

// ====== UI messages ======
function makeAvatar(who){
  const a = document.createElement("div");
  a.className = `avatar ${who === "bot" ? "botA" : "userA"}`;
  a.textContent = who === "bot" ? "KCBT" : "ME";
  return a;
}

function addMsg(text, who="bot", tag=null){
  const row = document.createElement("div");
  row.className = `msg ${who}`;
  row.appendChild(makeAvatar(who));

  const wrapEl = document.createElement("div");
  wrapEl.className = "bubbleWrap";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (tag){
    const t = document.createElement("div");
    t.className = `tag ${tag.kind}`;
    t.textContent = tag.text;
    bubble.appendChild(t);
  }

  const content = document.createElement("div");
  content.textContent = text;
  bubble.appendChild(content);
  wrapEl.appendChild(bubble);

  if (who === "bot"){
    const actions = document.createElement("div");
    actions.className = "bubbleActions";

    const spk = document.createElement("button");
    spk.type = "button";
    spk.className = "spkBtn";
    spk.textContent = "🔊 Dengar";
    spk.addEventListener("click", () => speak(text));
    actions.appendChild(spk);

    wrapEl.appendChild(actions);
  }

  row.appendChild(wrapEl);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;

  if (who === "bot") speak(text);
}

function botTyping(delay=320){
  return new Promise(resolve => {
    const row = document.createElement("div");
    row.className = "msg bot";
    row.appendChild(makeAvatar("bot"));

    const wrapEl = document.createElement("div");
    wrapEl.className = "bubbleWrap";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
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

async function botSay(text, tag=null, delay=320){
  await botTyping(delay);
  addMsg(text, "bot", tag);
}

// ====== Warm language ======
function warmOpeners(){
  return [
    "Tak apa kalau susah nak mula. Satu perkataan pun boleh.",
    "Di sini, kamu tak perlu jawab dengan sempurna.",
    "Kita boleh mula pelan-pelan ya.",
    "Saya akan dengar dulu, kita tak perlu cepat."
  ];
}

function reflectEmotion(emotion){
  const e = (emotion || "").trim();
  if (!e) return "";
  return pick([
    `Saya dengar kamu rasa "${e}".`,
    `Baik, saya nampak perasaan "${e}" itu sedang kuat.`,
    `Oh… kamu rasa "${e}" sekarang.`,
    `Perasaan "${e}" itu memang penting.`
  ]);
}

function validateEmotion(emotion){
  const e = normalize(emotion);
  if (e.includes("takut")) return pick([
    "Rasa takut itu normal bila sesuatu terasa tak selamat.",
    "Bila takut, badan boleh rasa tegang. Itu biasa."
  ]);
  if (e.includes("marah")) return pick([
    "Marah itu boleh difahami bila rasa tak adil.",
    "Saya faham… marah boleh buat hati rasa panas."
  ]);
  if (e.includes("sedih")) return pick([
    "Sedih itu berat. Terima kasih sebab berani cerita.",
    "Bila sedih, hati memang boleh rasa sangat penat."
  ]);
  if (e.includes("risau") || e.includes("stress")) return pick([
    "Risau itu normal bila otak asyik fikir banyak benda.",
    "Bila risau, fikiran boleh jadi laju. Itu biasa."
  ]);
  if (e.includes("malu")) return pick([
    "Malu itu perasaan ramai orang rasa. Kamu tak sorang.",
    "Bila malu, kita rasa nak sorok. Itu normal."
  ]);
  if (e.includes("keliru")) return pick([
    "Keliru pun okay. Kadang hati bercampur-campur.",
    "Tak pasti apa rasa itu pun normal."
  ]);
  return pick([
    "Perasaan itu penting, dan saya dengar.",
    "Terima kasih sebab kongsi."
  ]);
}

function praiseSmall(){
  return pick([
    "Terima kasih sebab kongsi. Itu berani. 🌟",
    "Bagus. Kamu sedang cuba, dan itu penting. 👍",
    "Saya bangga kamu berani bercerita. 🌈",
    "Walaupun kecil, langkah ini tetap sangat baik. 💛"
  ]);
}

function gentleBridge(){
  return pick([
    "Kita buat satu langkah kecil dulu ya.",
    "Saya ada di sini, kita jalan satu-satu.",
    "Kita tak perlu cepat. Kita cuma perlu mula.",
    "Kita boleh buat dengan lembut dan perlahan."
  ]);
}

function naturalTransition(next){
  const bank = {
    emotion: [
      "Mula-mula, saya nak faham rasa kamu dulu.",
      "Kita tengok emosi kamu dulu ya.",
      "Mari kita kenal pasti rasa dalam hati dulu."
    ],
    scale: [
      "Lepas itu kita ukur sedikit, supaya saya lebih faham.",
      "Jom tengok kuat mana rasa itu sekarang.",
      "Kita bagi skor kecil supaya lebih jelas."
    ],
    situation: [
      "Sekarang boleh cerita apa yang berlaku?",
      "Baik, jom tengok cerita ringkasnya.",
      "Kalau kamu sedia, cerita sikit apa yang jadi."
    ],
    thought: [
      "Sekarang kita tengok apa yang otak kamu cakap masa itu.",
      "Bila itu berlaku, fikiran apa yang paling kuat muncul?",
      "Lepas tahu situasi, kita tengok fikiran pula."
    ],
    action: [
      "Sekarang kita cari satu langkah kecil yang boleh dibuat.",
      "Jom pilih tindakan kecil yang paling lembut dan sesuai.",
      "Mari cari satu langkah yang boleh bantu kamu sekarang."
    ]
  };
  return pick(bank[next] || ["Jom sambung langkah seterusnya."]);
}

function microCheckLine(){
  return pick([
    "Kalau saya tersalah faham, kamu boleh betulkan saya ya.",
    "Saya sedang cuba faham sebaik mungkin.",
    "Kita tak perlu tepat 100%, kita cuma cuba faham sedikit demi sedikit."
  ]);
}

function handleIDontKnow(text){
  const t = normalize(text);
  return [
    "tak tahu","tak pasti","entahlah","idk","x tau","xtau","saya tak tahu","tak tahu la","malas cakap","tak nak cakap"
  ].includes(t);
}

// ====== Emotion / situation helpers ======
function situationTone(situation){
  const t = normalize(situation);
  const neutral = ["biasa-biasa","biasa je","ok je","tak ada apa","saja","normal je","tak apa"];
  const positive = ["gembira","seronok","happy","best","lega","syukur"];
  const stressful = ["diejek","ejek","buli","dibuli","malu","tak nak sekolah","takut","menangis","sedih","marah","risau","cemas","panik","ugut","pukul","kasar","dimarah","jerit","sunyi","penat","stress"];
  if (stressful.some(w => t.includes(w))) return "stress";
  if (positive.some(w => t.includes(w))) return "positive";
  if (neutral.some(w => t.includes(w))) return "neutral";
  if (t.length <= 3) return "neutral";
  return "unknown";
}

function emotionGroup(emotion){
  const e = normalize(emotion);
  if (e.includes("sedih") || e.includes("kecewa") || e.includes("sunyi")) return "sad";
  if (e.includes("risau") || e.includes("cemas") || e.includes("stress") || e.includes("keliru")) return "anx";
  if (e.includes("marah")) return "angry";
  if (e.includes("takut")) return "fear";
  if (e.includes("malu")) return "shame";
  if (e.includes("neutral") || e.includes("biasa")) return "neutral";
  return "unknown";
}

function detectEmotionsFromSituation(situation, scenarioKey){
  const t = normalize(situation);
  const score = { Takut:0, Risau:0, Sedih:0, Marah:0, Malu:0, Stress:0, Neutral:0 };
  const add = (emo, n) => score[emo] = (score[emo] || 0) + n;

  if (["takut","cemas","panik","ugut","ancam","tak selamat"].some(w => t.includes(w))) add("Takut", 3);
  if (["risau","exam","peperiksaan","markah","ujian","stress","tertekan"].some(w => t.includes(w))) add("Risau", 3);
  if (["sedih","menangis","sunyi","tak ada kawan","kecewa"].some(w => t.includes(w))) add("Sedih", 3);
  if (["marah","geram","benci","tak adil"].some(w => t.includes(w))) add("Marah", 3);
  if (["malu","diejek","hina","ketawa"].some(w => t.includes(w))) add("Malu", 3);
  if (t.includes("stress")) add("Stress", 3);

  if (scenarioKey === "bully"){ add("Malu", 2); add("Takut", 2); }
  if (scenarioKey === "exam"){ add("Risau", 2); add("Stress", 2); }
  if (scenarioKey === "friend"){ add("Sedih", 2); add("Marah", 1); }
  if (scenarioKey === "teacher"){ add("Takut", 2); add("Malu", 1); }
  if (scenarioKey === "family"){ add("Sedih", 1); add("Risau", 1); }

  const sorted = Object.entries(score).sort((a,b)=>b[1]-a[1]);
  const out = [];
  if (sorted[0] && sorted[0][1] > 0) out.push(sorted[0][0]);
  if (sorted[1] && sorted[1][1] >= 3) out.push(sorted[1][0]);
  return out;
}

function needsConsistencyCheck(currentEmotion, situation){
  const eg = emotionGroup(currentEmotion);
  const st = situationTone(situation);
  const strongEmotion = (eg !== "neutral" && eg !== "unknown");
  if (strongEmotion && (st === "neutral" || st === "positive")) return true;
  if (eg === "neutral" && st === "stress") return true;
  return false;
}

function empathyExpandSituation(emotion, situation){
  const emo = (emotion || "").trim() || "tak sedap hati";
  const sShort = shorten((situation || "").trim(), 95);
  const eg = emotionGroup(emo);

  let bodyFeel = "Terima kasih sebab cerita. Ini membantu saya faham.";
  if (eg === "sad") bodyFeel = "Bila sedih, hati boleh rasa berat. Itu normal.";
  if (eg === "anx") bodyFeel = "Bila risau, fikiran boleh jadi laju dan badan terasa tegang. Itu biasa.";
  if (eg === "angry") bodyFeel = "Bila marah, hati boleh rasa panas. Itu boleh difahami.";
  if (eg === "fear") bodyFeel = "Bila takut, badan boleh rasa kaku atau tak selesa. Itu normal.";
  if (eg === "shame") bodyFeel = "Bila malu, kita rasa nak sembunyi. Tapi kamu tetap berharga.";

  return [
    `Terima kasih sebab bercerita. ${reflectEmotion(emo)}`,
    `Cerita kamu: "${sShort}"`,
    bodyFeel,
    pick([
      "Saya dengar kamu, dan kita boleh teruskan pelan-pelan.",
      "Kita tak perlu selesaikan semua sekarang.",
      "Saya faham ini mungkin bukan mudah untuk dikongsi."
    ])
  ].join("\n");
}

// ====== Safety ======
const RED_WORDS = [
  "bunuh","bunuh diri","nak mati","cedera diri","potong","gantung","rogol","dera","ugut bunuh","nak cederakan diri","tak nak hidup"
];
const ORANGE_WORDS = [
  "takut balik rumah","selalu kena pukul","tak boleh tidur","mimpi buruk","panic","cemas teruk","dibuli setiap hari","tak selamat","saya dah tak tahan","takut jumpa dia"
];
const YELLOW_WORDS = [
  "sunyi sangat","penat sangat","tak ada siapa peduli","tak nak datang sekolah","semua salah saya"
];

function safetyLevelFromText(text){
  const t = normalize(text);
  if (RED_WORDS.some(w => t.includes(w))) return "red";
  if (ORANGE_WORDS.some(w => t.includes(w))) return "orange";
  if (YELLOW_WORDS.some(w => t.includes(w))) return "yellow";
  return "green";
}

function safetyResponse(level){
  if (level === "red"){
    return {
      tag:{kind:"danger",text:"Keselamatan dulu"},
      msg: simplify(wrap([
        "Saya sangat risau tentang keselamatan kamu.",
        `Sekarang pergi ke tempat selamat: ${SCHOOL_HELP.safePlace}.`,
        `Jumpa orang dewasa yang dipercayai: ${SCHOOL_HELP.trustedAdult}.`,
        "Kamu tak perlu hadap ini seorang diri."
      ]))
    };
  }
  if (level === "orange"){
    return {
      tag:{kind:"warn",text:"Perlu bantuan orang dewasa"},
      msg: simplify(wrap([
        "Terima kasih sebab beritahu. Ini berat untuk tanggung seorang diri.",
        `Saya galakkan kamu jumpa ${SCHOOL_HELP.trustedAdult} di ${SCHOOL_HELP.safePlace}.`,
        "Kalau kamu mahu, saya boleh beri ayat untuk minta tolong."
      ]))
    };
  }
  if (level === "yellow"){
    return {
      tag:{kind:"warn",text:"Saya dengar ini berat"},
      msg: simplify(wrap([
        "Saya dengar hati kamu sedang sangat penat.",
        "Kita boleh teruskan perlahan-lahan, tapi kalau boleh beritahu juga orang dewasa yang kamu percaya ya."
      ]))
    };
  }
  return null;
}

// ====== Distortion ======
const DISTORTIONS = [
  { key:"all_or_nothing", name:"Hitam-putih", patterns:["mesti","selalu","tak pernah","semua","langsung"] },
  { key:"catastrophizing", name:"Membesar-besarkan", patterns:["teruk sangat","habis","hancur","pasti gagal","malu besar"] },
  { key:"mind_reading", name:"Membaca fikiran orang", patterns:["mereka fikir","dia fikir","semua orang ketawa","semua orang benci"] },
  { key:"labeling", name:"Melabel diri", patterns:["saya bodoh","saya teruk","saya gagal","saya lemah","saya tak berguna"] },
  { key:"overgeneral", name:"Generalisasi melampau", patterns:["setiap kali","sentiasa","semua kali"] },
  { key:"should", name:"‘Sepatutnya’ berat", patterns:["sepatutnya","patutnya"] },
];

function detectDistortion(thought){
  const t = normalize(thought);
  if (!t) return null;
  for (const d of DISTORTIONS){
    if (d.patterns.some(p => t.includes(p))) return d;
  }
  return null;
}

function reframeSuggestions(distortion, thought){
  const shortT = shorten(thought, 70);
  if (!distortion){
    return [
      "Mungkin ada cara. Saya cuba satu langkah kecil dulu.",
      "Saya belum boleh lagi, tapi saya sedang belajar.",
      "Ini susah, tapi saya boleh cuba satu-satu."
    ];
  }
  switch(distortion.key){
    case "all_or_nothing":
      return [
        "Tak perlu sempurna. Cukup cuba sedikit demi sedikit.",
        "Ada bahagian yang saya boleh buat, walaupun belum semua.",
        `Walaupun "${shortT}", mungkin masih ada jalan tengah.`
      ];
    case "catastrophizing":
      return [
        "Ini mungkin tak seteruk yang otak saya bayang.",
        "Kalau susah, saya masih boleh minta bantuan.",
        "Saya fokus apa yang boleh buat sekarang."
      ];
    case "mind_reading":
      return [
        "Saya belum pasti apa orang fikir. Saya tak perlu teka.",
        "Mungkin orang lain tak fikir seteruk itu.",
        "Saya boleh cakap dengan orang yang baik."
      ];
    case "labeling":
      return [
        "Satu kesilapan tak bermakna saya teruk.",
        "Saya murid yang sedang belajar.",
        "Saya boleh cuba lagi dengan cara baru."
      ];
    case "overgeneral":
      return [
        "Ini satu situasi, bukan semua situasi.",
        "Kadang jadi, kadang tidak.",
        "Saya cari satu contoh yang lebih baik."
      ];
    case "should":
      return [
        "Saya boleh cuba, tapi saya tak perlu tekan diri kuat sangat.",
        "Saya berhak belajar perlahan-lahan.",
        "Saya pilih satu langkah yang saya mampu buat."
      ];
    default:
      return reframeSuggestions(null, thought);
  }
}

// ====== Tool names ======
const GUIDES = {
  "Nafas Pelangi (Nafas 4-4-4 × 5 kali)": [
    "🌈 **Nafas Pelangi**",
    "Tarik nafas 4 kiraan.",
    "Tahan 4 kiraan.",
    "Hembus 4 kiraan.",
    "Ulang 5 kali."
  ],
  "Jejak Tenang (Grounding 5-4-3-2-1)": [
    "🌿 **Jejak Tenang**",
    "5 benda kamu nampak",
    "4 benda kamu sentuh",
    "3 bunyi kamu dengar",
    "2 bau kamu hidu",
    "1 benda kamu syukur"
  ],
  "Langkah Kecil Berani (Pecahkan tugas jadi 1 langkah kecil)": [
    "🧩 **Langkah Kecil Berani**",
    "Tulis tugasan.",
    "Pecah jadi bahagian kecil.",
    "Buat satu bahagian dulu selama 5 minit.",
    "Rehat sekejap, kemudian sambung."
  ],
  "Tiga Risau, Satu Langkah (Tulis 3 risau → pilih 1 langkah kecil)": [
    "✍️ **Tiga Risau, Satu Langkah**",
    "Tulis 3 perkara yang kamu risau.",
    "Pilih 1 yang paling ringan.",
    "Buat 1 langkah kecil sekarang."
  ],
  "Butang Bertenang (Stop–Nafas–Pilih)": [
    "🛑 **Butang Bertenang**",
    "STOP 3 saat.",
    "Nafas 3 kali perlahan.",
    "Pilih 1 tindakan baik."
  ],
  "Rehat Lembut (Minum air & rehat 2 minit)": [
    "💧 **Rehat Lembut**",
    "Minum beberapa teguk air.",
    "Relax bahu.",
    "Pandang satu tempat dan kira 20 saat."
  ],
  "Sudut Selamat (Pergi tempat selamat)": [
    "🛡️ **Sudut Selamat**",
    `Pergi ke: ${SCHOOL_HELP.safePlace}.`,
    `Jumpa: ${SCHOOL_HELP.trustedAdult}.`,
    "Cakap: “Cikgu, saya perlukan bantuan.”"
  ],
  "Ayat Baik untuk Diri (Cakap baik dengan diri)": [
    "💛 **Ayat Baik untuk Diri**",
    "Letak tangan di dada.",
    "Cakap perlahan: “Saya sedang susah, tapi saya masih berharga.”",
    "Ulang 3 kali."
  ],
  "Jambatan Kawan (Ayat mula semula dengan kawan)": [
    "🧑‍🤝‍🧑 **Jambatan Kawan**",
    "Contoh:",
    "“Saya masih nak berkawan, boleh kita cakap elok-elok?”",
    "“Kalau saya salah, saya minta maaf.”",
    "“Boleh kita mula semula?”"
  ],
  "Lima Minit Dulu (Buat 5 minit ulang kaji sahaja)": [
    "📚 **Lima Minit Dulu**",
    "Ambil satu buku sahaja.",
    "Buat 5 minit dahulu.",
    "Tanda satu bahagian yang siap.",
    "Rehat, kemudian sambung jika mampu."
  ],
  "Catat & Beritahu (Tulis apa yang berlaku & jumpa cikgu)": [
    "📝 **Catat & Beritahu**",
    "Tulis ringkas apa berlaku.",
    "Siapa terlibat.",
    "Bila berlaku.",
    "Tunjuk pada cikgu atau kaunselor."
  ]
};

const TOOLBOX = {
  Risau: [
    { label:"🌈 Nafas Pelangi", value:"Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
    { label:"🌿 Jejak Tenang", value:"Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label:"🧩 Langkah Kecil Berani", value:"Langkah Kecil Berani (Pecahkan tugas jadi 1 langkah kecil)" },
    { label:"✍️ Tiga Risau, Satu Langkah", value:"Tiga Risau, Satu Langkah (Tulis 3 risau → pilih 1 langkah kecil)" },
    { label:"💛 Ayat Baik untuk Diri", value:"Ayat Baik untuk Diri (Cakap baik dengan diri)" },
    { label:"🗣️ Ayat minta tolong", value:"__help_script__" }
  ],
  Marah: [
    { label:"🛑 Butang Bertenang", value:"Butang Bertenang (Stop–Nafas–Pilih)" },
    { label:"💧 Rehat Lembut", value:"Rehat Lembut (Minum air & rehat 2 minit)" },
    { label:"🌿 Jejak Tenang", value:"Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label:"💛 Ayat Baik untuk Diri", value:"Ayat Baik untuk Diri (Cakap baik dengan diri)" },
    { label:"🗣️ Ayat minta tolong", value:"__help_script__" }
  ],
  Sedih: [
    { label:"🌈 Nafas Pelangi", value:"Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
    { label:"🌿 Jejak Tenang", value:"Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label:"💧 Rehat Lembut", value:"Rehat Lembut (Minum air & rehat 2 minit)" },
    { label:"💛 Ayat Baik untuk Diri", value:"Ayat Baik untuk Diri (Cakap baik dengan diri)" },
    { label:"🗣️ Ayat minta tolong", value:"__help_script__" }
  ],
  Takut: [
    { label:"🛡️ Sudut Selamat", value:"Sudut Selamat (Pergi tempat selamat)" },
    { label:"🌈 Nafas Pelangi", value:"Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
    { label:"🌿 Jejak Tenang", value:"Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label:"📝 Catat & Beritahu", value:"Catat & Beritahu (Tulis apa yang berlaku & jumpa cikgu)" },
    { label:"🗣️ Ayat minta tolong", value:"__help_script__" }
  ],
  Malu: [
    { label:"🌈 Nafas Pelangi", value:"Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
    { label:"🌿 Jejak Tenang", value:"Jejak Tenang (Grounding 5-4-3-2-1)" },
    { label:"💧 Rehat Lembut", value:"Rehat Lembut (Minum air & rehat 2 minit)" },
    { label:"💛 Ayat Baik untuk Diri", value:"Ayat Baik untuk Diri (Cakap baik dengan diri)" },
    { label:"🗣️ Ayat minta tolong", value:"__help_script__" }
  ],
  Neutral: [
    { label:"💧 Rehat Lembut", value:"Rehat Lembut (Minum air & rehat 2 minit)" },
    { label:"🌈 Nafas Pelangi", value:"Nafas Pelangi (Nafas 4-4-4 × 5 kali)" }
  ]
};

function toolboxFor(emotion){
  const e = normalize(emotion);
  if (e.includes("risau") || e.includes("stress") || e.includes("keliru")) return TOOLBOX.Risau;
  if (e.includes("marah")) return TOOLBOX.Marah;
  if (e.includes("sedih")) return TOOLBOX.Sedih;
  if (e.includes("takut")) return TOOLBOX.Takut;
  if (e.includes("malu")) return TOOLBOX.Malu;
  return TOOLBOX.Neutral;
}

function scenarioBoostTools(scenarioKey, emotion){
  const base = toolboxFor(emotion);
  const extra = {
    exam: [
      { label:"📚 Lima Minit Dulu", value:"Lima Minit Dulu (Buat 5 minit ulang kaji sahaja)" },
      { label:"🧩 Langkah Kecil Berani", value:"Langkah Kecil Berani (Pecahkan tugas jadi 1 langkah kecil)" }
    ],
    bully: [
      { label:"🛡️ Sudut Selamat", value:"Sudut Selamat (Pergi tempat selamat)" },
      { label:"📝 Catat & Beritahu", value:"Catat & Beritahu (Tulis apa yang berlaku & jumpa cikgu)" }
    ],
    friend: [
      { label:"🧑‍🤝‍🧑 Jambatan Kawan", value:"Jambatan Kawan (Ayat mula semula dengan kawan)" },
      { label:"💛 Ayat Baik untuk Diri", value:"Ayat Baik untuk Diri (Cakap baik dengan diri)" }
    ],
    teacher: [
      { label:"💧 Rehat Lembut", value:"Rehat Lembut (Minum air & rehat 2 minit)" },
      { label:"💛 Ayat Baik untuk Diri", value:"Ayat Baik untuk Diri (Cakap baik dengan diri)" }
    ],
    family: [
      { label:"🌈 Nafas Pelangi", value:"Nafas Pelangi (Nafas 4-4-4 × 5 kali)" },
      { label:"📝 Catat & Beritahu", value:"Catat & Beritahu (Tulis apa yang berlaku & jumpa cikgu)" }
    ],
    other: []
  };

  const merged = [...(extra[scenarioKey] || []), ...base];
  const seen = new Set();
  return merged.filter(item => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
}

// ====== Scenarios ======
const SCENARIOS = {
  exam: {
    name:"Peperiksaan / Kerja Sekolah",
    example:"Saya risau bila exam sebab takut salah banyak.",
    thoughtOptions:[
      "Saya mesti dapat A, kalau tak saya gagal.",
      "Saya akan lupa semua.",
      "Saya memang tak pandai.",
      "Saya akan kecewakan cikgu atau ibu bapa."
    ]
  },
  bully: {
    name:"Buli / Diejek",
    example:"Saya malu dan takut sebab ada orang ejek saya.",
    thoughtOptions:[
      "Mereka semua ketawakan saya.",
      "Saya tak selamat di sekolah.",
      "Tak ada siapa akan tolong saya.",
      "Ini salah saya."
    ]
  },
  friend: {
    name:"Kawan / Bergaduh",
    example:"Saya sedih sebab kawan tak nak main dengan saya.",
    thoughtOptions:[
      "Mereka tak suka saya.",
      "Saya tak penting.",
      "Saya tak ada kawan.",
      "Saya akan keseorangan."
    ]
  },
  teacher: {
    name:"Dimarah Cikgu",
    example:"Saya takut bila cikgu marah saya.",
    thoughtOptions:[
      "Cikgu benci saya.",
      "Saya budak nakal.",
      "Saya memang teruk."
    ]
  },
  family: {
    name:"Keluarga / Di rumah",
    example:"Saya sedih atau risau di rumah sebab dimarah.",
    thoughtOptions:[
      "Ini semua salah saya.",
      "Mereka tak sayang saya.",
      "Saya tak berguna."
    ]
  },
  other: {
    name:"Lain-lain",
    example:"Saya rasa risau tentang sesuatu di sekolah.",
    thoughtOptions:[
      "Saya tak cukup bagus.",
      "Semua akan jadi teruk.",
      "Saya tak boleh buat apa-apa."
    ]
  }
};

// ====== State ======
const STEPS_TOTAL = 11;

function resetState(){
  state = {
    step: 0,
    studentId: "",
    scenarioKey: null,
    scenarioName: "",
    emotion: "",
    intensityPre: 0,
    intensityPost: null,
    intensityTrend: null,
    situation: "",
    clarifyQ: "",
    clarifyA: "",
    thought: "",
    distortion: null,
    evidenceFor: "",
    evidenceAgainst: "",
    beliefThought: null,
    newThought: "",
    beliefNew: null,
    calmingAction: "",
    action: "",
    lastInputSource: INPUT_SOURCE.OPTION,
    kioskAutoTimer: null,
    safetyFlag: "green",
    followUpPlan: "",
    strengthOfDay: ""
  };
}

// ====== Step explain ======
function explainForStep(step){
  const map = {
    0: "Pilih situasi supaya Kawan CBT faham konteks kamu.",
    1: "Kenal pasti emosi sekarang.",
    2: "Skor 0–10 bantu kita faham kuatnya emosi.",
    3: "Bila emosi kuat, kita tenang dulu.",
    4: "Cerita ringkas apa yang berlaku.",
    4.5: "Satu soalan ringkas supaya lebih jelas.",
    5: "Cari fikiran yang paling kuat muncul.",
    6: "Lihat apa yang membuat fikiran itu terasa betul.",
    7: "Lihat juga apa yang menunjukkan fikiran itu mungkin tak sepenuhnya betul.",
    8: "Bina fikiran baru yang lebih lembut dan seimbang.",
    9: "Pilih tindakan kecil yang sesuai.",
    10: "Semak semula emosi selepas tindakan.",
    11: "Rumusan dan pelan kecil selepas ini."
  };
  return gradeMode() === "lower" ? simplify(map[step] || "Langkah seterusnya.") : (map[step] || "Langkah seterusnya.");
}

// ====== UI state ======
function setOptions(title, options){
  optionsTitle.textContent = title || "Pilih jawapan (atau taip):";
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
function clearOptions(){ optionsEl.innerHTML = ""; }

function setProgress(step){
  let s = step;
  if (s === 4.5) s = 5;
  const shown = clamp(Math.round(s), 0, STEPS_TOTAL);
  stepPill.textContent = `Langkah: ${shown}/${STEPS_TOTAL}`;
  progressBar.style.width = `${(shown / STEPS_TOTAL) * 100}%`;
  stepExplain.textContent = `Penerangan: ${explainForStep(step)}`;
}

function setModeUI(){
  const theme = document.body.classList.contains("dark") ? "Gelap" : "Ceria";
  const verbose = shouldBeLong() ? "Mendalam" : "Ringkas";
  modePill.textContent = `Mode: ${kioskMode ? "Kiosk" : "Normal"} • ${verbose} • Tema: ${theme} • ${privacyOn() ? "Privasi ON" : "Privasi OFF"}`;
  hintPill.textContent = kioskMode ? "Tip: guna butang" : "Tip: boleh taip";
}

function applyTheme(){
  document.body.classList.toggle("dark", !!themeToggle?.checked);
  setModeUI();
}
function applyTTS(){
  ttsEnabled = !!ttsToggle?.checked;
  if (ttsEnabled && !canTTS()){
    ttsEnabled = false;
    ttsToggle.checked = false;
    addMsg("Maaf, browser ini tidak menyokong suara. Cuba Chrome atau Edge ya.", "bot", {kind:"warn", text:"Suara"});
  }
}
function scrollBottom(){ chat.scrollTop = chat.scrollHeight; }

// ====== Teacher ======
function buildTeacherGuide(){
  return [
    "✅ Ayat yang membantu:",
    "• “Terima kasih sebab beritahu saya.”",
    "• “Saya dengar kamu rasa ____. Itu masuk akal.”",
    "• “Jom buat satu langkah kecil dulu.”",
    "",
    "✅ Soalan lembut:",
    "• “Apa yang berlaku?”",
    "• “Apa yang kamu perlukan sekarang?”",
    "• “Adakah kamu rasa selamat sekarang?”",
    "",
    "❌ Elakkan:",
    "• “Itu benda kecil sahaja.”",
    "• “Jangan fikir macam tu.”",
    "• “Awak over sangat.”",
    "",
    "🚨 Rujuk segera jika:",
    "• Murid sebut cederakan diri / dera / ancaman.",
    "• Murid takut balik rumah / takut jumpa seseorang.",
    "• Murid tunjuk tanda tidak selamat.",
    "",
    `📍 Tempat selamat: ${SCHOOL_HELP.safePlace}`,
    `👥 Orang dewasa: ${SCHOOL_HELP.trustedAdult}`
  ].join("\n");
}

function openTeacher(){
  teacherContent.textContent = buildTeacherGuide();
  teacherModal.classList.remove("hidden");
}
function closeTeacherModal(){ teacherModal.classList.add("hidden"); }

// ====== Help script ======
async function showHelpScript(){
  addMsg("Saya nak ayat untuk minta tolong", "user");
  const lines = [
    "Baik. Kamu boleh guna ayat ini:",
    ...SCHOOL_HELP.helpLines.map((x,i)=>`${i+1}) ${x}`),
    "",
    `Pergi ke: ${SCHOOL_HELP.safePlace}`,
    `Jumpa: ${SCHOOL_HELP.trustedAdult}`
  ];
  await botSay(simplify(lines.join("\n")), { kind:"warn", text:"Ayat bantuan" });
  setOptions("Lepas itu:", [
    { label:"✅ Saya akan jumpa cikgu", value:"Saya akan jumpa cikgu sekarang." },
    { label:"🔄 Mula semula", value:"__restart__" }
  ]);
}

// ====== Guides ======
async function runGuide(actionValue, isCalming=false){
  const lines = GUIDES[actionValue];
  if (!lines) return false;

  await botSay(simplify(lines.join("\n")), { kind:"info", text: isCalming ? "Tenang dulu" : "Panduan lembut" });

  const favs = getFavorites();
  const isFav = favs.includes(actionValue);

  setOptions("Dah siap buat? (pilih satu)", [
    { label:"✅ Ya, saya sudah buat", value:"__done_action__" },
    { label:"🔁 Ulang panduan", value:"__repeat_action__" },
    { label: isFav ? "⭐ Sudah disimpan" : "⭐ Simpan kaedah ini", value:"__bookmark__" },
    { label:"🗣️ Ayat untuk minta tolong", value:"__help_script__" }
  ]);
  return true;
}

// ====== Summary ======
function buildStrengthOfDay(){
  const map = [];
  if (state.situation) map.push("kamu berani bercerita");
  if (state.thought) map.push("kamu cuba memahami fikiran sendiri");
  if (state.newThought) map.push("kamu cuba memilih fikiran yang lebih lembut");
  if (state.action || state.calmingAction) map.push("kamu memilih satu langkah kecil");
  return map[map.length - 1] || "kamu sudi mula mencuba";
}

function buildWarmProgressNote(){
  if (typeof state.intensityPre !== "number" || typeof state.intensityPost !== "number"){
    return "Apa yang paling penting: kamu sudah cuba memahami hati sendiri hari ini.";
  }
  if (state.intensityPost < state.intensityPre){
    return "Perasaan kamu nampak sedikit lebih ringan. Walaupun kecil, itu tetap kemajuan yang baik.";
  }
  if (state.intensityPost === state.intensityPre){
    return "Perasaan kamu masih sama kuat. Itu pun okay. Kadang-kadang hati perlukan lebih masa.";
  }
  return "Perasaan kamu nampak lebih kuat sedikit selepas bercerita. Itu boleh berlaku bila hati mula meluahkan benda yang berat. Sekarang lebih baik buat langkah paling lembut atau cari orang dewasa yang dipercayai.";
}

function buildRumusanSesi(){
  state.strengthOfDay = buildStrengthOfDay();

  return simplify([
    "💛 RUMUSAN BERSAMA KAWAN CBT",
    "",
    `Hari ini, saya dengar cerita kamu tentang: ${state.situation || state.scenarioName || "-"}`,
    `Perasaan utama kamu: ${state.emotion || "-"}`,
    `Skor emosi kamu: ${state.intensityPre ?? "-"} / 10 → ${state.intensityPost ?? "-"} / 10`,
    "",
    state.thought ? `Fikiran yang paling kuat tadi: ${state.thought}` : "Fikiran yang paling kuat tadi: -",
    state.newThought ? `Fikiran baru yang lebih lembut: ${state.newThought}` : "Fikiran baru yang lebih lembut: -",
    state.action || state.calmingAction ? `Langkah kecil yang kamu pilih: ${state.action || state.calmingAction}` : "Langkah kecil yang kamu pilih: -",
    state.followUpPlan ? `Pelan kecil selepas ini: ${state.followUpPlan}` : "Pelan kecil selepas ini: -",
    "",
    `${BOT_STRENGTH_LABEL}: Hari ini kamu menunjukkan bahawa ${state.strengthOfDay}.`,
    "",
    `Nota daripada ${BOT_NAME}:`,
    buildWarmProgressNote(),
    "",
    BOT_CLOSING
  ].join("\n"));
}

function buildTeacherSummary(){
  let progressFlag = "Tidak pasti";
  if (typeof state.intensityPre === "number" && typeof state.intensityPost === "number"){
    if (state.intensityPost < state.intensityPre) progressFlag = "Berkurang";
    else if (state.intensityPost === state.intensityPre) progressFlag = "Kekal";
    else progressFlag = "Meningkat";
  }

  return [
    "👩‍🏫 RINGKASAN GURU / KAUNSELOR",
    "",
    `Kod murid: ${state.studentId || "-"}`,
    `Kategori dipilih: ${state.scenarioName || "-"}`,
    `Cerita murid: ${state.situation || "-"}`,
    `Emosi utama: ${state.emotion || "-"}`,
    `Skor emosi: ${state.intensityPre ?? "-"} / 10 → ${state.intensityPost ?? "-"} / 10`,
    `Perubahan: ${progressFlag}`,
    `Safety flag: ${state.safetyFlag || "green"}`,
    `Fikiran asal: ${state.thought || "-"}`,
    `Fikiran baru: ${state.newThought || "-"}`,
    `Tindakan dipilih: ${state.action || state.calmingAction || "-"}`,
    `Pelan kecil: ${state.followUpPlan || "-"}`,
    "",
    progressFlag === "Meningkat"
      ? `Cadangan: semak semula keadaan murid dan pertimbang follow-up dengan ${SCHOOL_HELP.trustedAdult}.`
      : "Cadangan: teruskan pemantauan ringan dan galakkan langkah kecil yang dipilih."
  ].join("\n");
}

function renderSummaryView(){
  summaryContent.textContent = summaryView === "guru" ? buildTeacherSummary() : buildRumusanSesi();
  tabMurid?.classList.toggle("active", summaryView === "murid");
  tabGuru?.classList.toggle("active", summaryView === "guru");
}

function showSummaryModal(){
  clearOptions();
  summaryView = "murid";
  renderSummaryView();
  summaryModal.classList.remove("hidden");
  newStudent.textContent = kioskMode ? "Sesi Murid Seterusnya" : "Sesi Baharu";

  if (canStore()){
    const logs = loadJSON(LS_LOGS, []);
    logs.push({
      ts: new Date().toISOString(),
      scenario: state.scenarioName || "",
      situation: state.situation || "",
      emotion: state.emotion || "",
      pre: state.intensityPre ?? null,
      post: state.intensityPost ?? null,
      calming: state.calmingAction || "",
      action: state.action || "",
      thought: state.thought || "",
      newThought: state.newThought || "",
      safetyFlag: state.safetyFlag || "green",
      followUpPlan: state.followUpPlan || "",
      strengthOfDay: state.strengthOfDay || ""
    });
    saveJSON(LS_LOGS, logs.slice(-200));
  }
}

function closeSummaryModal(){ summaryModal.classList.add("hidden"); }
function copyText(text){ navigator.clipboard?.writeText(text).catch(()=>{}); }

// ====== Kiosk ======
function scheduleKioskAutoReset(){
  if (!kioskMode) return;
  if (state.kioskAutoTimer) clearInterval(state.kioskAutoTimer);

  let left = 10;
  state.kioskAutoTimer = setInterval(() => {
    left -= 1;
    if (left <= 0){
      clearInterval(state.kioskAutoTimer);
      state.kioskAutoTimer = null;
      if (studentIdEl) studentIdEl.value = "";
      start();
    }
  }, 1000);
}

// ====== Clarify ======
function needClarifyQ(situationText){
  const t = normalize(situationText);
  const hasTime = ["hari ini","semalam","minggu","pagi","petang","malam","tadi","baru"].some(w=>t.includes(w));
  const hasWho = ["kawan","dia","mereka","cikgu","ibu","ayah","adik","abang","kakak","orang"].some(w=>t.includes(w));

  if (!hasTime) return "Ini berlaku bila? (hari ini / semalam / minggu lepas)";
  if (!hasWho) return "Dengan siapa ini berlaku? (kawan / cikgu / keluarga)";
  return "";
}

// ====== Flow helpers ======
function showScenarioPrompt(){
  scenarioArea.style.display = "block";

  const favs = getFavorites();
  const favBtn = favs.length ? [{ label:`⭐ Kegemaran: ${shorten(favs[0], 22)}`, value:"__show_favs__" }] : [];

  setOptions("Tip: pilih satu situasi di atas untuk mula.", [
    ...favBtn,
    { label:"Saya nak mula tanpa pilih", value:"__skip_scenario__" }
  ]);
  state.step = 0;
  setProgress(0);
}

async function scenarioSelect(key){
  const scn = SCENARIOS[key] || SCENARIOS.other;
  state.scenarioKey = key;
  state.scenarioName = scn.name;
  scenarioArea.style.display = "none";

  addMsg(`Saya pilih: ${scn.name}`, "user");
  state.step = 1;
  setProgress(1);

  await botSay(simplify(wrap([
    "Baik. Terima kasih sebab memilih situasi ini.",
    praiseSmall(),
    naturalTransition("emotion"),
    "Emosi kamu sekarang apa?"
  ])), { kind:"info", text:"Mula bersama" });

  setOptions("Pilih emosi:", [
    { label:"😟 Risau", value:"Risau" },
    { label:"😡 Marah", value:"Marah" },
    { label:"😢 Sedih", value:"Sedih" },
    { label:"😨 Takut", value:"Takut" },
    { label:"😳 Malu", value:"Malu" },
    { label:"😵 Stress", value:"Stress" },
    { label:"😕 Keliru", value:"Keliru" },
    { label:"😐 Neutral", value:"Neutral" },
    { label:"😐 Tak pasti", value:"Tak pasti" }
  ]);
}

async function proceedToThought(){
  const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;
  state.step = 5;
  setProgress(5);

  await botSay(simplify(wrap([
    praiseSmall(),
    empathyExpandSituation(state.emotion, state.situation),
    microCheckLine(),
    naturalTransition("thought"),
    "Bila itu berlaku, apa fikiran paling kuat dalam kepala kamu?"
  ])), { kind:"info", text:"Fikiran" });

  const list = (scn.thoughtOptions || []).map(x => ({ label:x, value:x }));
  setOptions("Pilih fikiran:", [
    ...list,
    { label:"Saya tak pasti", value:"tak pasti" }
  ]);
}

async function askEvidenceFor(){
  state.step = 6;
  setProgress(6);
  await botSay(simplify(wrap([
    "Sekarang kita lihat satu perkara dulu.",
    "Ada apa-apa yang membuat fikiran itu terasa betul?",
    "Satu ayat pendek pun okay."
  ])), { kind:"info", text:"Lihat apa yang menyokong" });

  setOptions("Contoh:", [
    { label:"Tak pasti", value:"tak pasti" },
    { label:"Saya belum buat latihan lagi.", value:"Saya belum buat latihan lagi." },
    { label:"Mereka memang ketawa tadi.", value:"Mereka memang ketawa tadi." }
  ]);
}

async function askEvidenceAgainst(){
  state.step = 7;
  setProgress(7);
  await botSay(simplify(wrap([
    "Baik. Sekarang kita lihat satu sisi lagi.",
    "Ada tak perkara yang menunjukkan fikiran itu mungkin tak sepenuhnya betul?",
    "Contohnya: pernah berjaya, ada bantuan, atau ada bahagian yang lebih baik daripada yang kamu sangka."
  ])), { kind:"info", text:"Lihat sisi lain" });

  setOptions("Contoh:", [
    { label:"Tak pasti", value:"tak pasti" },
    { label:"Saya pernah berjaya sebelum ini.", value:"Saya pernah berjaya sebelum ini." },
    { label:"Ada cikgu atau kawan yang boleh bantu.", value:"Ada cikgu atau kawan yang boleh bantu." }
  ]);
}

async function askBeliefAndNewThought(){
  state.step = 8;
  setProgress(8);
  await botSay(simplify(wrap([
    "Baik. Sekarang saya nak faham satu perkara lagi.",
    "Fikiran asal itu terasa kuat mana dalam hati kamu?",
    "(0 = tak percaya, 10 = sangat percaya)"
  ])), { kind:"info", text:"Skor fikiran asal" });

  setOptions("Pilih nombor:", [
    {label:"2", value:"2"},
    {label:"4", value:"4"},
    {label:"6", value:"6"},
    {label:"8", value:"8"},
    {label:"10", value:"10"}
  ]);
}

async function showNewThoughtOptions(){
  const hints = reframeSuggestions(state.distortion, state.thought);
  await botSay(simplify(wrap([
    "Baik, saya faham. Fikiran itu memang terasa kuat masa itu.",
    "Sekarang mari pilih satu fikiran baru yang lebih lembut dan lebih adil untuk diri kamu."
  ])), { kind:"info", text:"Fikiran baru" });

  setOptions("Cadangan:", [
    { label:`🌤️ ${hints[0]}`, value:"__new__" + hints[0] },
    { label:`🌤️ ${hints[1]}`, value:"__new__" + hints[1] },
    { label:`🌤️ ${hints[2]}`, value:"__new__" + hints[2] },
    { label:"Saya nak taip sendiri", value:"__new__Saya boleh cuba satu-satu dulu." }
  ]);
}

async function askBeliefNew(){
  await botSay(simplify(wrap([
    "Bila baca fikiran baru itu, ia terasa meyakinkan berapa kuat?",
    "(0–10, atau langkau jika tak mahu jawab)"
  ])), { kind:"info", text:"Skor fikiran baru" });

  setOptions("Pilih:", [
    {label:"2", value:"__beliefNew__2"},
    {label:"4", value:"__beliefNew__4"},
    {label:"6", value:"__beliefNew__6"},
    {label:"8", value:"__beliefNew__8"},
    {label:"10", value:"__beliefNew__10"},
    {label:"Langkau", value:"__beliefNew__skip"}
  ]);
}

async function askAction(){
  state.step = 9;
  setProgress(9);

  const tbBase = scenarioBoostTools(state.scenarioKey, state.emotion);
  const favs = getFavorites();
  const favBtns = favs.slice(0,2).map(f => ({ label:`⭐ ${shorten(f,22)}`, value:f }));
  const ranked = rankTools(tbBase.filter(x => !String(x.value).startsWith("__")));
  const merged = [
    ...favBtns,
    ...ranked,
    ...tbBase.filter(x => String(x.value).startsWith("__"))
  ];

  await botSay(simplify(wrap([
    naturalTransition("action"),
    "Saya susun pilihan yang nampak paling sesuai untuk kamu sekarang."
  ])), { kind:"info", text:"Langkah kecil" });

  setOptions("Pilih satu langkah kecil:", merged);
}

async function askPostIntensity(){
  state.step = 10;
  setProgress(10);
  await botSay(simplify("Sebelum kita tamat, emosi kamu sekarang kuat mana (0–10)?"), { kind:"info", text:"Skor selepas" });

  setOptions("Pilih nombor:", [
    {label:"0", value:"0"},
    {label:"2", value:"2"},
    {label:"4", value:"4"},
    {label:"6", value:"6"},
    {label:"8", value:"8"},
    {label:"10", value:"10"}
  ]);
}

async function showMicroPlan(){
  state.step = 11;
  setProgress(11);

  await botSay(simplify("Sebelum sesi tamat, jom pilih satu pelan kecil selepas ini."), { kind:"ok", text:"Pelan kecil" });

  setOptions("Pilih satu pelan:", [
    { label:"🧩 Saya akan buat 5 minit dahulu", value:"plan_5min" },
    { label:"🌈 Saya akan guna Nafas Pelangi bila risau", value:"plan_breath" },
    { label:"👩‍🏫 Saya akan jumpa cikgu / kaunselor", value:"plan_tell_teacher" },
    { label:"💛 Saya akan cakap baik dengan diri", value:"plan_selfkind" },
    { label:"🔄 Mula sesi baru", value:"__restart__" }
  ]);

  scheduleKioskAutoReset();
}

// ====== Start ======
async function start(){
  chat.innerHTML = "";
  resetState();

  kioskMode = !!kioskToggle?.checked;
  longMode = kioskMode ? false : !!longToggle?.checked;

  applyTheme();
  applyTTS();
  applyKidsModeUI();
  setModeUI();
  setProgress(0);

  await botSay(simplify(wrap([
    BOT_OPENING,
    pick(warmOpeners()),
    "Pilih situasi untuk mula ya."
  ])), { kind:"ok", text:"Selamat datang" });

  showScenarioPrompt();
}

// ====== Main handler ======
async function handleUserInput(text, source=INPUT_SOURCE.TYPED){
  const raw = canonicalizeUserText((text || "").trim());
  if (!raw) return;

  kioskMode = !!kioskToggle?.checked;
  longMode = kioskMode ? false : !!longToggle?.checked;
  ttsEnabled = !!ttsToggle?.checked;
  applyKidsModeUI();

  state.lastInputSource = source;
  setModeUI();
  state.studentId = (studentIdEl?.value || "").trim();

  if (raw === "__restart__"){ await start(); return; }
  if (raw === "__skip_scenario__"){ await scenarioSelect("other"); return; }
  if (raw === "__help_script__"){ await showHelpScript(); return; }

  if (raw === "__show_favs__"){
    const favs = getFavorites();
    if (!favs.length){
      await botSay("Belum ada kegemaran lagi. Nanti kamu boleh simpan bila guna satu panduan. ⭐", {kind:"info", text:"Kegemaran"});
      return;
    }
    await botSay("Pilih kaedah kegemaran kamu:", {kind:"info", text:"Kegemaran"});
    setOptions("Pilih:", favs.slice(0,8).map(x => ({label:`⭐ ${shorten(x,28)}`, value:x})));
    return;
  }

  if (raw === "__bookmark__"){
    const name = state.action || state.calmingAction;
    if (name) addFavorite(name);
    await botSay(`Dah simpan ⭐: ${name || "-"}`, {kind:"ok", text:"Disimpan"}, 200);
    return;
  }

  if (raw === "__repeat_action__"){
    addMsg("Ulang panduan", "user");
    const name = state.action || state.calmingAction;
    await runGuide(name, state.step === 3);
    return;
  }

  if (raw === "__done_action__"){
    addMsg("Saya sudah buat ✅", "user");

    if (state.step === 3){
      await botSay("Bagus. Kamu sudah cuba menenangkan diri. 🌿", {kind:"ok", text:"Hebat"});
      state.step = 4;
      setProgress(4);
      const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;
      await botSay(simplify(wrap([
        naturalTransition("situation"),
        "Apa yang berlaku? Cerita ringkas ya."
      ])), {kind:"info", text:"Situasi"});
      setOptions("Contoh:", [
        { label: scn.example, value: scn.example },
        { label:"Saya tak tahu nak cerita.", value:"tak tahu" }
      ]);
      return;
    }

    if (state.step === 9){
      await botSay("Bagus. Kamu sudah buat langkah kecil itu. 🌟", {kind:"ok", text:"Siap"});
      await askPostIntensity();
      return;
    }
    return;
  }

  const lvl = safetyLevelFromText(raw);
  if (lvl !== "green"){
    state.safetyFlag = lvl;
    addMsg(raw, "user");
    const s = safetyResponse(lvl);
    if (s){
      await botSay(s.msg, s.tag, 240);
      setOptions("Pilih bantuan:", [
        { label:"🗣️ Ayat untuk minta tolong", value:"__help_script__" },
        { label:`📍 Pergi ${SCHOOL_HELP.safePlace}`, value:`Saya akan pergi ke ${SCHOOL_HELP.safePlace}.` },
        { label:"🔄 Mula semula", value:"__restart__" }
      ]);
    }
    return;
  }

  addMsg(raw, "user");

  const scn = SCENARIOS[state.scenarioKey] || SCENARIOS.other;

  if (raw.startsWith("__set_emotion__")){
    state.emotion = raw.replace("__set_emotion__", "").trim() || state.emotion;
    const q = needClarifyQ(state.situation);
    if (q){
      state.clarifyQ = q;
      state.step = 4.5;
      setProgress(4.5);
      await botSay(simplify(`Soalan ringkas: ${q}`), {kind:"info", text:"Soalan ringkas"});
      setOptions("Contoh:", [
        { label:"Hari ini", value:"Hari ini" },
        { label:"Semalam", value:"Semalam" },
        { label:"Dengan kawan", value:"Dengan kawan" },
        { label:"Dengan cikgu", value:"Dengan cikgu" }
      ]);
      return;
    }
    await proceedToThought();
    return;
  }

  if (state.step === 1){
    state.emotion = raw;
    state.step = 2;
    setProgress(2);

    await botSay(simplify(wrap([
      reflectEmotion(state.emotion),
      validateEmotion(state.emotion),
      gentleBridge(),
      naturalTransition("scale"),
      "Kalau 0 sampai 10, kuat mana perasaan itu sekarang?"
    ])), {kind:"info", text:"Skala emosi"});

    setOptions("Pilih nombor:", [
      {label:"2", value:"2"},
      {label:"4", value:"4"},
      {label:"6", value:"6"},
      {label:"8", value:"8"},
      {label:"10", value:"10"}
    ]);
    return;
  }

  if (state.step === 2){
    let n = isNumberLike(raw) ? Number(raw) : 6;
    n = clamp(n, 0, 10);
    state.intensityPre = n;

    if (n >= 8){
      state.step = 3;
      setProgress(3);

      await botSay(simplify(`Baik. Emosi kamu sekarang ${n}/10, jadi kita tenangkan hati dan badan dulu ya.`), {kind:"warn", text:"Tenang dulu"});

      const tb = scenarioBoostTools(state.scenarioKey, state.emotion);
      setOptions("Pilih satu cara:", tb.slice(0,5));
      return;
    }

    state.step = 4;
    setProgress(4);

    await botSay(simplify(wrap([
      `Baik. Emosi kamu ${n}/10.`,
      praiseSmall(),
      naturalTransition("situation"),
      "Sekarang, apa yang berlaku?"
    ])), {kind:"info", text:"Situasi"});
    setOptions("Contoh:", [
      { label: scn.example, value: scn.example },
      { label:"Saya tak tahu nak cerita.", value:"tak tahu" }
    ]);
    return;
  }

  if (state.step === 3){
    state.calmingAction = raw;
    const guided = await runGuide(state.calmingAction, true);
    if (guided) return;

    state.step = 4;
    setProgress(4);
    await botSay("Baik. Sekarang cerita ringkas apa yang berlaku.", {kind:"info", text:"Situasi"});
    setOptions("Contoh:", [
      { label: scn.example, value: scn.example },
      { label:"Saya tak tahu nak cerita.", value:"tak tahu" }
    ]);
    return;
  }

  if (state.step === 4){
    if (handleIDontKnow(raw)){
      await botSay("Tak apa. Pilih satu contoh ayat yang paling dekat ya.", {kind:"info", text:"Pelan-pelan"});
      setOptions("Pilih:", [
        { label: scn.example, value: scn.example },
        { label:"Saya risau sebab exam.", value:"Saya risau sebab exam." },
        { label:"Saya malu sebab diejek.", value:"Saya malu sebab diejek." },
        { label:"Saya marah sebab kawan cakap kasar.", value:"Saya marah sebab kawan cakap kasar." }
      ]);
      return;
    }

    state.situation = raw;
    const suggested = detectEmotionsFromSituation(state.situation, state.scenarioKey);
    const current = state.emotion || "Neutral";

    if (needsConsistencyCheck(current, state.situation) && suggested.length){
      await botSay(simplify(wrap([
        "Saya nak semak emosi sekejap supaya saya tak salah faham 🙂",
        `Emosi asal: "${current}"`,
        `Mungkin emosi yang dekat: ${suggested.join(" + ")}`,
        "Yang paling tepat sekarang?"
      ])), {kind:"info", text:"Semak emosi"});

      const opts = [{label:`✅ Kekal: ${current}`, value:`__set_emotion__${current}`}];
      suggested.forEach(e => opts.push({label:`⭐ Tukar: ${e}`, value:`__set_emotion__${e}`}));
      setOptions("Pilih:", opts);
      return;
    }

    const q = needClarifyQ(state.situation);
    if (q){
      state.clarifyQ = q;
      state.step = 4.5;
      setProgress(4.5);

      await botSay(simplify(wrap([
        "Saya ada satu soalan ringkas ya:",
        q
      ])), {kind:"info", text:"Soalan ringkas"});

      setOptions("Contoh:", [
        { label:"Hari ini", value:"Hari ini" },
        { label:"Semalam", value:"Semalam" },
        { label:"Dengan kawan", value:"Dengan kawan" },
        { label:"Dengan cikgu", value:"Dengan cikgu" }
      ]);
      return;
    }

    await proceedToThought();
    return;
  }

  if (state.step === 4.5){
    state.clarifyA = raw;
    state.step = 5;
    await proceedToThought();
    return;
  }

  if (state.step === 5){
    if (handleIDontKnow(raw)){
      await botSay("Tak apa. Pilih satu fikiran yang paling dekat dengan kamu.", {kind:"info", text:"Fikiran"});
      setOptions("Pilih:", [
        { label:"Saya tak cukup bagus.", value:"Saya tak cukup bagus." },
        { label:"Saya pasti gagal.", value:"Saya pasti gagal." },
        { label:"Tak ada siapa tolong saya.", value:"Tak ada siapa tolong saya." }
      ]);
      return;
    }
    state.thought = raw;
    state.distortion = detectDistortion(state.thought);
    await askEvidenceFor();
    return;
  }

  if (state.step === 6){
    state.evidenceFor = handleIDontKnow(raw) ? "Tak pasti" : raw;
    await askEvidenceAgainst();
    return;
  }

  if (state.step === 7){
    state.evidenceAgainst = handleIDontKnow(raw) ? "Tak pasti" : raw;
    await askBeliefAndNewThought();
    return;
  }

  if (state.step === 8){
    if (raw.startsWith("__beliefNew__")){
      const v = raw.replace("__beliefNew__", "");
      state.beliefNew = (v === "skip") ? null : clamp(Number(v), 0, 10);
      await askAction();
      return;
    }
    if (raw.startsWith("__new__")){
      state.newThought = raw.replace("__new__", "").trim();
      await askBeliefNew();
      return;
    }

    let n = isNumberLike(raw) ? Number(raw) : 6;
    n = clamp(n, 0, 10);
    state.beliefThought = n;
    await showNewThoughtOptions();
    return;
  }

  if (state.step === 9){
    state.action = raw;

    if (raw === "__help_script__"){
      await showHelpScript();
      return;
    }

    const guided = await runGuide(state.action, false);
    if (!guided){
      await botSay("Baik. Itu satu langkah yang bagus. ✅", {kind:"ok", text:"Langkah dipilih"});
      await askPostIntensity();
    }
    return;
  }

  if (state.step === 10){
    let n = isNumberLike(raw) ? Number(raw) : state.intensityPre;
    n = clamp(n, 0, 10);
    state.intensityPost = n;

    const delta = (state.intensityPre ?? 0) - (state.intensityPost ?? 0);
    if (state.action) updateToolScore(state.action, delta);

    let shortClosing = "Baik. Saya sudah susun rumusan lembut untuk kamu. 🌈";
    if (typeof state.intensityPre === "number" && typeof state.intensityPost === "number"){
      if (state.intensityPost > state.intensityPre){
        shortClosing = simplify(wrap([
          "Terima kasih sebab teruskan sampai sini.",
          "Saya nampak emosi kamu masih berat, atau mungkin lebih terasa sedikit sekarang.",
          "Itu boleh berlaku bila hati mula meluahkan perkara yang susah.",
          "Lepas ini, pilih langkah paling lembut atau beritahu orang dewasa yang kamu percaya ya."
        ]));
      } else if (state.intensityPost === state.intensityPre){
        shortClosing = simplify(wrap([
          "Terima kasih sebab teruskan sampai sini.",
          "Perasaan kamu masih sama kuat, dan itu pun okay.",
          "Kadang-kadang hati perlukan masa lebih sedikit."
        ]));
      } else {
        shortClosing = simplify(wrap([
          "Bagus. Emosi kamu nampak sedikit lebih ringan sekarang.",
          "Walaupun kecil, itu tetap kemajuan yang baik."
        ]));
      }
    }

    await botSay(shortClosing, {kind:"ok", text:"Penutup sesi"}, 240);
    showSummaryModal();
    await showMicroPlan();
    return;
  }

  if (state.step === 11){
    let planText = "";

    if (raw === "plan_5min"){
      state.followUpPlan = "Buat 5 minit dahulu.";
      planText = "Baik. Selepas ini kamu cuma perlu buat 5 minit dahulu. Itu sudah cukup baik. 👍";
    } else if (raw === "plan_breath"){
      state.followUpPlan = "Guna Nafas Pelangi bila risau.";
      planText = "Baik. Bila rasa risau, kamu boleh guna Nafas Pelangi. 🌈";
    } else if (raw === "plan_tell_teacher"){
      state.followUpPlan = `Jumpa ${SCHOOL_HELP.trustedAdult}.`;
      planText = `Baik. Kamu akan jumpa ${SCHOOL_HELP.trustedAdult}. Itu satu langkah yang sangat berani. 🌟`;
    } else if (raw === "plan_selfkind"){
      state.followUpPlan = "Cakap baik dengan diri.";
      planText = "Baik. Bila hati susah, kamu akan cuba cakap baik dengan diri. Itu juga satu kekuatan. 💛";
    } else {
      planText = "Baik. Kamu boleh mula sesi baru bila sedia.";
    }

    await botSay(simplify(wrap([
      planText,
      BOT_CLOSING
    ])), {kind:"ok", text:"Pelan siap"}, 200);

    setOptions("Pilihan:", [
      { label:"🔄 Mula semula", value:"__restart__" }
    ]);
    return;
  }
}

// ====== Events ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await handleUserInput(input.value, INPUT_SOURCE.TYPED);
  input.value = "";
  input.style.height = "auto";
  updateCharUI();
  input.focus();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
  updateCharUI();
});

function updateCharUI(){
  const max = 280;
  const len = (input.value || "").length;
  charCount.textContent = `${len}/${max}`;
  if (len > max){
    charHint.textContent = "Agak panjang. Boleh ringkaskan sedikit ya.";
  } else if (len > 180){
    charHint.textContent = "Bagus. Ringkas pun tetap okay.";
  } else {
    charHint.textContent = "Tip: satu ayat pendek pun okay.";
  }
}

resetBtn?.addEventListener("click", start);

kioskToggle?.addEventListener("change", () => {
  kioskMode = kioskToggle.checked;
  if (kioskMode && longToggle) longToggle.checked = false;
  start();
});

longToggle?.addEventListener("change", () => {
  longMode = !!longToggle.checked;
  setModeUI();
});

themeToggle?.addEventListener("change", applyTheme);
ttsToggle?.addEventListener("change", applyTTS);
privacyToggle?.addEventListener("change", () => setModeUI());
gradeSelect?.addEventListener("change", () => {
  applyKidsModeUI();
  setModeUI();
});

document.querySelectorAll(".cardBtn").forEach(btn => {
  btn.addEventListener("click", () => scenarioSelect(btn.dataset.scn));
});

toBottomBtn?.addEventListener("click", scrollBottom);

// ====== Summary events ======
closeSummary?.addEventListener("click", () => summaryModal.classList.add("hidden"));

tabMurid?.addEventListener("click", () => {
  summaryView = "murid";
  renderSummaryView();
});

tabGuru?.addEventListener("click", () => {
  summaryView = "guru";
  renderSummaryView();
});

copySummary?.addEventListener("click", () => {
  copyText(buildRumusanSesi());
  addMsg("Rumusan murid telah di-copy ✅", "bot", { kind:"ok", text:"Siap" });
});

copyTeacherSummary?.addEventListener("click", () => {
  copyText(buildTeacherSummary());
  addMsg("Ringkasan guru telah di-copy ✅", "bot", { kind:"ok", text:"Siap" });
});

exportStats?.addEventListener("click", () => {
  const logs = loadJSON(LS_LOGS, []);
  const last = logs[logs.length - 1] || null;
  copyText(JSON.stringify(last, null, 2));
  addMsg("Statistik telah di-copy ✅", "bot", { kind:"ok", text:"Siap" });
});

newStudent?.addEventListener("click", () => {
  summaryModal.classList.add("hidden");
  if (kioskMode && studentIdEl) studentIdEl.value = "";
  start();
});

// ====== Teacher modal ======
teacherBtn?.addEventListener("click", openTeacher);
closeTeacher?.addEventListener("click", closeTeacherModal);
closeTeacher2?.addEventListener("click", closeTeacherModal);
copyTeacher?.addEventListener("click", () => {
  copyText(buildTeacherGuide());
  addMsg("Panduan guru telah di-copy ✅", "bot", { kind:"ok", text:"Siap" });
});

// ====== Clear ======
clearDataBtn?.addEventListener("click", async () => {
  clearLocalData();
  await botSay("Dah padam data local (kegemaran dan statistik). ✅", {kind:"ok", text:"Clear"}, 200);
});

// ====== Init ======
resetState();
applyTheme();
applyTTS();
applyKidsModeUI();
setModeUI();
updateCharUI();
start();