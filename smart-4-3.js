/* Kawan CBT Smart 4.3: session-only context tracking.
 * Enhances a limited set of SAFE, non-crisis follow-ups. It is not generative AI.
 * Never persists raw messages, personal data or clinical inferences.
 */
(function(root){
  'use strict';
  const clean=t=>String(t||'').toLowerCase().replace(/\s+/g,' ').trim();
  const match=(t,re)=>re.test(t);
  function create(){return {turns:[],asked:new Set(),facts:{},lastType:'',corrections:0};}
  function observe(memory,text,step,source){
    if(!memory || source!=='typed' || String(text).startsWith('__')) return memory;
    const t=clean(text); if(!t) return memory;
    // Persist ONLY abstract facts; no names or raw student narratives.
    const f=memory.facts;
    if(match(t,/\b(?:dulu|tahun lepas|sebelum ini|last year)\b/)) f.past=true;
    if(match(t,/\b(?:masih|sekarang|lagi|setiap hari|berulang|hingga kini)\b/)) f.ongoing=true;
    if(match(t,/\b(?:dah|sudah|pernah)\s+(?:cakap|beritahu|lapor)\s+(?:pada|kepada)?\s*(?:cikgu|guru|kaunselor|ibu|ayah|mak|bapa)/)) f.reported=true;
    if(match(t,/\b(?:cikgu|guru|orang dewasa)\s+(?:tak|tidak|belum)\s+(?:tolong|bantu|buat apa)/)) f.helpNotReceived=true;
    if(match(t,/\b(?:cuma|hanya|sekadar)\s+(?:main|bermain|kawan biasa)|\bbukan\s+(?:kawan rapat|rapat)/)) f.notClose=true;
    if(match(t,/\b(?:saya|aku)\s+(?:dah|sudah|pernah)\s+(?:cuba|ajak|tanya)/)) f.tried=true;
    if(match(t,/\b(?:dia|mereka)\s+(?:tak|tidak)\s+(?:mahu|nak|ingin)\s+(?:kawan|main|ajak)/)) f.rejected=true;
    if(match(t,/\b(?:cikgu|guru)\s+(?:sangka|ingat)\s+(?:saya|aku)|\bpadahal\s+(?:saya|aku)\s+(?:diam|tak|tidak)/)) f.misunderstood=true;
    if(match(t,/\b(?:sebenarnya|bukan begitu|maksud saya|saya maksudkan|bukan macam tu)\b/)) memory.corrections++;
    if(match(t,/\b(?:tak tahu|tak pasti|belum sedia|tak mahu cerita|tak nak jawab)\b/)) memory.lastType='uncertain';
    else if(match(t,/\b(?:tolong|bantuan|bantu saya)\b/)) memory.lastType='help';
    else memory.lastType='sharing';
    memory.turns.push({step:Number(step)||0,kind:memory.lastType});
    if(memory.turns.length>18) memory.turns.shift();
    return memory;
  }
  function chooseFollowUp(state, memory){
    if(!state || !memory || state.safetySupportMode || /^(?:orange|red)$/.test(state.safetyFlag||'')) return null;
    const issue=state.issueType;
    const f=memory.facts;
    const ideas=[];
    if(issue==='friend' && f.tried && f.rejected) ideas.push({id:'friend_rejected', question:'Kamu sudah cuba mengajak mereka tetapi ditolak. Adakah perkara itu sekali sahaja atau berulang?', options:['Sekali sahaja.','Sudah berlaku beberapa kali.','Saya belum pasti / mahu langkau.']});
    if(issue==='friend' && f.notClose) ideas.push({id:'friend_notclose',question:'Kamu kata mereka cuma kawan bermain, bukan kawan rapat. Kamu lebih mahu hubungan yang rapat, atau cuma mahu bermain dengan selesa?',options:['Saya mahu ada kawan yang lebih rapat.','Cukup boleh bermain dengan selesa.','Saya belum pasti.']});
    if(issue==='teacher' && f.misunderstood) ideas.push({id:'teacher_misread',question:'Kamu rasa cikgu tersalah faham. Adakah kamu ada peluang menerangkan apa yang sebenarnya berlaku?',options:['Ada, tetapi cikgu masih marah.','Belum ada peluang.','Saya mahu minta bantuan GBK.']});
    if(issue==='exam' && f.tried) ideas.push({id:'exam_effort',question:'Kamu sudah mencuba. Bahagian mana yang masih terasa susah selepas usaha itu?',options:['Memahami topik.','Mengurus masa.','Bimbang tentang markah.']});
    if(issue==='family' && !state.safetySupportMode && f.reported) ideas.push({id:'family_support',question:'Kamu ada menyebut pernah bercerita kepada orang dewasa. Adakah kamu rasa didengari?',options:['Ya, saya rasa didengar.','Belum begitu.','Saya belum mahu jawab.']});
    const selected=ideas.find(i=>!memory.asked.has(i.id));
    if(!selected) return null;
    memory.asked.add(selected.id);
    return {question:selected.question,options:selected.options};
  }
  function sessionSnapshot(memory){
    // For debugging/testing only: anonymous boolean facts, no transcript.
    return memory ? {turnCount:memory.turns.length,topicFacts:{...memory.facts},corrections:memory.corrections} : null;
  }
  root.KawanSmart43=Object.freeze({create,observe,chooseFollowUp,sessionSnapshot,version:'4.3-beta'});
})(typeof window!=='undefined'?window:globalThis);
