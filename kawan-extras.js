/* Kawan CBT 4.4/4.5/4.7: session-only games, mood mascot and accessibility.
 * Games NEVER read/send transcripts, student identifiers or Supabase data.
 */
(()=>{
 'use strict';
 const $=(s,p=document)=>p.querySelector(s);
 const $$=(s,p=document)=>Array.from(p.querySelectorAll(s));
 const mascot=$('#mascotSays');
 let mood='welcome';
 const lines={welcome:'Hai! Jom teroka satu langkah kecil. ☁️',listening:'Saya mendengar. Kamu boleh cerita perlahan-lahan.',thinking:'Kawan sedang fikir cara yang sesuai untuk membantu.',comfort:'Tak apa kalau masih sedih atau risau. Perasaan kamu penting.',safety:'Jika kamu tak selamat, cari guru atau orang dewasa yang dipercayai sekarang.',proud:'Bagus kerana kamu cuba. Tak perlu jadi sempurna.'};
 function changeMood(type){
   mood=lines[type]?type:'listening';
   if(mascot) mascot.textContent=lines[mood];
   document.body.dataset.mascotMood=mood;
   const chatMood=$('#kawanMoodLine');
   if(chatMood) chatMood.textContent=lines[mood];
 }
 window.addEventListener('kawan:chat-event',event=>{
   const detail=event.detail||{};
   const text=String(detail.text||'').toLowerCase();
   if(detail.safety || detail.tag==='warn' || /(?:tak selamat|tidak selamat|kena pukul|ugut|bunuh diri)/.test(text)) changeMood('safety');
   else if(detail.role==='user' && /(?:sedih|risau|takut|kecewa|malu|menangis)/.test(text)) changeMood('comfort');
   else if(detail.role==='user') changeMood('listening');
   else if(detail.tag==='ok') changeMood('proud');
   else changeMood('thinking');
 });
 $('#resetBtn')?.addEventListener('click',()=>changeMood('welcome'));
 // All accessibility toggles are session-only; no cookies or student storage.
 const controls=[['a11yLarge','a11y-large'],['a11yContrast','a11y-contrast'],['a11yMotion','a11y-less-motion'],['a11yReading','a11y-easy-read']];
 controls.forEach(([id,cls])=>{
   const c=$('#'+id); if(!c) return;
   c.addEventListener('change',()=>document.body.classList.toggle(cls,c.checked));
 });
 // Add two optional activities to a SEPARATE dialog; no copies of student input retained.
 const dialog=$('#extraGameDialog'), content=$('#extraGameContent'), title=$('#extraGameTitle');
 if(!dialog||!content||!title) return;
 let returnFocus=null;
 let active=''; let questionIndex=0;
 const cases=[
   {story:'Tiga murid berjalan melewati saya tanpa menyapa.',fact:'Tiga murid berjalan melewati saya tanpa menyapa.',guess:'Mereka pasti benci saya.',explain:'Kita tahu mereka tidak menyapa. Kita belum tahu sebabnya. Jika ada ejekan atau ancaman yang benar, itu bukan sekadar tekaan dan kamu boleh meminta bantuan.'},
   {story:'Saya mendapat 5 daripada 10 markah.',fact:'Saya mendapat 5 daripada 10 markah.',guess:'Saya tidak akan pandai sampai bila-bila.',explain:'Keputusan satu latihan ialah maklumat tentang latihan itu, bukan ukuran nilai diri kamu.'},
   {story:'Kawan saya berkata dia belum boleh bermain hari ini.',fact:'Kawan berkata dia belum boleh bermain hari ini.',guess:'Dia tidak mahu berkawan dengan saya selama-lamanya.',explain:'Apa yang dikatakan hari ini belum membuktikan apa yang akan berlaku selama-lamanya.'}
 ];
 function show(html){content.innerHTML=html;}
 function open(kind,trigger){
   active=kind; returnFocus=trigger;
   title.textContent=kind==='fact'?'Fakta atau Andaian?':'Misi Langkah Kecil';
   if(kind==='fact'){questionIndex=0;renderFact();} else renderSteps();
   if(typeof dialog.showModal==='function')dialog.showModal();
 }
 function renderFact(){
   const data=cases[questionIndex];
   show(`<p class="extra-kicker">MISI ${questionIndex+1} / ${cases.length}</p><p class="extra-story"></p><p>Pilih ayat yang kita <strong>benar-benar tahu</strong>:</p><div class="extra-answers"></div><div id="extraFeedback" class="extra-feedback" role="status" aria-live="polite"></div>`);
   $('.extra-story',content).textContent=data.story;
   const list=$('.extra-answers',content);
   const order=questionIndex%2?[['guess',data.guess],['fact',data.fact]]:[['fact',data.fact],['guess',data.guess]];
   order.forEach(([key,label])=>{
     const button=document.createElement('button'); button.type='button';button.className='extra-choice';button.textContent=label;
     button.addEventListener('click',()=>{
       $$('.extra-choice',content).forEach(b=>b.disabled=true);
       const feedback=$('#extraFeedback',content); feedback.textContent=(key==='fact'?'✓ Ya, itu fakta yang diketahui. ':'Belum tentu. Itu andaian, bukan fakta yang pasti. ')+data.explain;
       const next=document.createElement('button');next.className='extra-next';next.type='button';next.textContent=questionIndex<cases.length-1?'Misi seterusnya →':'Selesai ✓';
       next.addEventListener('click',()=>{questionIndex++;if(questionIndex<cases.length)renderFact();else renderDone();});
       feedback.appendChild(next);next.focus();
     });list.appendChild(button);
   });
 }
 function renderSteps(){
   const choices=[['Kawan-kawan','Cuba sapa seorang kawan yang kamu rasa selesa.'],['Peperiksaan','Pilih satu latihan kecil selama lima minit.'],['Emosi yang kuat','Berhenti sebentar, tarik nafas perlahan, dan cari bantuan jika perlu.']];
   show('<p>Tiada markah salah. Pilih satu topik untuk melihat contoh langkah kecil.</p><div class="extra-answers"></div><div id="extraFeedback" class="extra-feedback" role="status" aria-live="polite"></div>');
   const list=$('.extra-answers',content);
   choices.forEach(([name,advice])=>{const button=document.createElement('button');button.type='button';button.className='extra-choice';button.textContent=name;
     button.addEventListener('click',()=>{
       const fb=$('#extraFeedback',content);fb.replaceChildren();
       const label=document.createElement('p');label.textContent=advice;
       const help=document.createElement('p');help.textContent='Jika seseorang mengancam atau menyakiti kamu, jangan cuba menyelesaikannya sendiri. Dapatkan orang dewasa yang selamat.';
       fb.append(label,help);
     });list.appendChild(button);
   });
 }
 function renderDone(){show('<div class="extra-finished"><strong>✦ Bagus, kamu telah mencuba!</strong><p>Fakta ialah perkara yang diketahui. Andaian perlu disemak, bukan terus dipercayai.</p><p>Aktiviti ini tidak menghantar jawapan ke rekod GBK.</p></div>');}
 $$('.extra-game-open').forEach(b=>b.addEventListener('click',()=>open(b.dataset.extraGame,b)));
 $('#closeExtraGame')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{active='';content.replaceChildren();returnFocus?.focus();});
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
})();
