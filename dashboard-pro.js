/* Kawan CBT 5.1 — GBK Dashboard Pro
 * Pure UI: only sanitized aggregates from records.js after verified GBK auth.
 * Never stores student case data in localStorage or logs individual transcripts.
 */
(() => {
  "use strict";
  const panel = document.getElementById("gbkOverview");
  if (!panel) return;
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  const tabOverview = document.getElementById("gbkTabOverview");
  const tabAnalytics = document.getElementById("gbkTabAnalytics");
  const paneOverview = document.getElementById("gbkSummaryPanel");
  const paneAnalytics = document.getElementById("gbkAnalyticsPanel");
  const paneAppointments = document.getElementById("gbkAppointmentsPanel");
  const tabAppointments = document.getElementById("gbkTabAppointments");
  function changeTab(which) {
    const analytics = which === "analytics";
    const appointments = which === "appointments";
    paneOverview.hidden = analytics || appointments;
    paneAnalytics.hidden = !analytics;
    if (paneAppointments) paneAppointments.hidden = !appointments;
    document.getElementById("recordsModal")?.classList.toggle("gbk-appointments-active",appointments);
    tabOverview.setAttribute("aria-selected", String(!analytics && !appointments));
    tabAnalytics.setAttribute("aria-selected", String(analytics));
    tabAppointments?.setAttribute("aria-selected", String(appointments));
    window.dispatchEvent(new CustomEvent("kawan:appointment-panel",{detail:{visible:appointments && !panel.hidden}}));
  }
  tabOverview?.addEventListener("click", () => changeTab("overview"));
  tabAnalytics?.addEventListener("click", () => changeTab("analytics"));
  tabAppointments?.addEventListener("click", () => changeTab("appointments"));

  const chartNames = ["gbkEmotionChart", "gbkTopicChart", "gbkMonthlyChart", "gbkSourceChart"];
  function clearCharts() { chartNames.forEach(id => document.getElementById(id)?.replaceChildren()); }
  function renderBars(elementId, items, total, minCount) {
    const root = document.getElementById(elementId);
    if (!root) return;
    root.replaceChildren();
    if (total < 5) {
      const p = document.createElement("p");
      p.className = "gbk-pro-chart-empty";
      p.textContent = "Belum cukup data untuk paparan pecahan (minimum 5 rekod).";
      root.appendChild(p);
      return;
    }
    const selected = (Array.isArray(items) ? items : []).filter(item =>
      typeof item?.label === "string" && Number.isFinite(Number(item.count)) && Number(item.count) >= minCount
    ).slice(0, 6);
    if (!selected.length) {
      const p = document.createElement("p");
      p.className = "gbk-pro-chart-empty";
      p.textContent = "Kategori kecil disembunyikan untuk menjaga privasi.";
      root.appendChild(p);
      return;
    }
    const top = Math.max(...selected.map(x => Number(x.count)), 1);
    selected.forEach(item => {
      const row = document.createElement("div");
      row.className = "gbk-pro-bar-row";
      const heading = document.createElement("div");
      heading.className = "gbk-pro-bar-meta";
      const title = document.createElement("span");
      title.textContent = item.label;
      const num = document.createElement("strong");
      num.textContent = String(item.count);
      heading.append(title, num);
      const track = document.createElement("div");
      track.className = "gbk-pro-bar-track";
      const fill = document.createElement("div");
      fill.className = "gbk-pro-bar-fill";
      fill.style.width = `${Math.max(3, Number(item.count) / top * 100)}%`;
      track.appendChild(fill);
      row.append(heading, track);
      root.appendChild(row);
    });
  }
  function reset() {
    panel.hidden = true;
    ["gbkTotal", "gbkInbox", "gbkPending", "gbkFollow", "gbkDone", "gbkTranscriptTotal", "gbkDueFollowUps", "gbkReviewMarkers"].forEach(id=>setText(id, "—"));
    clearCharts();
    changeTab("overview");
  }
  function update(info) {
    if (!info?.authorized) { reset(); return; }
    panel.hidden = false;
    setText("gbkTotal", info.total ?? 0);
    setText("gbkInbox", info.submissions ?? 0);
    setText("gbkPending", info.pending ?? 0);
    setText("gbkFollow", info.follow ?? 0);
    setText("gbkDone", info.done ?? 0);
    const stats = info.analytics || {};
    setText("gbkTranscriptTotal", stats.withTranscript ?? 0);
    setText("gbkDueFollowUps", stats.newFollowUps ?? 0);
    setText("gbkReviewMarkers", stats.reviewMarkers ?? 0);
    renderBars("gbkEmotionChart", stats.emotion, stats.total ?? 0, 5);
    renderBars("gbkTopicChart", stats.topic, stats.total ?? 0, 5);
    renderBars("gbkMonthlyChart", stats.months, stats.total ?? 0, 5);
    renderBars("gbkSourceChart", stats.source, stats.total ?? 0, 5);
  }
  window.addEventListener("kawan:gbk-dashboard", ev => update(ev.detail));
  document.querySelectorAll("[data-gbk-status]").forEach(btn => btn.addEventListener("click", () => {
    if (panel.hidden) return;
    const select = document.getElementById("recordsStatusFilter");
    if (select) { select.value = btn.dataset.gbkStatus || ""; select.dispatchEvent(new Event("change", {bubbles:true})); }
    document.getElementById("recordsList")?.scrollIntoView({behavior:"smooth",block:"nearest"});
  }));
  document.getElementById("gbkFilterSubmissions")?.addEventListener("click", () => {
    if (panel.hidden) return;
    const source = document.getElementById("recordsSourceFilter");
    if (source) { source.value = "student_submission"; source.dispatchEvent(new Event("change", {bubbles:true})); }
    document.getElementById("recordsList")?.scrollIntoView({behavior:"smooth",block:"nearest"});
  });
  // Belt and braces UI clearing when closing workspace, regardless of backend.
  document.getElementById("closeRecords")?.addEventListener("click", reset);
  reset();
})();
