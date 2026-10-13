/*
 * Kawan CBT 4.2 — Smart Context Layer (local, deterministic, no network).
 * Understands common Malay / Malay-English pupil phrasing and selects relevant prompts.
 * NOT a generative AI, diagnosis, crisis assessment or confirmation of facts.
 * When unsure it asks the pupil instead of inventing explanations.
 */
(function (root) {
  "use strict";
  const normalize = (value) => String(value == null ? "" : value)
    .toLowerCase().normalize("NFKC")
    .replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim()
    .replace(/\b(?:diorg|dorang|diorang)\b/g, "mereka")
    .replace(/\b(?:kwn2|kwn)\b/g, "kawan")
    .replace(/\b(?:xtau|x tau|taktau|tak tau|idk)\b/g, "tak tahu")
    .replace(/\b(?:sbb)\b/g, "sebab")
    .replace(/\b(?:tkt|takot)\b/g, "takut");

  const rules = [
    {id:"reported", issue:"other", weight:0, re:/\b(?:dah|sudah|pernah)\s+(?:beritahu|lapor|mengadu|adu(?:kan)?)\s+(?:cikgu|guru|kaunselor|ibu|ayah|mak|bapa)|\b(?:reported (?:it|this) to (?:a )?teacher)\b/gi},
    {id:"money", issue:"bully", weight:8, re:/\b(?:minta(?:k)?|ambil|paksa(?:\s+beri)?|peras|ugut)\s+(?:(?:duit|wang)|(?:saya|aku)\s+(?:beri|bagi)\s+duit)\b|\b(?:duit|wang)\s+(?:saya|aku)\s+(?:diambil|dirampas)\b|\b(?:extort|forced to give money)\b/gi},
    {id:"physical", issue:"bully", weight:9, re:/\b(?:kena\s+)?(?:pukul|dipukul|tampar|ditampar|tendang|ditendang|ditolak|tarik tudung|ditarik tudung|tolak(?:[- ]tolak)?|baling air|dicederakan)\b|\b(?:hit me|kicked me|pushed me|slapped me)\b/gi},
    {id:"threat", issue:"bully", weight:9, re:/\b(?:ugut|diugut|ancam|diancam|paksa|peras ugut|threaten(?:ed)? me)\b/gi},
    {id:"mocking", issue:"bully", weight:6, re:/\b(?:ejek|diejek|mengejek|hina|dihina|gelakkan|ketawakan|ketawa(?:kan)?\s+saya|mocked|teas(?:e|ed|ing))\b/gi},
    {id:"parent_name", issue:"bully", weight:8, re:/\b(?:ejek|diejek|sebut|main-main(?:kan)?)\s+(?:nama\s+)?(?:bapa|ayah|mak|ibu)(?:\s+saya)?\b|\b(?:nama\s+(?:bapa|ayah|mak|ibu))\s+(?:saya\s+)?(?:diejek|disebut|diusik)\b/gi},
    {id:"mind_reading", issue:"friend", weight:4, re:/\b(?:saya rasa|saya fikir|saya ingat)\s+(?:semua orang|kawan(?: saya)?|mereka|dia)\s+(?:tak suka|tak sayang|benci|tak peduli)|\b(?:semua orang|mereka)\s+(?:benci|tak suka)\s+saya\b/gi},
    {id:"left_out", issue:"friend", weight:7, re:/\b(?:tak|tidak|x)\s+(?:ajak|diajak|layan|dilayan|pilih|dipilih|nak\s+kawan)\b|\b(?:dipulau|tersisih|disisih|tinggal(?:kan)? saya|exclude(?:d)? me|left me out)\b/gi},
    {id:"group", issue:"friend", weight:4, re:/\b(?:geng|sekumpulan|satu kumpulan|ramai-ramai|kumpulan kawan|trio|bertiga|dua orang kawan)\b/gi},
    {id:"not_close", issue:"friend", weight:6, re:/\b(?:bukan kawan(?:\s+rapat)?|tak rapat|cuma main (?:bola|bersama)|hanya main (?:bola|bersama)|kawan biasa|just play(?:ing)? together)\b/gi},
    {id:"friend_conflict", issue:"friend", weight:5, re:/\b(?:gaduh|bergaduh|salah faham|tak nak berkawan|tak mahu berkawan|merajuk|tak reply|kawan)\b/gi},
    {id:"teacher_unfair", issue:"teacher", weight:8, re:/\b(?:cikgu|guru|teacher)\b.{0,45}\b(?:salah faham|salah sangka|marah|tuduh|tak percaya|pilih kasih|tak adil)\b|\b(?:dituduh|dimarah|dimarahi)\b.{0,35}\b(?:cikgu|guru|teacher)\b|\b(?:padahal saya (?:tak|tidak))\b/gi},
    {id:"teacher", issue:"teacher", weight:5, re:/\b(?:dimarah cikgu|cikgu marah|guru marah|kena marah cikgu|teacher shouted)\b/gi},
    {id:"study", issue:"exam", weight:7, re:/\b(?:exam|peperiksaan|ujian|markah|gagal|homework|kerja sekolah|ulang kaji|ulangkaji|pelajaran|tak faham topik)\b/gi},
    {id:"family", issue:"family", weight:5, re:/\b(?:ibu|ayah|mak|bapa|keluarga|adik|abang|kakak|orang tua)\b.{0,40}\b(?:marah|gaduh|pisah|bercerai|tak dengar|tinggal|sakit)\b|\b(?:di rumah|kat rumah|balik rumah|parents arguing)\b/gi},
    {id:"bereavement", issue:"family", weight:7, re:/\b(?:takut|risau|bimbang)\b.{0,35}\b(?:meninggal|mati|hilang (?:ibu|ayah|mak|bapa))\b/gi},
    {id:"loneliness", issue:"friend", weight:5, re:/\b(?:tak ada kawan|tiada kawan|sorang-sorang|bersendirian|sunyi|lonely)\b/gi}
  ];
  const emotionRules = [
    ["Takut", /\b(?:takut|takot|gerun|scared|afraid|fear)\b/gi],
    ["Risau", /\b(?:risau|cemas|bimbang|gelisah|worry|worried|anxious|anxiety)\b/gi],
    ["Sedih", /\b(?:sedih|kecewa|menangis|terluka|sunyi|lonely|sad|crying)\b/gi],
    ["Marah", /\b(?:marah|geram|bengang|menyampah|angry|furious)\b/gi],
    ["Malu", /\b(?:malu|segan|embarrassed|ashamed)\b/gi],
    ["Stress", /\b(?:stress|stres|tertekan|penat sangat|overwhelmed)\b/gi],
    ["Gembira", /\b(?:gembira|seronok|bahagia|lega|happy|relieved)\b/gi]
  ];
  const skip = /^(?:tak tahu|tak pasti|entah(?:lah)?|idk|ntah|tak reti|susah nak (?:jawab|cerita)|saya tak tahu)[.!?\s]*$/i;
  const refuse = /\b(?:tak nak cerita|tak mahu cerita|tak selesa(?:\s+nak\s+cerita)?|jangan tanya|tak nak cakap|nak berhenti|stop dulu|leave me alone|malas cakap|rahsia|tak nak jawab)\b/i;
  const request = /\b(?:tolong|bantu|apa (?:saya )?perlu buat|macam mana|bagaimana|what should i do|help me|boleh bantu)\b/i;
  const correction = /^(?:bukan|tak betul|salah|sebenarnya|maksud saya|no,|bukan macam itu)\b/i;
  const ongoing = /\b(?:masih|sekarang|hingga kini|sampai sekarang|setiap hari|tiap hari|selalu|berulang|lagi|tak berhenti|belum berhenti|still|every day)\b/i;
  const past = /\b(?:dulu|tahun lepas|masa tahun|dah berhenti|sudah berhenti|tak lagi|tak berlaku lagi|dah tak|sudah tak|now stopped|last year)\b/i;
  const negator = /\b(?:tak|tidak|bukan|belum|never|not|don't|didn't|doesn't|no)\b/i;
  const negationBefore = /\b(?:tak|tidak|bukan|belum|never|not|don't|didn't|doesn't|no)(?:\s+pernah)?\s+(?:(?:kena|jadi|berlaku|melakukan|buat|rasa|ada|pun)\s+)?$/i;
  const noLongerBefore = /\b(?:tak lagi|tidak lagi|dah tak|sudah tak|tidak pernah|tak pernah|not|never)\s*$/i;
  const shortQuote = text => String(text || "").replace(/\s+/g," ").trim().slice(0,110);

  function isNegated(t, start, length) {
    const left = t.slice(Math.max(0,start-42),start);
    const right = t.slice(start+length,Math.min(t.length,start+length+16));
    if (/\b(?:tak|tidak|belum)\s+berhenti\s*$/i.test(left)) return false;
    if (negationBefore.test(left) || noLongerBefore.test(left)) return true;
    if (/^(?:\s+(?:lagi|pun))?\s*(?:tidak|tak)\s+berlaku\b/i.test(right)) return true;
    return false;
  }
  function matchedFacts(t) {
    const facts=[];
    for (const rule of rules) {
      rule.re.lastIndex=0;
      let m;
      while ((m=rule.re.exec(t))!==null) {
        if (!isNegated(t,m.index,m[0].length)) facts.push({id:rule.id,issue:rule.issue,weight:rule.weight,phrase:m[0]});
        if(m.index===rule.re.lastIndex) rule.re.lastIndex++;
      }
    }
    return facts;
  }
  function parseEmotion(t) {
    const found=[];
    for(const [name,re] of emotionRules) {
      re.lastIndex=0; let m;
      while((m=re.exec(t))!==null) {
        const left=t.slice(Math.max(0,m.index-24),m.index);
        if (name==="Marah" && /\b(?:cikgu|guru|teacher|ayah|ibu|mak|bapa|kawan|nak|mahu|ingin|hendak)\s*$/i.test(left)) continue;
        if(!isNegated(t,m.index,m[0].length)) { found.push({name,index:m.index}); break; }
        if(m.index===re.lastIndex) re.lastIndex++;
      }
    }
    return found.length ? found.sort((a,b)=>a.index-b.index)[0].name : null;
  }
  function getIntent(t) {
    if(skip.test(t)) return "unsure";
    if(refuse.test(t) || /\b(?:tidak mahu|tak mahu|tidak nak)\s+(?:cerita|bercakap|menjawab|jawab)\b/i.test(t)
      || /\b(?:belum sedia|belum bersedia|tak ready|not ready)\s+(?:nak|untuk)?\s*(?:cerita|kongsi|jawab|bercakap)?\b/i.test(t)) return "decline";
    if(correction.test(t)) return "correct";
    if(request.test(t)) return "help";
    return "share";
  }
  function timeOf(t) {
    if(ongoing.test(t) && past.test(t)) return "mixed";
    if(ongoing.test(t)) return "current";
    if(past.test(t)) return "past";
    return "unknown";
  }
  function analyze(text, context={}) {
    const t=normalize(text);
    const facts=matchedFacts(t);
    const score={}; for(const f of facts) score[f.issue]=(score[f.issue]||0)+f.weight;
    const chosen=Object.entries(score).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1])[0];
    const issue=chosen ? chosen[0] : (context.issue||"other");
    const intent=getIntent(t);
    const emotion=parseEmotion(t);
    const themes=[...new Set(facts.map(x=>x.id))];
    const temporal=timeOf(t);
    const harm=themes.some(x=>["physical","threat","money"].includes(x));
    const dangerWords= /\b(?:bunuh diri|nak mati|mahu mati|tak nak hidup|tak mahu hidup|cedera diri|potong diri|kill myself|want to die|suicide|self harm)\b/i.test(t);
    const denySelfHarm= /\b(?:tak|tidak|bukan|never|not|don't)\s+(?:nak|mahu|ingin|akan|pernah|want to|going to)\s+(?:bunuh diri|mati|cedera diri|potong diri|kill myself|die|hurt myself)\b/i.test(t);
    const risk=dangerWords&&!denySelfHarm?"red":(harm && temporal!=="past" && facts.length>0?"orange": "green");
    return {raw:text, normalized:t, facts, issue, emotion, themes, intent, temporal,
      risk, specificity:themes.length, confidence:chosen?Math.min(.95,.45+chosen[1]*.045):.15,
      requestsHelp:intent==="help", unknown:intent==="unsure", declined:intent==="decline"};
  }

  function contextualReflection(a, previous={}) {
    if(!a) return "";
    if(a.intent==="decline") return "Tak apa, kamu tak perlu cerita perkara yang belum selesa dikongsi.";
    if(a.intent==="unsure") return "Tak apa kalau belum tahu hendak jawab. Kita boleh pilih soalan lebih mudah atau langkau.";
    const ts=a.temporal==="past"?"Kamu sebut perkara ini pernah berlaku dahulu. ":
      a.temporal==="current"?"Saya dengar perkara ini mungkin masih berlaku sekarang. ":
      a.temporal==="mixed"?"Saya dengar ada perkara yang pernah berlaku dan ada perkara yang masih berlaku. ":"";
    const bits=a.themes;
    if(bits.includes("money") && bits.includes("reported")) return ts+"Kamu cerita tentang orang meminta duit dan kamu sudah cuba memberitahu orang dewasa. Jika masih berlaku, kita perlu fikirkan sokongan lanjut yang lebih selamat.";
    if(bits.includes("money")) return ts+"Kamu cerita tentang orang meminta duit. Kamu berhak meminta bantuan, terutama jika ada tekanan atau ugutan.";
    if(bits.includes("physical")) return ts+"Kamu menyebut perbuatan yang boleh menyakitkan tubuh. Perkara itu perlu diambil serius, bukan salah kamu.";
    if(bits.includes("parent_name")) return ts+"Mendengar orang mempermainkan nama ahli keluarga boleh menyakitkan hati.";
    if(bits.includes("teacher_unfair")) return ts+"Kamu rasa keadaan dengan cikgu mungkin tidak difahami dengan betul. Saya mahu dengar pandangan kamu tanpa membuat andaian.";
    if(bits.includes("mind_reading") && !bits.includes("left_out")) return "Kamu risau orang lain mungkin tidak suka kamu. Kita boleh lihat apa yang membuat kamu terfikir begitu, tanpa terus menganggapnya fakta.";
    if(bits.includes("left_out") && bits.includes("group")) return ts+"Rasa tertinggal apabila beberapa kawan bersama-sama memang boleh menyedihkan.";
    if(bits.includes("left_out")) return ts+"Bila kita tidak diajak bersama kawan, perasaan sedih atau keliru boleh timbul.";
    if(bits.includes("not_close")) return ts+"Kamu membezakan kawan rapat dengan orang yang cuma bermain bersama. Itu penting untuk saya faham.";
    if(bits.includes("bereavement")) return ts+"Rasa risau kehilangan orang tersayang boleh terasa sangat berat.";
    if(bits.includes("study")) return ts+"Pelajaran atau peperiksaan nampaknya antara perkara yang memenuhi fikiran kamu.";
    if(bits.includes("family")) return ts+"Terima kasih kerana berkongsi tentang perkara di rumah. Kita boleh bincang setakat yang kamu selesa.";
    if(bits.includes("loneliness")) return ts+"Rasa keseorangan memang bukan sesuatu yang mudah.";
    if(a.emotion) return `Saya dengar kamu rasa ${a.emotion.toLowerCase()}. Terima kasih sebab beritahu saya.`;
    if(a.requestsHelp) return "Saya dengar kamu mahu bantuan. Kita boleh cari satu langkah yang sesuai dengan keadaan kamu.";
    if((a.raw||"").trim().length>=12) return `Saya dengar kamu berkata: “${shortQuote(a.raw)}”. Kalau saya tersalah faham, betulkan saya ya.`;
    return "Terima kasih sebab berkongsi. Saya mahu faham dengan lebih tepat.";
  }

  function followUp(a) {
    const ts=a?.themes||[];
    if(ts.includes("money") && ts.includes("reported")) return {
      question:"Selepas kamu beritahu cikgu atau orang dewasa, apa yang berubah? Adakah permintaan duit itu masih berlaku?",
      options:["Masih berlaku walaupun saya dah beritahu.","Sudah kurang atau berhenti.","Saya tak pasti dan perlukan bantuan lagi."]
    };
    if(ts.includes("money")) return {
      question:"Adakah orang itu masih meminta duit sekarang, dan adakah kamu rasa selamat di sekolah?",
      options:["Masih minta duit, saya rasa tak selesa.","Sudah berhenti dan saya rasa selamat.","Saya tak pasti / belum sedia cerita."]
    };
    if(ts.includes("physical")||ts.includes("threat")) return {
      question:"Adakah perbuatan itu masih berlaku, dan adakah kamu selamat sekarang?",
      options:["Masih berlaku dan saya perlukan bantuan.","Tidak berlaku lagi sekarang.","Saya belum pasti / tak selesa jawab."]
    };
    if(ts.includes("parent_name")) return {
      question:"Bila nama ahli keluarga kamu diejek, apakah yang biasanya kamu buat selepas itu?",
      options:["Saya balas ejek kerana marah.","Saya diam atau menjauh.","Saya beritahu cikgu atau orang dewasa."]
    };
    if(ts.includes("teacher_unfair")) return {
      question:"Boleh ceritakan satu contoh apabila kamu rasa cikgu tersalah faham tentang apa yang berlaku?",
      options:["Saya diam tetapi cikgu sangka saya bercakap.","Saya tak sempat terangkan keadaan.","Saya belum mahu cerita contoh."]
    };
    if(ts.includes("mind_reading") && !ts.includes("left_out")) return {
      question:"Apa yang berlaku sehingga kamu terfikir mereka tidak suka kamu?",
      options:["Mereka kurang bercakap dengan saya.","Mereka tidak ajak saya bermain.","Saya tak pasti, cuma rasa begitu."]
    };
    if(ts.includes("not_close") && !ts.includes("left_out")) return {
      question:"Kamu mahu cuba jadi lebih rapat dengan mereka, atau cukup dapat bermain bersama dengan selesa?",
      options:["Saya mahu jadi lebih rapat dengan seorang kawan.","Saya cuma mahu bermain tanpa diejek.","Saya belum pasti."]
    };
    if(ts.includes("left_out")||ts.includes("not_close")) return {
      question:"Bila kamu cuba mendekati kawan-kawan itu, biasanya mereka buat apa?",
      options:["Mereka terus berbual sesama sendiri.","Mereka kadang-kadang ajak saya.","Saya belum pernah cuba / belum pasti."]
    };
    if(ts.includes("bereavement")) return {
      question:"Bila risau tentang keluarga datang, adakah ia kerap mengganggu tidur, belajar atau kegiatan harian kamu?",
      options:["Kadang-kadang mengganggu saya.","Tidak selalu, cuma saya risau.","Saya belum pasti."]
    };
    if(ts.includes("study")) return {
      question:"Bahagian mana yang paling membebankan sekarang: topik yang susah, masa belajar atau risau tentang markah?",
      options:["Saya tak faham topik.","Saya rasa tak cukup masa.","Saya takut markah rendah."]
    };
    if(ts.includes("family")) return {
      question:"Apabila perkara itu berlaku di rumah, adakah kamu rasa selamat dan ada orang dewasa yang boleh mendengar?",
      options:["Saya rasa selamat, cuma sedih.","Saya tidak rasa selamat.","Saya belum pasti."]
    };
    if(a?.intent==="help") return {
      question:"Kamu paling perlukan bantuan tentang apa sekarang: rasa lebih tenang, hubungan dengan orang lain atau mendapatkan bantuan cikgu?",
      options:["Saya mahu rasa lebih tenang.","Saya mahu bincang hubungan dengan orang lain.","Saya mahu bantuan cikgu."]
    };
    return null;
  }

  function nextReflection(a, answer) {
    const t=normalize(answer);
    if(a?.intent==="unsure" || /^(?:tak tahu|tak pasti|entah)$/i.test(t)) return "Kita tidak perlu teka jawapan yang kamu belum tahu.";
    if(/\b(?:tak mahu|tak nak|tidak mahu|belum sedia|tak selesa)\b/.test(t)) return "Kamu boleh pilih berapa banyak yang mahu dikongsi.";
    if(/\b(?:beritahu cikgu|minta bantuan|cikgu|guru kaunseling|kaunselor)\b/.test(t)) return "Kamu sudah memikirkan untuk mendapatkan sokongan orang dewasa. Itu pilihan yang boleh membantu.";
    if(/\b(?:diam|menjauh|lari|duduk sahaja)\b/.test(t)) return "Saya dengar kamu cenderung diam atau menjauh apabila perkara itu berlaku.";
    if(/\b(?:balas|lawan|marah|bergaduh)\b/.test(t)) return "Apabila marah, membalas mungkin terasa spontan. Kita boleh cari pilihan yang lebih selamat tanpa menyalahkan kamu.";
    if(/\b(?:masih|lagi|setiap hari)\b/.test(t)) return "Saya dengar keadaan ini mungkin masih berulang. Kamu tidak sepatutnya menghadapinya seorang diri.";
    if(t.length>=14) return `Saya dengar jawapan kamu: “${shortQuote(answer)}”.`;
    return "Terima kasih sebab menjawab.";
  }

  function thoughtQuestion(a) {
    const themes=a?.themes||[];
    if(themes.includes("teacher_unfair")) return "Apabila cikgu salah faham tentang kamu, apa yang terlintas dalam fikiran tentang diri kamu atau hubungan dengan cikgu?";
    if(themes.includes("not_close")) return "Bila kamu hanya bermain bersama tetapi belum rapat, apa yang kamu paling berharap akan berubah?";
    if(themes.includes("left_out")) return "Bila mereka berbual atau bermain tanpa mengajak kamu, apa yang kamu fikir tentang hubungan kamu dengan mereka?";
    if(themes.includes("parent_name")) return "Bila orang mempermainkan nama ahli keluarga kamu, apa fikiran yang paling kuat muncul ketika itu?";
    if(themes.includes("bereavement")) return "Bila terbayang sesuatu berlaku kepada ahli keluarga, apa yang paling kamu takutkan?";
    if(themes.includes("study")) return "Apabila kamu teringat peperiksaan atau kerja sekolah, apa yang kamu paling takut akan berlaku?";
    return null;
  }
  function safeActions(a) {
    const t=a?.themes||[];
    if(t.includes("money")||t.includes("physical")||t.includes("threat")) return [
      "Kamu boleh cari cikgu atau kaunselor yang dipercayai untuk menyemak apa yang berlaku.",
      "Jangan hadapi tekanan atau ancaman seorang diri; utamakan tempat yang selamat."
    ];
    if(t.includes("teacher_unfair")) return ["Jika selamat dan kamu selesa, minta bantuan GBK untuk berbincang dengan cikgu pada masa yang sesuai."];
    if(t.includes("left_out")) return ["Kamu boleh mulakan dengan seorang kawan yang kamu rasa paling selesa, tanpa memaksa diri masuk ke seluruh kumpulan sekali gus."];
    return [];
  }
  function parseNumber(text) {
    const t=normalize(text);
    const map={kosong:0,sifar:0,satu:1,dua:2,tiga:3,empat:4,lima:5,enam:6,tujuh:7,lapan:8,sembilan:9,sepuluh:10,zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
    if(Object.prototype.hasOwnProperty.call(map,t)) return map[t];
    const match=t.match(/(?:^|\b)(10|[0-9])(?:\s*\/\s*10)?(?:\b|$)/);
    if(match && (t.length<35 || /(?:skor|rasa|dalam|lebih kurang|sekitar|at|level)/i.test(t))) return Number(match[1]);
    return null;
  }
  root.KawanSmart42=Object.freeze({version:"4.2",analyze,followUp,contextualReflection,nextReflection,thoughtQuestion,safeActions,parseNumber,normalize});
})(typeof window !== "undefined" ? window : globalThis);
