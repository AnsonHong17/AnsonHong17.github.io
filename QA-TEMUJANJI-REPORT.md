# Kawan CBT 5.2 — Appointment Module Test Report

## Inspected locally
- Built from Kawan CBT 5.1 full source; kept CBT engine, 3D map assets, transcript consent logic, previous GBK record manager, and existing Supabase config template.
- JavaScript syntax checked with `node --check` for newly added appointments.js and modified records.js/dashboard-pro.js.
- Automated headless Chromium with simulated Supabase client: 390px, 800px, 1440px viewport; no horizontal document overflow, no uncaught JS pageerrors.
- Pupil: appointment modal opens without GBK auth; required consent prevents submission; successfully submits with voluntary acknowledgment; receives reference code and explicit pending notice; no public appointment list.
- GBK: login required; after authorized mock login, Temujanji tab shows a pending request; can confirm only with scheduled date/time; updates status; close records clears private DOM and visible counts.
- Browser tests **do not** certify Supabase RLS enforcement. A standalone read-only permissions script is included.

## Safety and limitations
- SQL grants anon column-scoped INSERT only; GBK SELECT and UPDATE use `is_authorized_gbk()` RLS policies. This is a *design check*, not a live policy proof.
- Appointment queue is not a real-time availability calendar, not auto-confirmed, not automatically notified to pupil.
- The SQL does not provide bot protection or rate limiting. Anonymous direct inserts must be moved behind a server-side gate before production, with school approval and child privacy practices.
- Student form collects name/class because a counselor must be able to contact the student; schools must decide appropriate lawful collection/retention policies before use.
