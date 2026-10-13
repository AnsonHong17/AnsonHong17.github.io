# Release checklist (before real student data)

- [ ] Supabase staging backup/snapshot available; do not rely on GitHub as database backup
- [ ] Incremental SQL migration succeeds on staging; previous student submissions remain intact
- [ ] Read-only permissions script shows anon SELECT/UPDATE/DELETE = false and RLS = true
- [ ] Test anonymous REST requests with publishable key: SELECT/UPDATE/DELETE fail (also verify no broad permissive RLS policies)
- [ ] Test approved GBK can access allowed records; unapproved account cannot access any student data
- [ ] Test old summary-only submissions, new summary-only, separately consented transcript, and consent withdrawal before submit
- [ ] Test transcript preview, PII redaction, cancellation, kiosk/new session reset and shared-computer logout
- [ ] Test retained transcripts under storage, access, backup, deletion and export policy
- [ ] Server-side anti-bot/rate-limit at anonymous submission gateway completed
- [ ] School leadership / data controller consent, safeguarding workflow, parental/guardian policy, retention/deletion, incident response confirmed
- [ ] Mobile usability and accessibility field testing with fictional content completed
- [ ] Deployment tested on staging URL before updating live GitHub Pages
