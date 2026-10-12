/*
 * Kawan CBT — Rekod & Pengurusan Kes (secure GBK mode)
 * Records are stored in Supabase and only fetched after authentication +
 * server-side GBK allow-list verification. This module does not store case
 * records in localStorage. Database Row Level Security is essential.
 */
(function () {
  "use strict";

  const recordsBtn = document.getElementById("recordsBtn");
  const recordsModal = document.getElementById("recordsModal");
  const closeRecords = document.getElementById("closeRecords");
  const recordsSearch = document.getElementById("recordsSearch");
  const recordsStatusFilter = document.getElementById("recordsStatusFilter");
  let recordsGbkFilter = document.getElementById("recordsGbkFilter");
  const recordsList = document.getElementById("recordsList");
  const recordsMessage = document.getElementById("recordsMessage");
  const recordDetail = document.getElementById("recordDetail");
  const recordDetailTitle = document.getElementById("recordDetailTitle");
  const recordDetailMeta = document.getElementById("recordDetailMeta");
  const recordDetailContent = document.getElementById("recordDetailContent");
  const recordDetailStatus = document.getElementById("recordDetailStatus");
  const recordDetailNotes = document.getElementById("recordDetailNotes");
  const recordDetailFollowUp = document.getElementById("recordDetailFollowUp");
  const saveRecordEdits = document.getElementById("saveRecordEdits");
  const deleteRecordBtn = document.getElementById("deleteRecordBtn");
  const backRecordsList = document.getElementById("backRecordsList");
  const exportRecordsBtn = document.getElementById("exportRecordsBtn");
  const saveRecordBtn = document.getElementById("saveRecordBtn");
  const saveRecordMessage = document.getElementById("saveRecordMessage");
  const clearDataBtn = document.getElementById("clearDataBtn");
  const privacyToggleEl = document.getElementById("privacyToggle");
  const summaryModalEl = document.getElementById("summaryModal");

  const cloudConfig = window.KAWAN_SUPABASE_CONFIG || {};
  const cloudConfigured = !!(cloudConfig.supabaseUrl && cloudConfig.supabaseAnonKey);
  const recordsTable = cloudConfig.table || "gbk_records";
  // Separate write-only inbox for pupils. Never grant anon read access.
  const studentSubmissionsTable = "student_submissions";
  let studentSubmitClient = null;
  let studentSubmitConsent = null;
  let studentPrivacyAllow = null;
  let supabaseClient = null;
  let currentGbkUser = null;
  let currentGbkAuthorized = false;
  let cloudRecordsCache = [];
  let pendingGbkAction = "view";
  let authMessageEl = null;
  let authFormEl = null;
  let authModalEl = null;
  let authEmailEl = null;
  let authPasswordEl = null;
  let authSetupEl = null;
  let legacyBoxEl = null;
  let authSubmitEl = null;
  let logoutButton = null;
  let authInitialization = null;

  if (cloudConfigured && window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(cloudConfig.supabaseUrl, cloudConfig.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    // A separate client prevents a pupil submission from borrowing an active
    // GBK access token. Publishable key is safe here; secret keys never are.
    studentSubmitClient = window.supabase.createClient(cloudConfig.supabaseUrl, cloudConfig.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "kawan-anon-inbox" }
    });
  }

  if (!recordsModal || !recordsBtn || !saveRecordBtn) {
    console.warn("Kawan CBT Rekod: elemen HTML rekod belum dipasang. Rujuk arahan pemasangan.");
    return;
  }

  const STATUS_OPTIONS = [
    { value: "Perlu semakan", label: "Perlu semakan" },
    { value: "Perlu susulan", label: "Perlu susulan" },
    { value: "Sedang berjalan", label: "Sedang berjalan" },
    { value: "Selesai", label: "Selesai" }
  ];

  let currentSavedRecordId = null;
  let activeRecordId = null;
  let deferredSummaryUntilPlan = false;

  function privacyIsOn() {
    return !!privacyToggleEl?.checked;
  }

  function setStatusMessage(message, kind = "info") {
    if (!recordsMessage) return;
    recordsMessage.textContent = message;
    recordsMessage.dataset.kind = kind;
  }

  function setSaveMessage(message, kind = "info") {
    if (!saveRecordMessage) return;
    saveRecordMessage.textContent = message;
    saveRecordMessage.dataset.kind = kind;
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `kcbt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // ===== Penanda awal untuk semakan GBK =====
  // Ini hanya pengesanan kata kunci/kategori, bukan pengesahan bahawa buli berlaku.
  // GBK perlu menyemak konteks, kekerapan, keselamatan semasa dan tindakan susulan.
  const GBK_DETECTION_RULES = [
    {
      category: "Kemungkinan kekerasan fizikal",
      patterns: [
        /\bkena\s+pukul\b/gi, /\bdipukul\b/gi, /\bdipukuli\b/gi,
        /\bpukul\s+saya\b/gi, /\b(?:dia|mereka|kawan(?: saya)?|orang|budak|murid)\s+(?:ada\s+)?pukul\s+saya\b/gi,
        /\bmemukul\s+saya\b/gi, /\b(?:hit|hits|hit me|punched me|slapped me|kicked me|pushed me)\b/gi,
        /\b(?:they|he|she|my friend|my friends|someone)\s+(?:hit|punched|slapped|kicked|pushed)\s+me\b/gi,
        /\b(?:dia|mereka|kawan(?: saya)?|budak|murid)\s+(?:hit|pukul|push|pushed|tendang|kick|slap|tampar)\s+(?:saya|me)\b/gi,
        /\bkena\s+tampar\b/gi, /\bditampar\b/gi, /\btampar\s+saya\b/gi,
        /\bkena\s+tendang\b/gi, /\bditendang\b/gi, /\btendang\s+saya\b/gi,
        /\bkena\s+sepak\b/gi, /\bdisepak\b/gi, /\bsepak\s+saya\b/gi,
        /\bditumbuk\b/gi, /\btumbuk\s+saya\b/gi, /\bkena\s+belasah\b/gi, /\bdibelasah\b/gi,
        /\bditolak\b/gi, /\bkena\s+tolak\b/gi, /\bmenolak\s+saya\b/gi,
        /\b(?:dia|mereka|kawan(?: saya)?|orang|budak|murid)\s+(?:selalu\s+)?tolak\s+saya\b/gi,
        /\btolak[- ]tolak\b/gi, /\btolak\s+saya\b/gi, /\bpush(?:ed)?\s+me\b/gi,
        /\btarik\s+(?:tudung|rambut|baju|tangan)\b/gi,
        /\bditarik\s+(?:tudung|rambut|baju|tangan)\b/gi,
        /\b(?:tudung|rambut|baju|tangan)\s+saya\s+ditarik\b/gi,
        /\bkena\s+cubit\b/gi, /\bdicubit\b/gi, /\bdicekik\b/gi, /\bcekik\s+saya\b/gi
      ]
    },
    {
      category: "Kemungkinan buli / ejekan / gangguan",
      patterns: [
        /\bdibuli\b/gi, /\bkena\s+buli\b/gi, /\bmembuli\b/gi, /\bpembuli\b/gi, /\bbuli\b/gi, /\b(?:bully|bullied|bullying)\b/gi,
        /\bdiejek\b/gi, /\bmengejek\b/gi, /\bejek(?:an)?\b/gi, /\bejek\s+nama\b/gi,
        /\bteas(?:e|ed|ing)\s+me\b/gi, /\bmock(?:ed|ing)?\s+me\b/gi,
        /\bdihina\b/gi, /\bmenghina\b/gi, /\bperli\b/gi, /\bdipersenda\b/gi,
        /\bdiganggu\b/gi, /\bmengganggu\b/gi, /\bdikacau\b/gi,
        /\bdipulau(?:kan)?\b/gi, /\bmemulaukan\b/gi, /\bpulaukan\s+saya\b/gi,
        /\btak\s+bagi\s+(?:saya\s+)?main\b/gi, /\btidak\s+bagi\s+(?:saya\s+)?main\b/gi
      ]
    },
    {
      category: "Kemungkinan ugutan / paksaan / gangguan wang",
      patterns: [
        /\bdiugut\b/gi, /\bmengugut\b/gi, /\bugut\s+saya\b/gi, /\bdiancam\b/gi, /\bancam\s+saya\b/gi,
        /\bdipaksa\b/gi, /\bmemaksa\s+saya\b/gi, /\bpaksa\s+saya\b/gi,
        /\bperas\s+ugut\b/gi, /\bkena\s+bagi\s+(?:duit|wang)\b/gi, /\bpaksa\s+bagi\s+(?:duit|wang)\b/gi,
        /\bsuruh\s+bagi\s+(?:duit|wang)\b/gi, /\bambil\s+duit\s+saya\b/gi, /\bminta\s+duit\s+dengan\s+paksa\b/gi,
        /\b(?:dia|mereka|kawan(?:-kawan)?|orang|budak|murid)\s+(?:selalu\s+)?(?:minta|mintak|meminta)\s+(?:duit|wang)\b/gi,
        /\b(?:minta|mintak|meminta)\s+(?:duit|wang)\s+saya\b/gi,
        /\b(?:forced me to give|threatened me for)\s+(?:money|cash)\b/gi
      ]
    }
  ];

  function isLikelyNegated(text, matchIndex) {
    const before = String(text || "").slice(Math.max(0, matchIndex - 42), matchIndex);
    // Reduce obvious false positives such as "saya tak pernah kena pukul".
    return /(?:\b(?:tak|tidak|bukan|belum)\s+(?:pernah\s+)?(?:kena\s+)?|\b(?:tak|tidak)\s+pernah\s+)$/i.test(before);
  }

  function detectGbkMarkers(text) {
    const sourceText = String(text || "");
    const categories = [];
    const keywords = [];
    GBK_DETECTION_RULES.forEach(rule => {
      rule.patterns.forEach(pattern => {
        const re = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = re.exec(sourceText)) !== null) {
          if (!isLikelyNegated(sourceText, match.index)) {
            if (!categories.includes(rule.category)) categories.push(rule.category);
            const phrase = match[0].trim();
            if (phrase && !keywords.some(item => item.toLowerCase() === phrase.toLowerCase())) keywords.push(phrase);
          }
          if (match[0].length === 0) re.lastIndex++;
        }
      });
    });
    return { categories, keywords };
  }

  function ensureGbkReviewState() {
    if (!state) return null;
    if (!state.gbkReview || typeof state.gbkReview !== "object") {
      state.gbkReview = { flagged: false, categories: [], keywords: [], sources: [], detectedAt: "" };
    }
    return state.gbkReview;
  }

  function addGbkMarker(categories, keywords, source) {
    const review = ensureGbkReviewState();
    if (!review) return;
    review.flagged = true;
    review.categories = Array.from(new Set([...(review.categories || []), ...(categories || [])]));
    review.keywords = Array.from(new Set([...(review.keywords || []), ...(keywords || [])]));
    review.sources = Array.from(new Set([...(review.sources || []), source].filter(Boolean)));
    review.detectedAt = review.detectedAt || new Date().toISOString();
  }

  function scanStudentTextForGbk(text) {
    const clean = String(text || "").trim();
    if (!clean || clean.startsWith("__")) return;
    const detected = detectGbkMarkers(clean);
    if (detected.categories.length) addGbkMarker(detected.categories, detected.keywords, "Jawapan murid mengandungi kata kunci");
  }

  function markerForRecord(record) {
    if (record && record.gbkReview && record.gbkReview.flagged) return record.gbkReview;
    const scenarioText = `${record?.scenarioKey || ""} ${record?.scenario || ""}`;
    if (/\bbuli\b|diejek/i.test(scenarioText)) {
      return {
        flagged: true,
        categories: ["Isu dipilih: Buli / Diejek"],
        keywords: [],
        sources: ["Kategori dipilih murid"],
        detectedAt: record?.ts || record?.createdAt || "",
        legacy: true
      };
    }
    // Search only fields representing the murid's actual responses. Do not scan
    // teacherSummary because it contains our own generic safety disclaimer.
    const searchable = [record?.situation, record?.thought, record?.evidenceFor, record?.evidenceAgainst, record?.newThought].filter(Boolean).join(". ");
    const detected = detectGbkMarkers(searchable);
    if (detected.categories.length) {
      return { flagged: true, categories: detected.categories, keywords: detected.keywords, sources: ["Semakan kata kunci rekod sedia ada"], detectedAt: record?.ts || record?.createdAt || "", legacy: true };
    }
    return { flagged: false, categories: [], keywords: [], sources: [], detectedAt: "" };
  }

  function formatGbkMarker(review) {
    if (!review || !review.flagged) return "Tiada penanda awal buli/kekerasan dikesan secara automatik. Ini tidak bermaksud isu tiada.";
    const categories = (review.categories || []).join("; ") || "Perlu disemak";
    const keywords = (review.keywords || []).length ? `Kata kunci dikesan: ${(review.keywords || []).join(", ")}.` : "Penanda dibuat berdasarkan kategori isu yang dipilih.";
    return `PENANDA AWAL UNTUK SEMAKAN GBK: ${categories}. ${keywords} Ini bukan pengesahan bahawa buli/kekerasan berlaku; GBK perlu menyemak konteks, kekerapan, keselamatan semasa dan tindakan yang sesuai.`;
  }

  function injectGbkStyles() {
    if (document.getElementById("gbkMarkerStyles")) return;
    const style = document.createElement("style");
    style.id = "gbkMarkerStyles";
    style.textContent = `
      .recordFlagRow{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
      .recordFlagBadge{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(217,119,6,.38);background:rgba(245,158,11,.13);color:var(--text);padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800}
      .recordFlagBadge.reviewed{border-color:rgba(22,163,74,.35);background:rgba(34,197,94,.12)}
      .recordFlagCategory{font-size:11px;color:var(--muted);padding:4px 7px;border:1px solid var(--border);border-radius:8px}
      .recordCardFlagged{border-left:4px solid #d97706}
      .recordFlagNotice{margin:8px 0;padding:10px 11px;border:1px solid rgba(217,119,6,.38);border-radius:11px;background:rgba(245,158,11,.10);font-size:12px;line-height:1.55;color:var(--text);white-space:pre-wrap}
      .gbkReviewBtn{border-color:rgba(217,119,6,.40)!important}
      .recordFilters{grid-template-columns:minmax(180px,1fr) minmax(140px,180px) minmax(150px,190px) auto}
      @media(max-width:650px){.recordFilters{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureGbkFilter() {
    if (recordsGbkFilter) return;
    const filters = document.querySelector(".recordFilters");
    if (!filters) return;
    const field = document.createElement("div");
    field.className = "recordField";
    const label = document.createElement("label");
    label.htmlFor = "recordsGbkFilter";
    label.textContent = "Penanda semakan GBK";
    const select = document.createElement("select");
    select.id = "recordsGbkFilter";
    [
      ["", "Semua rekod"],
      ["pending", "Belum disemak GBK"],
      ["flagged", "Semua rekod bertanda"],
      ["reviewed", "Sudah disemak GBK"]
    ].forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    field.append(label, select);
    const exportBtn = document.getElementById("exportRecordsBtn");
    filters.insertBefore(field, exportBtn || null);
    recordsGbkFilter = select;
    recordsGbkFilter.addEventListener("change", renderRecords);
  }

  // Case records are deliberately never read from localStorage.
  function loadRecords() {
    return cloudRecordsCache.slice();
  }

  function recordFromSubmission(row) {
    const record = {
      recordId: `submission:${row.submission_id}`,
      source: "student_submission",
      studentId: row.student_code,
      ts: row.submitted_at,
      createdAt: row.submitted_at,
      scenarioKey: row.scenario_key || "",
      scenario: row.scenario || "",
      situation: row.situation || "",
      clarifyQ: row.clarify_q || "",
      clarifyA: row.clarify_a || "",
      emotion: row.emotion || "",
      pre: row.intensity_pre,
      post: row.intensity_post,
      calming: row.calming || "",
      action: row.action || "",
      thought: row.thought || "",
      evidenceFor: row.evidence_for || "",
      evidenceAgainst: row.evidence_against || "",
      beliefThought: row.belief_thought,
      newThought: row.new_thought || "",
      beliefNew: row.belief_new,
      safetyFlag: row.safety_flag || "green",
      followUpPlan: row.follow_up_plan || "",
      strengthOfDay: row.strength_of_day || "",
      studentSummary: row.student_summary || "",
      status: row.status || "Perlu semakan",
      counselorNotes: row.counselor_notes || "",
      followUpDate: row.follow_up_date || "",
      updatedAt: row.updated_at || row.submitted_at
    };
    const marker = markerForRecord(record);
    if (record.safetyFlag !== "green") {
      marker.flagged = true;
      if (!marker.categories.includes("Semak keadaan keselamatan murid")) marker.categories.push("Semak keadaan keselamatan murid");
    }
    record.gbkReview = { ...marker, reviewed: !!row.reviewed, reviewedAt: row.reviewed_at || "" };
    return record;
  }

  async function refreshCloudRecords() {
    if (!supabaseClient || !currentGbkUser || !currentGbkAuthorized) return false;
    // BOTH tables are protected by database-side RLS. The anonymous client
    // never receives a SELECT grant for either one.
    const [gbkResult, inboxResult] = await Promise.all([
      supabaseClient.from(recordsTable).select("record_id, record_data, updated_at").order("updated_at", { ascending: false }),
      supabaseClient.from(studentSubmissionsTable).select("*").order("submitted_at", { ascending: false })
    ]);
    if (gbkResult.error || inboxResult.error) {
      console.error("Kawan CBT: gagal memuat rekod / peti masuk.", gbkResult.error || inboxResult.error);
      setStatusMessage("Rekod gagal dimuatkan. Pastikan SQL student-submissions telah dijalankan dan polisi RLS adalah betul.", "danger");
      return false;
    }
    cloudRecordsCache = [
      ...(gbkResult.data || []).map(row => ({
        ...(row.record_data && typeof row.record_data === "object" ? row.record_data : {}),
        recordId: row.record_id,
        source: "gbk_records",
        updatedAt: row.updated_at || (row.record_data || {}).updatedAt || ""
      })),
      ...(inboxResult.data || []).map(recordFromSubmission)
    ];
    return true;
  }

  async function saveCloudRecord(record) {
    if (!supabaseClient || !currentGbkUser || !currentGbkAuthorized) {
      setStatusMessage("Sila log masuk menggunakan akaun GBK yang diluluskan.", "warn");
      return false;
    }
    if (String(record.recordId).startsWith("submission:")) {
      const id = String(record.recordId).slice("submission:".length);
      const reviewed = !!record.gbkReview?.reviewed;
      const { error } = await supabaseClient.from(studentSubmissionsTable).update({
        status: record.status,
        counselor_notes: record.counselorNotes || "",
        follow_up_date: record.followUpDate || null,
        reviewed,
        reviewed_at: reviewed ? (record.gbkReview?.reviewedAt || new Date().toISOString()) : null,
        updated_at: new Date().toISOString()
      }).eq("submission_id", id);
      if (error) {
        console.error("Kawan CBT: gagal mengemas kini serahan murid.", error);
        setStatusMessage("Perubahan serahan murid gagal disimpan. Semak RLS Supabase.", "danger");
        return false;
      }
      const index = cloudRecordsCache.findIndex(item => item.recordId === record.recordId);
      if (index >= 0) cloudRecordsCache[index] = { ...record };
      return true;
    }
    const payload = {
      record_id: String(record.recordId),
      record_data: record,
      updated_at: record.updatedAt || new Date().toISOString(),
      updated_by: currentGbkUser.id
    };
    const { error } = await supabaseClient.from(recordsTable).upsert(payload, { onConflict: "record_id" });
    if (error) {
      console.error("Kawan CBT: gagal menyimpan rekod awan.", error);
      setStatusMessage("Simpanan gagal. Semak internet, nama jadual dan polisi RLS Supabase.", "danger");
      return false;
    }
    const index = cloudRecordsCache.findIndex(item => item.recordId === record.recordId);
    if (index >= 0) cloudRecordsCache[index] = { ...record };
    else cloudRecordsCache.unshift({ ...record });
    return true;
  }

  async function deleteCloudRecord(recordId) {
    if (!supabaseClient || !currentGbkUser || !currentGbkAuthorized) return false;
    const studentRecord = String(recordId).startsWith("submission:");
    const { error } = studentRecord
      ? await supabaseClient.from(studentSubmissionsTable).delete().eq("submission_id", String(recordId).slice("submission:".length))
      : await supabaseClient.from(recordsTable).delete().eq("record_id", recordId);
    if (error) {
      console.error("Kawan CBT: gagal memadam rekod awan.", error);
      setStatusMessage("Rekod gagal dipadam daripada pangkalan data.", "danger");
      return false;
    }
    cloudRecordsCache = cloudRecordsCache.filter(item => item.recordId !== recordId);
    return true;
  }

  function formatDate(value) {
    if (!value) return "Tarikh tidak diketahui";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    try {
      return date.toLocaleString("ms-MY", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (_) {
      return date.toLocaleString();
    }
  }

  function safeText(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value == null || value === "" ? "-" : String(value);
    return element;
  }

  function statusClass(status) {
    if (status === "Selesai") return "recordStatus recordStatusDone";
    if (status === "Perlu susulan") return "recordStatus recordStatusFollow";
    if (status === "Sedang berjalan") return "recordStatus recordStatusActive";
    return "recordStatus";
  }

  function recordSummary(record) {
    return record.situation || record.cerita || record.scenario || "Tiada ringkasan situasi.";
  }

  function renderRecords() {
    if (!recordsList) return;
    const allRecords = loadRecords().slice().sort((a, b) => {
      return new Date(b.ts || b.createdAt || 0).getTime() - new Date(a.ts || a.createdAt || 0).getTime();
    });
    const query = (recordsSearch?.value || "").trim().toLocaleLowerCase();
    const status = recordsStatusFilter?.value || "";
    const gbkFilter = recordsGbkFilter?.value || "";
    const filtered = allRecords.filter(record => {
      const marker = record.gbkReview || markerForRecord(record);
      const haystack = [
        record.studentId, record.scenario, record.situation, record.status,
        record.counselorNotes, record.recordId,
        ...(marker.categories || []), ...(marker.keywords || [])
      ].join(" ").toLocaleLowerCase();
      const matchesGbk = !gbkFilter ||
        (gbkFilter === "pending" && marker.flagged && !marker.reviewed) ||
        (gbkFilter === "flagged" && marker.flagged) ||
        (gbkFilter === "reviewed" && marker.flagged && marker.reviewed);
      return (!query || haystack.includes(query)) && (!status || record.status === status) && matchesGbk;
    });

    recordsList.replaceChildren();
    if (!filtered.length) {
      recordsList.appendChild(safeText("p", "recordsEmpty", allRecords.length
        ? "Tiada rekod yang sepadan dengan carian ini."
        : "Belum ada rekod. Serahan murid akan muncul di sini selepas dihantar dengan persetujuan."));
      return;
    }

    filtered.forEach(record => {
      const card = document.createElement("article");
      card.className = "recordCard";

      const top = document.createElement("div");
      top.className = "recordCardTop";
      const title = safeText("h3", "recordCardTitle", `${record.studentId || "Tanpa Kod Murid"} · ${record.scenario || "Isu tidak dinyatakan"}`);
      const statusBadge = safeText("span", statusClass(record.status), record.status || "Perlu semakan");
      top.append(title, statusBadge);

      const marker = record.gbkReview || markerForRecord(record);
      const flagRow = document.createElement("div");
      flagRow.className = "recordFlagRow";
      if (marker.flagged) {
        card.classList.add("recordCardFlagged");
        flagRow.appendChild(safeText("span", `recordFlagBadge${marker.reviewed ? " reviewed" : ""}`, marker.reviewed ? "⚑ Penanda GBK · Sudah disemak" : "⚑ Perlu semakan GBK"));
        (marker.categories || []).forEach(category => flagRow.appendChild(safeText("span", "recordFlagCategory", category)));
      }

      const sourceLabel = record.source === "student_submission" ? "📨 Serahan murid" : "📁 Rekod GBK";
      const meta = safeText("p", "recordCardMeta", `${sourceLabel} · ${formatDate(record.ts || record.createdAt)} · ID rekod: ${record.recordId}`);
      const summary = safeText("p", "recordCardSummary", recordSummary(record));
      const open = document.createElement("button");
      open.type = "button";
      open.className = "btn ghost recordOpenBtn";
      open.textContent = "Lihat rekod & susulan";
      open.addEventListener("click", () => openRecord(record.recordId));

      card.append(top);
      if (marker.flagged) card.appendChild(flagRow);
      card.append(meta, summary, open);
      recordsList.appendChild(card);
    });
  }

  function findRecord(recordId) {
    return loadRecords().find(record => record.recordId === recordId) || null;
  }

  function buildRecordDetailText(record) {
    return [
      "RINGKASAN REKOD SESI",
      "",
      `Kod murid: ${record.studentId || "-"}`,
      `Kategori: ${record.scenario || "-"}`,
      `Tarikh sesi: ${formatDate(record.ts || record.createdAt)}`,
      `Situasi yang diceritakan: ${record.situation || "-"}`,
      `Soalan penerokaan ringkas: ${record.clarifyQ || "-"}`,
      `Jawapan penerokaan ringkas: ${record.clarifyA || "-"}`,
      `Emosi yang dilaporkan: ${record.emotion || "-"}`,
      `Skor emosi: ${record.pre ?? "-"}/10 → ${record.post ?? "-"}/10`,
      `Fikiran asal: ${record.thought || "-"}`,
      `Perkara yang menyokong fikiran: ${record.evidenceFor || "-"}`,
      `Perkara yang menunjukkan sudut lain: ${record.evidenceAgainst || "-"}`,
      `Skor kepercayaan fikiran asal: ${record.beliefThought ?? "-"}`,
      `Fikiran baharu: ${record.newThought || "-"}`,
      `Skor kepercayaan fikiran baharu: ${record.beliefNew ?? "-"}`,
      `Kaedah menenangkan diri: ${record.calming || "-"}`,
      `Tindakan dipilih: ${record.action || "-"}`,
      `Pelan selepas sesi: ${record.followUpPlan || "-"}`,
      `Safety flag (semakan kata kunci sahaja): ${record.safetyFlag || "green"}`,
      "",
      formatGbkMarker(record.gbkReview || markerForRecord(record)),
      `Sumber penanda: ${((record.gbkReview || {}).sources || []).join("; ") || "-"}`,
      `Status semakan GBK: ${(record.gbkReview || {}).reviewed ? "Sudah disemak" : ((record.gbkReview || markerForRecord(record)).flagged ? "Belum disemak" : "Tiada penanda")}`,
      "",
      "RUMUSAN MURID",
      record.studentSummary || "Tiada rumusan murid disimpan.",
      "",
      "RINGKASAN GURU / KAUNSELOR",
      record.teacherSummary || "Tiada ringkasan guru disimpan."
    ].join("\n");
  }

  let markGbkReviewedBtn = null;

  function ensureMarkGbkReviewedButton() {
    if (markGbkReviewedBtn) return markGbkReviewedBtn;
    const actions = document.querySelector(".recordDetailActions");
    if (!actions) return null;
    markGbkReviewedBtn = document.createElement("button");
    markGbkReviewedBtn.type = "button";
    markGbkReviewedBtn.className = "btn ghost gbkReviewBtn";
    markGbkReviewedBtn.addEventListener("click", toggleGbkReviewed);
    actions.insertBefore(markGbkReviewedBtn, actions.firstChild);
    return markGbkReviewedBtn;
  }

  async function toggleGbkReviewed() {
    if (!activeRecordId) return;
    if (privacyIsOn()) {
      setStatusMessage("Privasi ON. Matikan suis Privasi dahulu untuk menyimpan status semakan ke pangkalan data.", "warn");
      return;
    }
    const records = loadRecords();
    const index = records.findIndex(record => record.recordId === activeRecordId);
    if (index < 0) return;
    const record = { ...records[index] };
    const marker = record.gbkReview || markerForRecord(record);
    if (!marker.flagged) {
      setStatusMessage("Rekod ini tiada penanda GBK untuk disemak.", "info");
      return;
    }
    const nextReviewed = !marker.reviewed;
    record.gbkReview = { ...marker, reviewed: nextReviewed, reviewedAt: nextReviewed ? new Date().toISOString() : "" };
    record.updatedAt = new Date().toISOString();
    if (!await saveCloudRecord(record)) {
      setStatusMessage("Status semakan GBK gagal disimpan ke pangkalan data.", "danger");
      return;
    }
    openRecord(activeRecordId);
    renderRecords();
    setStatusMessage(nextReviewed ? "Penanda ditandakan sebagai sudah disemak. Sila pastikan tindakan susulan direkodkan jika perlu." : "Status semakan ditetapkan semula kepada belum disemak.", "success");
  }

  function openRecord(recordId) {
    const record = findRecord(recordId);
    if (!record) {
      setStatusMessage("Rekod tidak ditemui. Senarai telah dikemas kini.", "warn");
      renderRecords();
      return;
    }
    activeRecordId = recordId;
    recordDetailTitle.textContent = `${record.studentId || "Tanpa Kod Murid"} · ${record.scenario || "Isu tidak dinyatakan"}`;
    recordDetailMeta.textContent = `${formatDate(record.ts || record.createdAt)} · ID rekod: ${record.recordId}`;
    recordDetailContent.textContent = buildRecordDetailText(record);
    let flagNotice = document.getElementById("recordGbkFlagNotice");
    if (!flagNotice) {
      flagNotice = document.createElement("div");
      flagNotice.id = "recordGbkFlagNotice";
      flagNotice.className = "recordFlagNotice";
      recordDetailContent.parentNode.insertBefore(flagNotice, recordDetailContent);
    }
    const marker = record.gbkReview || markerForRecord(record);
    flagNotice.textContent = marker.flagged ? formatGbkMarker(marker) : "Tiada penanda awal dikesan secara automatik. Ini bukan bukti bahawa tiada isu.";
    flagNotice.classList.toggle("hidden", !marker.flagged);
    recordDetailStatus.value = STATUS_OPTIONS.some(item => item.value === record.status) ? record.status : "Perlu semakan";
    recordDetailNotes.value = record.counselorNotes || "";
    recordDetailFollowUp.value = record.followUpDate || "";
    const reviewButton = ensureMarkGbkReviewedButton();
    const markerForCurrentRecord = record.gbkReview || markerForRecord(record);
    if (reviewButton) {
      reviewButton.classList.toggle("hidden", !markerForCurrentRecord.flagged);
      reviewButton.textContent = markerForCurrentRecord.reviewed ? "↩ Tetapkan belum disemak" : "✓ Tandakan sudah disemak GBK";
    }
    recordsList.classList.add("hidden");
    recordDetail.classList.remove("hidden");
    setStatusMessage("Paparan rekod. Catatan hanya disimpan apabila butang Simpan Perubahan ditekan.", "info");
  }

  function showRecordList() {
    activeRecordId = null;
    recordDetail.classList.add("hidden");
    recordsList.classList.remove("hidden");
    renderRecords();
    setStatusMessage(privacyIsOn()
      ? "Privasi ON: rekod baharu dan perubahan tidak disimpan sehingga suis ini dimatikan."
      : "Rekod sedang dipaparkan daripada pangkalan data untuk akaun GBK yang diluluskan.", "info");
  }

  function openRecordsModal() {
    recordsModal.classList.remove("hidden");
    showRecordList();
    recordsSearch?.focus();
  }

  function closeRecordsModal() {
    recordsModal.classList.add("hidden");
    activeRecordId = null;
    recordDetail?.classList.add("hidden");
    recordsList?.classList.remove("hidden");
    // Clear rendered sensitive content and end the session when the records
    // workspace closes, which is important on shared school devices.
    recordsList?.replaceChildren();
    recordDetailContent?.replaceChildren();
    if (recordDetailTitle) recordDetailTitle.textContent = "Butiran rekod";
    if (recordDetailMeta) recordDetailMeta.textContent = "";
    if (recordDetailStatus) recordDetailStatus.value = "Perlu semakan";
    if (recordDetailNotes) recordDetailNotes.value = "";
    if (recordDetailFollowUp) recordDetailFollowUp.value = "";
    document.getElementById("recordGbkFlagNotice")?.remove();
    cloudRecordsCache = [];
    currentGbkUser = null;
    currentGbkAuthorized = false;
    if (supabaseClient) supabaseClient.auth.signOut().catch(error => console.warn("GBK sign-out:", error));
    updateLogoutControl();
  }

  function ensureStudentSubmissionControls() {
    if (document.getElementById("studentSubmitConsent")) return;
    const container = document.createElement("section");
    container.className = "studentSubmitConsentBox";
    container.innerHTML = `
      <div class="studentSubmitHeading">📨 Hantar kepada Guru Kaunseling (pilihan)</div>
      <p>Tiada rekod dihantar secara automatik. Jangan taip nama penuh, nombor kad pengenalan atau alamat. Hanya GBK yang diberi kebenaran boleh membuka serahan dalam sistem ini.</p>
      <label class="studentSubmitConsentLabel"><input id="studentSubmitConsent" type="checkbox" />
      <span>Saya memilih untuk berkongsi ringkasan sesi ini dengan Guru Kaunseling untuk semakan atau susulan.</span></label>
      <p id="studentPrivacyNotice" class="studentPrivacyNotice"></p>
      <button id="studentPrivacyAllow" class="btn btn-soft" type="button">Benarkan penghantaran untuk sesi ini</button>
      <p class="studentSubmitSafety">Jika kamu tidak selamat atau perlukan bantuan segera, beritahu guru atau orang dewasa yang dipercayai sekarang. Penghantaran ini bukan saluran kecemasan.</p>`;
    saveRecordBtn.parentNode?.parentNode?.insertBefore(container, saveRecordBtn.parentNode);
    studentSubmitConsent = document.getElementById("studentSubmitConsent");
    studentPrivacyAllow = document.getElementById("studentPrivacyAllow");
    studentSubmitConsent?.addEventListener("change", updateStudentSubmissionControls);
    studentPrivacyAllow?.addEventListener("click", () => {
      if (!studentSubmitConsent?.checked) {
        setSaveMessage("Tandakan kotak persetujuan dahulu. Menghantar rekod adalah pilihan kamu.", "warn");
        return;
      }
      if (privacyToggleEl) {
        privacyToggleEl.checked = false;
        privacyToggleEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setSaveMessage("Penghantaran dibenarkan untuk sesi ini sahaja. Rekod BELUM dihantar; tekan Hantar kepada GBK untuk meneruskan.", "info");
      updateStudentSubmissionControls();
    });
    const style = document.createElement("style");
    style.id = "studentSubmissionStyles";
    style.textContent = `
      .studentSubmitConsentBox{border:1.5px solid rgba(42,133,136,.27);border-radius:20px;padding:18px;margin:16px 0;background:linear-gradient(120deg,rgba(232,250,243,.95),rgba(244,240,255,.93));color:var(--text)}
      .studentSubmitHeading{font-weight:900;font-size:19px;margin-bottom:9px}
      .studentSubmitConsentBox p{font-size:15px;line-height:1.65;margin:8px 0}
      .studentSubmitConsentLabel{display:flex;align-items:flex-start;gap:11px;font-size:16px;line-height:1.5;font-weight:700;margin:14px 0;cursor:pointer}
      .studentSubmitConsentLabel input{width:22px;height:22px;flex:0 0 22px;accent-color:#2b998c;margin:1px 0}
      .studentPrivacyNotice{font-weight:800}
      .studentSubmitSafety{font-size:13px!important;color:var(--muted)!important;margin-top:14px!important}
      @media(max-width:650px){.studentSubmitConsentBox{padding:14px}.studentSubmitConsentLabel{font-size:16px}}
    `;
    document.head.appendChild(style);
    updateStudentSubmissionControls();
  }

  function updateStudentSubmissionControls() {
    const notice = document.getElementById("studentPrivacyNotice");
    if (notice) notice.textContent = privacyIsOn()
      ? "🔒 Privasi ON: tiada penghantaran dibenarkan. Jika mahu berkongsi, tandakan persetujuan dan pilih Benarkan penghantaran dahulu."
      : "✅ Privasi OFF: penghantaran boleh dibuat hanya selepas kotak persetujuan ditanda dan butang Hantar ditekan.";
    if (studentPrivacyAllow) studentPrivacyAllow.classList.toggle("hidden", !privacyIsOn());
  }

  function limitedText(value, maxLength) {
    return String(value == null ? "" : value).trim().slice(0, maxLength);
  }

  function optionalScore(value) {
    if (value === "" || value == null) return null;
    const score = Number(value);
    return Number.isInteger(score) && score >= 0 && score <= 10 ? score : null;
  }

  function anonymousStudentCode() {
    if (window.crypto?.getRandomValues) {
      const bytes = new Uint8Array(5);
      window.crypto.getRandomValues(bytes);
      return "KC-" + Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    return "KC-" + String(Date.now()).slice(-9);
  }

  async function submitStudentRecord() {
    if (currentSavedRecordId) {
      setSaveMessage("Ringkasan sesi ini sudah dihantar. Sesi baharu diperlukan untuk penghantaran seterusnya.", "info");
      return;
    }
    if (!studentSubmitConsent?.checked) {
      setSaveMessage("Penghantaran adalah pilihan. Tandakan persetujuan dahulu jika kamu mahu berkongsi dengan GBK.", "warn");
      return;
    }
    if (privacyIsOn()) {
      setSaveMessage("Privasi ON masih aktif. Tekan Benarkan penghantaran untuk sesi ini terlebih dahulu.", "warn");
      return;
    }
    if (!studentSubmitClient) {
      setSaveMessage("Sistem penghantaran belum disambungkan. Minta bantuan Guru Kaunseling.", "danger");
      return;
    }
    if (!state || !(state.scenarioName || state.situation)) {
      setSaveMessage("Belum ada sesi lengkap untuk dihantar. Siapkan aktiviti dan cuba lagi.", "warn");
      return;
    }
    let code = (document.getElementById("studentId")?.value || state.studentId || "").trim();
    if (!code) code = anonymousStudentCode();
    if (!/^[A-Za-z0-9_-]{3,24}$/.test(code)) {
      setSaveMessage("Kod murid hanya boleh menggunakan 3–24 huruf, nombor, - atau _. Jangan guna nama penuh.", "warn");
      return;
    }
    const payload = {
      student_code: code,
      scenario: limitedText(state.scenarioName, 90),
      scenario_key: limitedText(state.scenarioKey, 40),
      situation: limitedText(state.situation, 1500),
      clarify_q: limitedText(state.clarifyQ, 600),
      clarify_a: limitedText(state.clarifyA, 1500),
      emotion: limitedText(state.emotion, 80),
      intensity_pre: optionalScore(state.intensityPre),
      intensity_post: optionalScore(state.intensityPost),
      calming: limitedText(state.calmingAction, 500),
      action: limitedText(state.action, 900),
      thought: limitedText(state.thought, 1500),
      evidence_for: limitedText(state.evidenceFor, 1200),
      evidence_against: limitedText(state.evidenceAgainst, 1200),
      belief_thought: optionalScore(state.beliefThought),
      new_thought: limitedText(state.newThought, 1500),
      belief_new: optionalScore(state.beliefNew),
      safety_flag: ["green", "yellow", "orange", "red"].includes(state.safetyFlag) ? state.safetyFlag : "green",
      follow_up_plan: limitedText(state.followUpPlan, 900),
      strength_of_day: limitedText(state.strengthOfDay, 500),
      student_summary: limitedText(typeof buildRumusanSesi === "function" ? buildRumusanSesi() : "", 12000)
    };
    saveRecordBtn.disabled = true;
    saveRecordBtn.textContent = "⏳ Menghantar…";
    setSaveMessage("Sedang menghantar ringkasan kepada GBK. Jangan tutup halaman ini.", "info");
    try {
      // Anonymous role may INSERT only. Supabase RLS and SQL column GRANTs
      // forbid SELECT / UPDATE / DELETE and forbid submitting GBK-only notes.
      const { error } = await studentSubmitClient.from(studentSubmissionsTable).insert(payload);
      if (error) throw error;
      currentSavedRecordId = "student-submitted";
      state.studentId = code;
      saveRecordBtn.textContent = "✅ Telah dihantar";
      setSaveMessage(`Berjaya dihantar untuk semakan GBK. Kod rujukan murid: ${code}. Simpan kod ini jika guru memerlukannya.`, "success");
    } catch (error) {
      // Never log the pupil's answers or record content.
      console.error("Kawan CBT: penghantaran gagal.", { code: error?.code, message: error?.message });
      setSaveMessage("Penghantaran gagal. Semak internet dan pastikan SQL student_submissions telah dijalankan. Rekod tidak disimpan secara setempat.", "danger");
      saveRecordBtn.textContent = "📨 Hantar kepada GBK";
      saveRecordBtn.disabled = false;
    }
  }

  async function saveActiveRecordEdits() {
    if (!activeRecordId) return;
    if (privacyIsOn()) {
      setStatusMessage("Privasi ON. Matikan suis Privasi dahulu untuk menyimpan perubahan ke pangkalan data.", "warn");
      return;
    }
    const records = loadRecords();
    const index = records.findIndex(record => record.recordId === activeRecordId);
    if (index < 0) {
      setStatusMessage("Rekod tidak ditemui.", "warn");
      return;
    }
    const updatedRecord = {
      ...records[index],
      status: recordDetailStatus.value,
      counselorNotes: recordDetailNotes.value.trim(),
      followUpDate: recordDetailFollowUp.value || "",
      updatedAt: new Date().toISOString()
    };
    if (!await saveCloudRecord(updatedRecord)) {
      setStatusMessage("Perubahan gagal disimpan ke pangkalan data.", "danger");
      return;
    }
    openRecord(activeRecordId);
    setStatusMessage("Perubahan rekod berjaya disimpan ke pangkalan data.", "success");
  }

  async function deleteActiveRecord() {
    if (!activeRecordId) return;
    const record = findRecord(activeRecordId);
    if (!record) return;
    const confirmDelete = window.confirm(`Padam rekod ${record.studentId || "tanpa kod"} (${formatDate(record.ts || record.createdAt)}) daripada pangkalan data awan? Tindakan ini tidak boleh dibatalkan.`);
    if (!confirmDelete) return;
    if (!await deleteCloudRecord(activeRecordId)) {
      setStatusMessage("Rekod gagal dipadam daripada pangkalan data.", "danger");
      return;
    }
    activeRecordId = null;
    showRecordList();
    setStatusMessage("Rekod telah dipadam daripada pangkalan data.", "success");
  }

  function exportRecords() {
    const records = loadRecords();
    if (!records.length) {
      setStatusMessage("Tiada rekod untuk dieksport.", "warn");
      return;
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: "Kawan CBT", records }, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kawan-cbt-rekod-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatusMessage("Eksport dimulakan. Simpan fail dengan selamat kerana ia mungkin mengandungi maklumat sensitif.", "success");
  }

  // Add a transparent GBK marker note to the counsellor summary only.
  const originalBuildTeacherSummary = buildTeacherSummary;
  buildTeacherSummary = function () {
    let text = originalBuildTeacherSummary();
    text = text.replace(/Safety flag:.*$/m, `Safety flag (aturan kata kunci sedia ada; bukan penilaian profesional): ${state?.safetyFlag || "green"}`);
    const review = state?.gbkReview;
    return `${text}\n\n${formatGbkMarker(review)}`;
  };

  // Replace the old summary opener: it auto-saved incomplete records.
  // The new flow waits until the student's follow-up plan has been selected,
  // then displays the summary and lets the counsellor explicitly save it.
  showSummaryModal = function () {
    if (state && state.step === 10) {
      deferredSummaryUntilPlan = true;
      return;
    }
    if (typeof clearOptions === "function") clearOptions();
    summaryView = "murid";
    if (typeof renderSummaryView === "function") renderSummaryView();
    if (summaryModalEl) summaryModalEl.classList.remove("hidden");
    const newStudentButton = document.getElementById("newStudent");
    if (newStudentButton) newStudentButton.textContent = kioskMode ? "Sesi Murid Seterusnya" : "Sesi Baharu";
    if (saveRecordBtn) {
      saveRecordBtn.textContent = currentSavedRecordId ? "✅ Telah dihantar" : "📨 Hantar kepada GBK";
      saveRecordBtn.disabled = !!currentSavedRecordId;
    }
    updateStudentSubmissionControls();
    setSaveMessage(privacyIsOn()
      ? "Privasi ON: tiada penghantaran automatik. Berkongsi adalah pilihan, dan memerlukan persetujuan jelas."
      : "Semak rumusan. Tandakan kotak persetujuan sebelum memilih Hantar kepada GBK.", "info");
    deferredSummaryUntilPlan = false;
  };

  // Detect the plan selection after the existing flow handles it, then show
  // the summary after the plan is included in the session record.
  const originalHandleUserInput = handleUserInput;
  handleUserInput = async function (text, source = INPUT_SOURCE.TYPED) {
    const priorStep = state?.step;
    const priorPlan = state?.followUpPlan || "";
    scanStudentTextForGbk(text);
    await originalHandleUserInput(text, source);
    if (priorStep === 11 && state?.followUpPlan && state.followUpPlan !== priorPlan) {
      showSummaryModal();
    }
  };

  // A murid choosing the Buli/Diejek category should also be queued for GBK review,
  // but this is labelled as a chosen topic, not an automatically detected incident.
  const originalScenarioSelect = scenarioSelect;
  scenarioSelect = async function (key) {
    if (key === "bully") addGbkMarker(["Isu dipilih: Buli / Diejek"], [], "Kategori dipilih murid");
    await originalScenarioSelect(key);
  };

  // Start each new session with a fresh save button state.
  const originalStart = start;
  start = async function () {
    currentSavedRecordId = null;
    deferredSummaryUntilPlan = false;
    if (saveRecordBtn) {
      saveRecordBtn.textContent = "📨 Hantar kepada GBK";
      saveRecordBtn.disabled = false;
    }
    if (studentSubmitConsent) studentSubmitConsent.checked = false;
    if (privacyToggleEl) privacyToggleEl.checked = true;
    updateStudentSubmissionControls();
    setSaveMessage("", "info");
    const startPromise = originalStart();
    if (state) state.gbkReview = { flagged: false, categories: [], keywords: [], sources: [], detectedAt: "" };
    await startPromise;
    if (state && !state.gbkReview) state.gbkReview = { flagged: false, categories: [], keywords: [], sources: [], detectedAt: "" };
  };

  // The old kiosk timer started before the follow-up choice and could reset a
  // session while it was still being completed. It is now scheduled only after
  // the summary is closed in kiosk mode.
  scheduleKioskAutoReset = function () {
    if (state?.kioskAutoTimer) {
      clearInterval(state.kioskAutoTimer);
      state.kioskAutoTimer = null;
    }
  };
  function scheduleKioskResetAfterClose() {
    if (!kioskMode || !state) return;
    if (state.kioskAutoTimer) clearInterval(state.kioskAutoTimer);
    let left = 10;
    state.kioskAutoTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(state.kioskAutoTimer);
        state.kioskAutoTimer = null;
        if (document.getElementById("studentId")) document.getElementById("studentId").value = "";
        start();
      }
    }, 1000);
  }

  function configIsValid() {
    return !!(cloudConfigured && supabaseClient);
  }

  function ensureAuthModal() {
    if (authModalEl) return;
    authModalEl = document.createElement("div");
    authModalEl.id = "gbkAuthModal";
    authModalEl.className = "modal hidden";
    authModalEl.setAttribute("role", "dialog");
    authModalEl.setAttribute("aria-modal", "true");
    authModalEl.setAttribute("aria-labelledby", "gbkAuthTitle");
    authModalEl.innerHTML = `
      <div class="modalBackdrop" id="gbkAuthBackdrop"></div>
      <div class="modalCard gbkAuthCard">
        <div class="modalTop">
          <div><span class="modal-eyebrow">AKSES TERHAD</span><div class="modalH" id="gbkAuthTitle">Log masuk Guru Bimbingan dan Kaunseling</div></div>
          <button id="gbkAuthClose" class="iconBtn" type="button" aria-label="Tutup log masuk">✕</button>
        </div>
        <p class="gbkAuthIntro">Rekod sesi hanya boleh dibuka oleh akaun GBK yang telah diluluskan. Murid boleh menggunakan aktiviti Kawan CBT tanpa log masuk.</p>
        <div id="gbkAuthSetup" class="gbkAuthSetup hidden"></div>
        <div id="gbkLegacyBox" class="gbkAuthSetup hidden"><strong>Rekod lama dikesan pada peranti ini.</strong><br>Versi terdahulu menyimpan log sesi dalam browser dan log itu tidak dilindungi oleh log masuk baharu. Eksport dan simpan salinan dengan selamat terlebih dahulu jika rekod lama masih diperlukan. Selepas itu, padam salinan setempat di sini sebelum membuka rekod awan.<br><button id="gbkClearLegacy" type="button" class="btn btn-soft" style="margin-top:10px">Padam log sesi lama dari peranti ini</button></div>
        <form id="gbkAuthForm" class="gbkAuthForm" autocomplete="on">
          <label for="gbkAuthEmail">Emel akaun GBK<input id="gbkAuthEmail" type="email" autocomplete="username" required placeholder="emel rasmi sekolah" /></label>
          <label for="gbkAuthPassword">Kata laluan<input id="gbkAuthPassword" type="password" autocomplete="current-password" required placeholder="Kata laluan" /></label>
          <button id="gbkAuthSubmit" class="btn btn-primary" type="submit">Log masuk dengan selamat</button>
          <a href="reset-password.html" style="justify-self:start;color:#217c88;font-size:14px;font-weight:800;text-decoration:underline;text-underline-offset:3px">Lupa kata laluan?</a>
        </form>
        <p id="gbkAuthMessage" class="gbkAuthMessage" role="status" aria-live="polite"></p>
        <p class="gbkAuthFooter">Tiada butang daftar akaun awam. Akaun perlu diwujudkan oleh pentadbir Supabase dan diluluskan dalam senarai akses GBK.</p>
      </div>`;
    document.body.appendChild(authModalEl);
    authMessageEl = document.getElementById("gbkAuthMessage");
    authFormEl = document.getElementById("gbkAuthForm");
    authEmailEl = document.getElementById("gbkAuthEmail");
    authPasswordEl = document.getElementById("gbkAuthPassword");
    authSetupEl = document.getElementById("gbkAuthSetup");
    legacyBoxEl = document.getElementById("gbkLegacyBox");
    authSubmitEl = document.getElementById("gbkAuthSubmit");
    document.getElementById("gbkAuthClose")?.addEventListener("click", closeAuthModal);
    document.getElementById("gbkAuthBackdrop")?.addEventListener("click", closeAuthModal);
    authFormEl?.addEventListener("submit", handleGbkLogin);
    document.getElementById("gbkClearLegacy")?.addEventListener("click", clearLegacyLocalRecords);
    updateLegacyBox();
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && authModalEl && !authModalEl.classList.contains("hidden")) closeAuthModal();
    });
    if (!configIsValid()) {
      authFormEl?.classList.add("hidden");
      authSetupEl?.classList.remove("hidden");
      authSetupEl.innerHTML = "<strong>Persediaan belum selesai.</strong><br>Lengkapkan <code>supabase-config.js</code> dengan Project URL dan publishable/anon key. Kemudian jalankan SQL dalam fail <code>supabase-setup.sql</code>, cipta akaun GBK dan benarkan aksesnya. Jangan letakkan service_role/secret key dalam laman web.";
      if (authMessageEl) authMessageEl.textContent = "Rekod dikunci kerana pangkalan data belum dikonfigurasi.";
    }
  }

  function hasLegacyLocalRecords() {
    try {
      const raw = localStorage.getItem("cbt_logs_final");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !Array.isArray(parsed) || parsed.length > 0;
    } catch (_) {
      return true;
    }
  }

  function updateLegacyBox() {
    if (!legacyBoxEl) return;
    legacyBoxEl.classList.toggle("hidden", !hasLegacyLocalRecords());
  }

  function clearLegacyLocalRecords() {
    if (!hasLegacyLocalRecords()) { updateLegacyBox(); return; }
    const confirmed = window.confirm("Padam log sesi lama daripada storan browser peranti ini? Tindakan ini tidak boleh dibatalkan. Pastikan salinan sandaran yang diperlukan telah disimpan secara selamat terlebih dahulu.");
    if (!confirmed) return;
    try {
      localStorage.removeItem("cbt_logs_final");
      if (localStorage.getItem("cbt_logs_final") !== null) throw new Error("Log lama masih wujud.");
      updateLegacyBox();
      showAuthMessage("Log sesi lama telah dipadam daripada browser peranti ini. Rekod baharu hanya disimpan ke pangkalan data selepas akaun GBK disahkan.", "success");
    } catch (error) {
      console.error("Gagal membersihkan log lama:", error);
      showAuthMessage("Log lama tidak berjaya dipadam. Kosongkan storan browser secara manual selepas membuat sandaran.", "danger");
    }
  }

  function showAuthMessage(message, kind = "info") {
    if (!authMessageEl) return;
    authMessageEl.textContent = message;
    authMessageEl.dataset.kind = kind;
  }

  function showAuthModal(action = "view", message = "") {
    pendingGbkAction = action;
    ensureAuthModal();
    authModalEl?.classList.remove("hidden");
    if (message) showAuthMessage(message, "warn");
    if (configIsValid()) setTimeout(() => authEmailEl?.focus(), 0);
  }

  function closeAuthModal() {
    authModalEl?.classList.add("hidden");
  }

  async function verifyGbkAllowList() {
    if (!supabaseClient || !currentGbkUser) return false;
    const { data, error } = await supabaseClient.rpc("is_authorized_gbk");
    if (error) {
      console.error("Kawan CBT: semakan kebenaran GBK gagal.", error);
      showAuthMessage("Tidak dapat mengesahkan akses GBK. Pastikan fail SQL telah dijalankan dengan betul.", "danger");
      return false;
    }
    return data === true;
  }

  async function refreshIdentityAndAuthorization() {
    if (!configIsValid()) return false;
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) {
      currentGbkUser = null;
      currentGbkAuthorized = false;
      return false;
    }
    currentGbkUser = data.user;
    currentGbkAuthorized = await verifyGbkAllowList();
    if (!currentGbkAuthorized) {
      currentGbkUser = null;
      cloudRecordsCache = [];
      await supabaseClient.auth.signOut();
      return false;
    }
    return true;
  }

  async function initializeAuth() {
    if (!configIsValid()) return false;
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data?.session) return false;
    return refreshIdentityAndAuthorization();
  }

  async function handleGbkLogin(event) {
    event.preventDefault();
    if (!configIsValid()) {
      showAuthMessage("Konfigurasi Supabase belum lengkap.", "danger");
      return;
    }
    const email = (authEmailEl?.value || "").trim();
    const password = authPasswordEl?.value || "";
    if (!email || !password) {
      showAuthMessage("Masukkan emel dan kata laluan.", "warn");
      return;
    }
    authSubmitEl.disabled = true;
    authSubmitEl.textContent = "Sedang mengesahkan…";
    showAuthMessage("Mengesahkan akaun dan kebenaran GBK…");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    authSubmitEl.disabled = false;
    authSubmitEl.textContent = "Log masuk dengan selamat";
    if (error || !data?.user) {
      showAuthMessage("Log masuk gagal. Semak emel/kata laluan dan pastikan akaun telah diwujudkan pentadbir.", "danger");
      return;
    }
    currentGbkUser = data.user;
    currentGbkAuthorized = await verifyGbkAllowList();
    if (!currentGbkAuthorized) {
      await supabaseClient.auth.signOut();
      currentGbkUser = null;
      showAuthMessage("Akses ditolak. Akaun ini belum disenaraikan sebagai GBK yang diluluskan.", "danger");
      return;
    }
    if (hasLegacyLocalRecords()) {
      updateLegacyBox();
      showAuthMessage("Akaun disahkan, tetapi log lama yang tidak dilindungi perlu disandarkan/dipadam sebelum rekod awan boleh dibuka.", "warn");
      return;
    }
    if (pendingGbkAction !== "teacherSummary" && pendingGbkAction !== "teacherCopy") {
      const loaded = await refreshCloudRecords();
      if (!loaded) {
        showAuthMessage("Akaun disahkan, tetapi rekod gagal dimuatkan. Semak tetapan pangkalan data.", "danger");
        return;
      }
    }
    showAuthMessage("Akses GBK disahkan.", "success");
    closeAuthModal();
    updateLogoutControl();
    await runAuthorizedAction(pendingGbkAction);
  }

  async function requireGbkAccess(action = "view") {
    pendingGbkAction = action;
    if (!configIsValid()) {
      showAuthModal(action, "Sistem rekod dikunci sehingga persediaan pangkalan data selesai.");
      return;
    }
    const authorized = await refreshIdentityAndAuthorization();
    if (!authorized) {
      showAuthModal(action, "Sila log masuk dengan akaun GBK yang diluluskan.");
      return;
    }
    if (hasLegacyLocalRecords()) {
      showAuthModal(action, "Log sesi lama pada peranti ini mesti disandarkan/dipadam sebelum rekod awan boleh dibuka.");
      updateLegacyBox();
      return;
    }
    if (action !== "teacherSummary" && action !== "teacherCopy") {
      const loaded = await refreshCloudRecords();
      if (!loaded) return;
    }
    updateLogoutControl();
    await runAuthorizedAction(action);
  }

  async function runAuthorizedAction(action) {
    // Only authorised GBK may use the existing internal cloud writer; the
    // pupil button always goes through the write-only inbox instead.
    if (action === "save") {
      showAuthMessage("Gunakan Hantar kepada GBK pada rumusan murid.", "info");
      return;
    }
    if (action === "teacherSummary") {
      summaryView = "guru";
      renderSummaryView();
      return;
    }
    if (action === "teacherCopy") {
      copyText(buildTeacherSummary());
      if (typeof addMsg === "function") addMsg("Ringkasan guru telah di-copy ✅", "bot", { kind: "ok", text: "Siap" });
      return;
    }
    openRecordsModal();
  }

  function updateLogoutControl() {
    if (!closeRecords) return;
    if (!logoutButton) {
      logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = "btn btn-soft";
      logoutButton.textContent = "Keluar akaun";
      logoutButton.addEventListener("click", signOutGbk);
      const group = document.createElement("div");
      group.className = "gbkRecordHeaderActions";
      const parent = closeRecords.parentElement;
      parent?.insertBefore(group, closeRecords);
      group.append(logoutButton, closeRecords);
    }
    logoutButton.classList.toggle("hidden", !(currentGbkUser && currentGbkAuthorized));
    logoutButton.title = currentGbkUser?.email || "Akaun GBK";
  }

  async function signOutGbk() {
    closeRecordsModal();
    closeAuthModal();
    setStatusMessage("Anda telah log keluar. Pengesahan GBK diperlukan sebelum rekod dibuka semula.", "info");
  }

  injectGbkStyles();
  ensureGbkFilter();
  ensureStudentSubmissionControls();

  ensureAuthModal();
  authInitialization = initializeAuth();
  recordsBtn.addEventListener("click", () => requireGbkAccess("view"));
  closeRecords?.addEventListener("click", closeRecordsModal);
  recordsModal.addEventListener("click", event => {
    if (event.target === recordsModal) closeRecordsModal();
  });
  recordsModal.querySelector(".modalBackdrop")?.addEventListener("click", closeRecordsModal);
  recordsSearch?.addEventListener("input", renderRecords);
  recordsStatusFilter?.addEventListener("change", renderRecords);
  backRecordsList?.addEventListener("click", showRecordList);
  // Pupil submit is deliberately separate from the GBK login flow.
  saveRecordBtn.addEventListener("click", submitStudentRecord);
  document.getElementById("tabGuru")?.addEventListener("click", event => {
    if (!window.KAWAN_SECURE_RECORDS_MODE) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    requireGbkAccess("teacherSummary");
  }, true);
  document.getElementById("copyTeacherSummary")?.addEventListener("click", event => {
    if (!window.KAWAN_SECURE_RECORDS_MODE) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    requireGbkAccess("teacherCopy");
  }, true);
  document.getElementById("tabMurid")?.addEventListener("click", () => {
    if (currentGbkUser) signOutGbk();
  }, true);
  saveRecordEdits?.addEventListener("click", saveActiveRecordEdits);
  deleteRecordBtn?.addEventListener("click", deleteActiveRecord);
  exportRecordsBtn?.addEventListener("click", exportRecords);

  closeRecords?.addEventListener("keydown", event => {
    if (event.key === "Escape") closeRecordsModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !recordsModal.classList.contains("hidden")) closeRecordsModal();
  });

  document.getElementById("closeSummary")?.addEventListener("click", () => {
    if (summaryModalEl?.classList.contains("hidden")) scheduleKioskResetAfterClose();
    if (currentGbkUser) signOutGbk();
  });
  document.getElementById("newStudent")?.addEventListener("click", () => {
    currentSavedRecordId = null;
    if (currentGbkUser) signOutGbk();
  });

  // Make Clear safer and ensure the existing listener cannot silently erase
  // records without asking. This capture listener blocks the old click handler.
  clearDataBtn?.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const confirmed = window.confirm("Padam semua data local pada browser ini, termasuk rekod sesi, kegemaran dan statistik? Tindakan ini tidak boleh dibatalkan. Eksport rekod dahulu jika perlu.");
    if (!confirmed) return;
    try {
      clearLocalData();
      renderRecords();
      closeRecordsModal();
      setSaveMessage("Semua data local telah dipadam.", "success");
      if (typeof addMsg === "function") addMsg("Semua data local telah dipadam daripada browser ini. ✅", "bot", { kind: "ok", text: "Dipadam" });
    } catch (error) {
      console.error(error);
      window.alert("Data tidak berjaya dipadam sepenuhnya.");
    }
  }, true);

  privacyToggleEl?.addEventListener("change", () => {
    if (privacyIsOn()) {
      setSaveMessage("Privasi ON: rekod murid tidak boleh dihantar.", "warn");
    } else {
      setSaveMessage("Privasi OFF: tiada rekod dihantar tanpa persetujuan jelas dan butang Hantar kepada GBK.", "info");
    }
    updateStudentSubmissionControls();
  });

  // Never read or write sensitive session logs locally in secure mode. Old local
  // prototype data may still exist and must be backed up/removed separately.
  document.getElementById("exportStats")?.addEventListener("click", event => {
    if (!window.KAWAN_SECURE_RECORDS_MODE) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setSaveMessage("Eksport statistik setempat dinyahaktifkan dalam mod selamat. Log masuk GBK dan gunakan Eksport JSON pada skrin Rekod.", "warn");
  }, true);
  setStatusMessage("Rekod hanya boleh dibuka oleh GBK yang dibenarkan. Murid boleh menghantar ringkasan secara pilihan, tanpa akses membaca rekod.", "info");
})();
