/* Session-only preference panel; NEVER identifies a student or stores data. */
(()=>{
  'use strict';
  const choices=document.querySelectorAll('[data-journey-goal]');
  const n=document.getElementById('journeyActivities');
  const note=document.getElementById('journeyNote');
  const map={
    know:{target:'feelings',message:'Kita boleh mula di Pulau Perasaan untuk menamakan emosi.'},
    calm:{target:'thermometer',message:'Gunung Tenang boleh membantu kamu mengenali tahap emosi.'},
    thought:{target:'detective',message:'Hutan Fikiran sesuai untuk mencuba beza fakta dengan andaian.'},
    story:{target:'story',message:'Kalau mahu bercerita, Teluk Cerita sedia untuk kamu.'}
  };
  choices.forEach(btn=>btn.addEventListener('click',()=>{
    choices.forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    const selected=map[btn.dataset.journeyGoal];if(!selected)return;
    if(note)note.textContent=selected.message+' Kamu boleh ubah pilihan bila-bila masa.';
    document.querySelectorAll('.island').forEach(el=>el.classList.toggle('journey-suggested',el.dataset.adventure===selected.target));
  }));
  window.addEventListener('kawan:activity-completed',e=>{
    if(n)n.textContent=String(e.detail?.completed||0)+' / 3 aktiviti asas telah dicuba';
  });
})();
