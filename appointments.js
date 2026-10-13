/* Kawan CBT 5.2 — appointment REQUESTS, not confirmed bookings.
 * Client: anonymous write-only request; GBK: existing auth-gated RPC/table bridge.
 * No localStorage and no public read/status endpoint. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const modal = $("appointmentModal");
  const form = $("appointmentForm");
  const btn = $("appointmentSubmit");
  const msg = $("appointmentStudentMessage");
  const success = $("appointmentSuccess");
  const formSection = $("appointmentFormSection");
  const adminPane = $("gbkAppointmentsPanel");
  const adminList = $("appointmentAdminList");
  const adminMessage = $("appointmentAdminMessage");
  const config = window.KAWAN_SUPABASE_CONFIG || {};
  const available = !!(config.supabaseUrl && config.supabaseAnonKey && window.supabase?.createClient);
  const anonymousClient = available ? window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:"kawan-appointments-anon"}
  }) : null;
  const adminApi = () => window.KAWAN_APPOINTMENTS_GBK;
  let submitting = false;
  let adminAuthorized = false;
  let adminVisible = false;
  let loading = false;
  let requestGeneration = 0;
  let lastFetched = [];
  const allowedStatus = ["Baharu","Dalam urusan","Disahkan","Selesai","Tidak dapat diatur"];

  function localDate(offset=0){
    const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()+offset);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }
  function setStudentMessage(message,type="info") { if(msg){msg.textContent=message;msg.dataset.type=type;} }
  function openForm(){
    if(!modal)return;
    form?.reset();
    if(formSection)formSection.hidden=false;
    if(success)success.hidden=true;
    const input = $("appointmentDate");
    if(input){input.min=localDate(0);input.max=localDate(60);input.value="";}
    setStudentMessage(available ? "" : "Konfigurasi Supabase belum tersedia. Permohonan tidak boleh dihantar dalam mod ujian tanpa sambungan.", available ? "info":"error");
    modal.classList.remove("hidden");
    $("appointmentName")?.focus();
  }
  function closeForm(){
    if(!modal)return;
    modal.classList.add("hidden");
    form?.reset();
    if(success)success.hidden=true;
    if(formSection)formSection.hidden=false;
    if($("appointmentReference"))$("appointmentReference").textContent="";
    setStudentMessage("");
  }
  ["appointmentBtn","appointmentHeroBtn"].forEach(id=>$(id)?.addEventListener("click",openForm));
  $("closeAppointment")?.addEventListener("click",closeForm);
  $("appointmentFinish")?.addEventListener("click",closeForm);
  modal?.querySelector("[data-appointment-close]")?.addEventListener("click",closeForm);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape" && modal && !modal.classList.contains("hidden")) {e.stopImmediatePropagation();closeForm();}
  },true);
  function referenceCode(){
    if(!window.crypto?.getRandomValues)throw new Error("Cryptographic randomness unavailable");
    const bytes=new Uint8Array(10);window.crypto.getRandomValues(bytes);
    const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return "T-"+Array.from(bytes,b=>alphabet[b%alphabet.length]).join("");
  }
  async function submitForm(event){
    event.preventDefault();
    if(submitting || !form?.reportValidity())return;
    if(!anonymousClient){setStudentMessage("Tiada sambungan Supabase. Sila minta cikgu semak persediaan sistem.","error");return;}
    const name=$("appointmentName").value.trim();
    const className=$("appointmentClass").value.trim();
    const date=$("appointmentDate").value;
    const time=$("appointmentSlot").value;
    const purpose=$("appointmentPurpose").value;
    if(name.length<2 || name.length>70 || className.length<2 || className.length>40 || date < localDate(0) || date > localDate(60)){
      setStudentMessage("Sila semak nama, kelas dan tarikh dalam tempoh 60 hari.","error");return;
    }
    if(!$("appointmentAck")?.checked){setStudentMessage("Sila baca dan tanda pengesahan dahulu.","error");return;}
    submitting=true;btn.disabled=true;btn.textContent="Sedang menghantar…";
    try{
      const reference=referenceCode();
      const payload={reference_code:reference,student_name:name,class_name:className,
        preferred_date:date,preferred_time:time,request_purpose:purpose,student_acknowledged:true};
      // INSERT without .select(): anon does not have SELECT/RETURNING permission.
      const {error}=await anonymousClient.from("gbk_appointments").insert(payload);
      if(error)throw error;
      if($("appointmentReference"))$("appointmentReference").textContent=reference;
      form.reset();formSection.hidden=true;success.hidden=false;success.focus();
    }catch(error){
      // Do not log names, class or other pupil input to console.
      setStudentMessage("Permohonan tidak dapat dihantar. Sila cuba kemudian atau jumpa GBK secara langsung. Jika masalah berulang, minta cikgu semak jadual SQL.","error");
    }finally{ submitting=false;btn.disabled=false;btn.textContent="📨 Hantar permohonan"; }
  }
  form?.addEventListener("submit",submitForm);

  function setAdminMessage(message,type="info"){
    if(!adminMessage)return;
    adminMessage.textContent=message;adminMessage.dataset.type=type;
  }
  function emptyAdmin(){
    lastFetched=[]; requestGeneration++;
    if(adminList)adminList.replaceChildren();
    ["appointmentTotal","appointmentNew","appointmentConfirmed"].forEach(id=>{if($(id))$(id).textContent="—";});
    const pill=$("gbkAppointmentCount");if(pill){pill.textContent="";pill.hidden=true;}
    setAdminMessage("");
  }
  function safeText(parent,text,tag="span",className=""){
    const el=document.createElement(tag);el.textContent=String(text ?? "—");
    if(className)el.className=className;
    parent.appendChild(el);return el;
  }
  function detail(parent,label,value){
    const item=document.createElement("div");safeText(item,label,"strong");safeText(item,value||"—");parent.appendChild(item);
  }
  function datetimeLocalValue(iso){
    if(!iso)return "";
    const dt=new Date(iso);if(Number.isNaN(dt.getTime()))return "";
    const pad=x=>String(x).padStart(2,"0");
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }
  function createSelect(options,value){
    const sel=document.createElement("select");
    options.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o);});
    sel.value=allowedStatus.includes(value)?value:"Baharu";
    return sel;
  }
  function createEditorLabel(parent,label,control){
    const root=document.createElement("label");safeText(root,label,"span");root.appendChild(control);parent.appendChild(root);
  }
  function drawAppointment(row){
    const article=document.createElement("article");article.className="appointment-admin-card";
    const head=document.createElement("div");head.className="appointment-card-head";
    const left=document.createElement("div");safeText(left,row.student_name,"h5");
    safeText(left,`Kelas: ${row.class_name} · Rujukan ${row.reference_code}`,"p");
    head.appendChild(left);safeText(head,row.status,"span","appointment-status-pill");article.appendChild(head);
    const details=document.createElement("div");details.className="appointment-details";
    detail(details,"Tarikh dimohon",row.preferred_date);
    detail(details,"Waktu pilihan",row.preferred_time);
    detail(details,"Tujuan umum",row.request_purpose);
    detail(details,"Dihantar",new Date(row.created_at).toLocaleString("ms-MY"));
    article.appendChild(details);
    const grid=document.createElement("div");grid.className="appointment-edit-grid";
    const status=createSelect(allowedStatus,row.status);
    createEditorLabel(grid,"Status permohonan",status);
    const when=document.createElement("input");when.type="datetime-local";when.value=datetimeLocalValue(row.appointment_at);
    createEditorLabel(grid,"Tarikh dan masa ditetapkan (oleh GBK)",when);
    const notes=document.createElement("textarea");notes.maxLength=500;notes.rows=2;notes.value=row.gbk_note || "";notes.placeholder="Catatan dalaman ringkas (pilihan)";
    createEditorLabel(grid,"Catatan untuk GBK sahaja",notes);
    article.appendChild(grid);
    const footer=document.createElement("div");footer.className="appointment-card-foot";
    safeText(footer,"Maklumkan pengesahan kepada murid melalui saluran sekolah.","p");
    const save=document.createElement("button");save.type="button";save.className="btn btn-primary";save.textContent="Simpan keputusan";
    footer.appendChild(save);article.appendChild(footer);
    save.addEventListener("click",async()=>{
      if(!adminAuthorized || !adminApi())return;
      const statusValue=status.value;
      let at=null;
      if(statusValue==="Disahkan"){
        if(!when.value){setAdminMessage("Untuk Disahkan, isi tarikh dan masa sesi dahulu.","error");when.focus();return;}
        const parsed=new Date(when.value);
        if(Number.isNaN(parsed.getTime())){setAdminMessage("Tarikh dan masa tidak sah.","error");return;}
        at=parsed.toISOString();
      }else if(when.value){
        const parsed=new Date(when.value);
        if(!Number.isNaN(parsed.getTime()))at=parsed.toISOString();
      }
      const generation=requestGeneration;
      save.disabled=true;save.textContent="Menyimpan…";
      try{
        const {error}=await adminApi().update(row.id,{status:statusValue,appointment_at:at,gbk_note:notes.value});
        if(!adminAuthorized || generation!==requestGeneration)return;
        if(error)throw error;
        setAdminMessage("Perubahan telah disimpan. Ingat: murid belum menerima pemberitahuan automatik.","ok");
        await loadAdmin();
      }catch(error){if(adminAuthorized && generation===requestGeneration)setAdminMessage("Gagal menyimpan. Semak capaian GBK, dasar RLS atau sambungan.","error");}
      finally{save.disabled=false;save.textContent="Simpan keputusan";}
    });
    return article;
  }
  function renderAdmin(){
    if(!adminAuthorized || !adminList)return;
    adminList.replaceChildren();
    const filter=$("appointmentStatusFilter")?.value||"";
    const rows=lastFetched.filter(row=>!filter || row.status===filter);
    if(!rows.length){safeText(adminList,"Tiada permohonan untuk status ini.","p");return;}
    rows.forEach(row=>adminList.appendChild(drawAppointment(row)));
  }
  async function loadAdmin(){
    if(!adminAuthorized || !adminVisible || loading || !adminApi())return;
    const generation=requestGeneration;loading=true;
    setAdminMessage("Memuatkan permohonan yang dibenarkan…");
    try{
      const {data,error}=await adminApi().list();
      if(generation!==requestGeneration || !adminAuthorized || !adminVisible)return;
      if(error)throw error;
      lastFetched=Array.isArray(data)?data:[];
      const total=lastFetched.length;
      const fresh=lastFetched.filter(r=>r.status==="Baharu").length;
      const confirmed=lastFetched.filter(r=>r.status==="Disahkan").length;
      $("appointmentTotal").textContent=String(total);
      $("appointmentNew").textContent=String(fresh);
      $("appointmentConfirmed").textContent=String(confirmed);
      const pill=$("gbkAppointmentCount");if(pill){pill.textContent=String(fresh);pill.hidden=fresh===0;}
      setAdminMessage(total?`${total} permohonan dipaparkan. Slot belum disahkan kecuali ditandakan Disahkan.`:"Belum ada permohonan.");
      renderAdmin();
    }catch(error){if(generation===requestGeneration && adminAuthorized)setAdminMessage("Gagal memuatkan. Jalankan SQL temujanji dahulu dan semak akses GBK.","error");}
    finally{loading=false;}
  }
  $("refreshAppointments")?.addEventListener("click",loadAdmin);
  $("appointmentStatusFilter")?.addEventListener("change",renderAdmin);
  window.addEventListener("kawan:gbk-dashboard",e=>{
    adminAuthorized=!!e.detail?.authorized;
    if(!adminAuthorized){adminVisible=false;loading=false;emptyAdmin();}
  });
  window.addEventListener("kawan:appointment-panel",e=>{
    adminVisible=!!e.detail?.visible && adminAuthorized;
    if(adminVisible)loadAdmin();
  });
})();
