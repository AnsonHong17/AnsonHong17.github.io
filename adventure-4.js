/* Kawan CBT 4.0 — optional, anonymous, in-memory mini activities.
 * No access to Supabase, session transcript, browser storage or GBK records.
 * The existing CBT engine and explicit submission workflow remain unchanged.
 */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const dialog = $('#adventureDialog');
  const body = $('#adventureBody');
  const title = $('#adventureDialogTitle');
  const kicker = $('#adventureDialogKicker');
  if (!dialog || !body || !title || !kicker) return;

  const visited = new Set(); // Ephemeral only: clearing the tab erases it.
  let lastTrigger = null;
  let activeGame = null;
  let detectiveIndex = 0;
  let detectiveAnswered = false;
  let currentMood = null;

  const moods = [
    ['Gembira', '😊'], ['Sedih', '😢'], ['Marah', '😠'],
    ['Risau', '😟'], ['Takut', '😨'], ['Keliru', '😕']
  ];
  const detectiveCases = [
    { situation: 'Rakan saya lalu di depan saya tanpa menyapa.', answers: [
      'Dia berjalan lalu tanpa menyapa saya.', 'Dia memang tidak suka saya.', 'Dia sengaja mahu menyakitkan hati saya.'
    ], correct: 0, note: 'Kita tahu dia tidak menyapa. Kita belum tahu sebabnya. Mungkin dia tidak perasan, dan mungkin ada sebab lain.' },
    { situation: 'Saya mendapat markah lebih rendah dalam satu ujian.', answers: [
      'Saya tidak akan berjaya dalam apa-apa.', 'Markah satu ujian saya lebih rendah.', 'Semua cikgu kecewa dengan saya.'
    ], correct: 1, note: 'Satu markah menunjukkan keputusan ujian itu — bukan nilai diri kamu atau keseluruhan kemampuan kamu.' },
    { situation: 'Saya terdengar beberapa murid ketawa ketika saya melalui mereka.', answers: [
      'Saya pasti mereka sedang mentertawakan saya.', 'Mereka semua benci saya.', 'Saya terdengar beberapa murid ketawa.'
    ], correct: 2, note: 'Kita hanya tahu mereka ketawa. Kalau ada ejekan sebenar atau kamu rasa tidak selamat, kamu berhak meminta bantuan orang dewasa.' }
  ];
  const kindInfo = {
    feelings: { title: 'Roda Emosi', kicker: '🌈 PULAU PERASAAN' },
    detective: { title: 'Detektif Pemikiran', kicker: '🔎 HUTAN FIKIRAN' },
    thermometer: { title: 'Termometer Emosi', kicker: '🌤️ GUNUNG TENANG' }
  };
  function markVisited(kind) {
    if (!Object.prototype.hasOwnProperty.call(kindInfo, kind)) return;
    visited.add(kind);
    window.dispatchEvent(new CustomEvent("kawan:activity-completed",{detail:{kind,completed:visited.size}}));
    const item = $(`[data-adventure="${kind}"]`);
    if (item) item.classList.add('is-visited');
    const counter = $('#adventureCounter');
    if (counter) counter.textContent = `${visited.size} daripada 3`;
  }
  function setDialog(titleText, kickerText, content) {
    title.textContent = titleText;
    kicker.textContent = kickerText;
    body.innerHTML = content; // Only static, app-authored strings are inserted.
  }
  function closeDialog() {
    if (dialog.open) dialog.close();
  }
  function openDialog(kind, trigger) {
    if (!kindInfo[kind]) return;
    lastTrigger = trigger;
    activeGame = kind;
    if (kind === 'feelings') renderFeelings();
    else if (kind === 'detective') { detectiveIndex = 0; renderDetective(); }
    else if (kind === 'thermometer') renderThermometer();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    $('#closeAdventure')?.focus();
  }
  function renderFeelings() {
    currentMood = null;
    setDialog(kindInfo.feelings.title, kindInfo.feelings.kicker, `
      <p class="activity-intro">Setiap perasaan boleh datang dan pergi. Mari cuba beri nama pada perasaan kamu — semuanya boleh diterima.</p>
      <p class="activity-question">Hari ini, perasaan mana paling dekat dengan kamu?</p>
      <div class="mood-grid" role="group" aria-label="Pilih perasaan">
        ${moods.map(([name, emoji]) => `<button class="mood-button" type="button" data-mood="${name}" aria-pressed="false"><span aria-hidden="true">${emoji}</span>${name}</button>`).join('')}
      </div>
      <div id="feelingFeedback" class="activity-feedback" role="status" aria-live="polite" hidden></div>
    `);
    $$('.mood-button', body).forEach(btn => btn.addEventListener('click', () => {
      currentMood = btn.dataset.mood;
      $$('.mood-button', body).forEach(item => {
        const isThis = item === btn;
        item.classList.toggle('is-selected', isThis);
        item.setAttribute('aria-pressed', String(isThis));
      });
      const target = $('#feelingFeedback', body);
      target.hidden = false;
      target.innerHTML = `<strong>Terima kasih kerana kenal pasti perasaan kamu. ♡</strong><span id="feelingText"></span><label class="activity-range-label" for="feelingIntensity">Seberapa kuat perasaan itu sekarang? (1–10)</label><input class="activity-slider" id="feelingIntensity" type="range" min="1" max="10" value="5" step="1" /><div class="activity-range-row"><span class="activity-range-label">Perlahan ← → Sangat kuat</span><output class="activity-number" id="feelingValue" for="feelingIntensity">5 / 10</output></div><span class="activity-range-label">Tiada skor yang betul atau salah.</span>`;
      $('#feelingText', target).textContent = `Kamu pilih ${currentMood.toLowerCase()}. Perasaan ini bukan sesuatu yang memalukan.`;
      const range = $('#feelingIntensity', target);
      range.addEventListener('input', () => {
        $('#feelingValue', target).textContent = `${range.value} / 10`;
      });
      markVisited('feelings');
    }));
  }
  function renderDetective() {
    detectiveAnswered = false;
    const q = detectiveCases[detectiveIndex];
    setDialog(kindInfo.detective.title, kindInfo.detective.kicker, `
      <p class="activity-intro">Detektif yang baik membezakan <strong>apa yang berlaku</strong> dengan <strong>apa yang kita fikir mungkin berlaku</strong>. Tidak perlu menyalahkan diri.</p>
      <div class="activity-status"><span>Kes ${detectiveIndex + 1} daripada ${detectiveCases.length}</span><span>Petunjuk: fakta dahulu!</span></div>
      <div class="activity-question">${q.situation}<br /><br />Apakah perkara yang kita <em>pasti tahu</em>?</div>
      <div class="activity-options" role="group" aria-label="Pilih apa yang benar-benar diketahui">
        ${q.answers.map((answer, i) => `<button type="button" class="activity-answer" data-answer="${i}">${answer}</button>`).join('')}
      </div>
      <div class="activity-feedback" id="detectiveFeedback" role="status" aria-live="polite" hidden></div>
    `);
    $$('.activity-answer', body).forEach(btn => btn.addEventListener('click', () => {
      if (detectiveAnswered) return;
      detectiveAnswered = true;
      const picked = Number(btn.dataset.answer);
      $$('.activity-answer', body).forEach(item => {
        item.disabled = true;
        if (Number(item.dataset.answer) === q.correct) item.classList.add('is-correct');
        if (item === btn) item.classList.add('is-picked');
      });
      const feedback = $('#detectiveFeedback', body);
      feedback.hidden = false;
      feedback.innerHTML = `<strong></strong><span></span><div><button type="button" class="activity-cta" id="detectiveNext">${detectiveIndex + 1 < detectiveCases.length ? 'Kes seterusnya →' : 'Selesai meneroka ✦'}</button></div>`;
      $('strong', feedback).textContent = picked === q.correct ? 'Ya! Kamu menemui fakta. 🔎' : 'Tak mengapa. Mari lihat petunjuknya. ♡';
      $('span', feedback).textContent = q.note;
      $('#detectiveNext', feedback).addEventListener('click', () => {
        if (detectiveIndex + 1 < detectiveCases.length) {
          detectiveIndex++;
          renderDetective();
        } else {
          markVisited('detective');
          closeDialog();
        }
      });
    }));
  }
  function renderThermometer() {
    setDialog(kindInfo.thermometer.title, kindInfo.thermometer.kicker, `
      <p class="activity-intro">Kita semua ada hari yang tenang dan hari yang berat. Cuba perhatikan intensiti emosi kamu tanpa menilai diri sendiri.</p>
      <label class="activity-question" for="thermoSlider" style="display:block">Seberapa kuat emosi kamu sekarang?</label>
      <input class="activity-slider" id="thermoSlider" type="range" min="0" max="10" step="1" value="5" />
      <div class="activity-scale"><span>0 · Tenang</span><output class="activity-number" id="thermoValue" for="thermoSlider">5 / 10</output><span>10 · Sangat kuat</span></div>
      <div class="activity-feedback" id="thermoFeedback" role="status" aria-live="polite"><strong></strong><span></span></div>
      <div class="activity-breathe"><span aria-hidden="true">🌿</span><span>Jika kamu selesa, cuba letakkan kaki di lantai dan rasa sokongan kerusi. Kamu boleh berhenti pada bila-bila masa.</span></div>
    `);
    const range = $('#thermoSlider', body);
    const feedback = $('#thermoFeedback', body);
    const render = () => {
      const level = Number(range.value);
      $('#thermoValue', body).textContent = `${level} / 10`;
      const heading = $('strong', feedback);
      const description = $('span', feedback);
      if (level >= 8) {
        heading.textContent = 'Emosi kamu terasa sangat kuat. ♡';
        description.textContent = 'Cuba cari tempat yang selamat dan orang dewasa yang kamu percaya. Jika kamu atau orang lain dalam bahaya, dapatkan bantuan segera.';
      } else if (level >= 5) {
        heading.textContent = 'Kamu sedang melalui perasaan yang agak kuat.';
        description.textContent = 'Jika sesuai, rehat sebentar, minum air atau berbual dengan orang yang kamu percaya. Kamu tidak perlu menghadapinya seorang diri.';
      } else {
        heading.textContent = 'Terima kasih kerana semak keadaan diri.';
        description.textContent = 'Apa pun tahap perasaan kamu, semuanya wajar diberi perhatian. Kamu boleh teruskan aktiviti mengikut keselesaan.';
      }
    };
    render();
    range.addEventListener('input', () => { render(); markVisited('thermometer'); });
  }
  $$('[data-adventure]').forEach(trigger => trigger.addEventListener('click', () => {
    const kind = trigger.dataset.adventure;
    if (kind === 'story') {
      const region = $('#ruang-sembang');
      region?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      const first = $('.cardBtn');
      if (first) first.focus({ preventScroll: true });
      return;
    }
    openDialog(kind, trigger);
  }));
  $('#closeAdventure')?.addEventListener('click', closeDialog);
  dialog.addEventListener('close', () => { activeGame = null; if (lastTrigger) lastTrigger.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });

  // Pair the new visible grade switcher with the original CBT engine grade selector.
  const grade = $('#gradeSelect');
  const syncLevel = () => {
    const choice = grade ? grade.value : 'auto';
    $$('.level-chip').forEach(btn => {
      const selected = choice === btn.dataset.level;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
    document.body.classList.toggle('adventure-young', choice === 'lower');
  };
  $$('.level-chip').forEach(btn => btn.addEventListener('click', () => {
    if (!grade) return;
    grade.value = btn.dataset.level;
    grade.dispatchEvent(new Event('change', { bubbles: true }));
    syncLevel();
  }));
  grade?.addEventListener('change', syncLevel);
  syncLevel();

  const tips = [
    'Hai! Kamu boleh mula dari mana-mana.',
    'Tak apa jika kamu belum tahu apa yang kamu rasa.',
    'Kamu boleh berhenti dan rehat bila-bila masa.',
    'Satu langkah kecil pun sudah bermakna.',
    'Perasaan kuat? Boleh minta bantuan orang dewasa.'
  ];
  let tipNumber = 0;
  $('#mascotTipBtn')?.addEventListener('click', () => {
    tipNumber = (tipNumber + 1) % tips.length;
    const speech = $('#mascotSays');
    if (speech) speech.textContent = tips[tipNumber];
  });
})();
