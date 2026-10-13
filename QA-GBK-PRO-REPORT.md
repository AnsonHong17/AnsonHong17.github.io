# Kawan CBT 5.1 — GBK Dashboard Pro QA

## Tested with browser (Chromium, simulated Supabase, fictional data)

- Anonymous visit: Dashboard hidden; login prompt required.
- Explicit transcript sharing: summary opt-in alone not sufficient; transcript extra opt-in requires preview and reviewed checkbox.
- Summary-only submission: transcript fields are omitted (backward-compatible with existing inbox).
- Transcript submission: separate consent flag and dialogue array transmitted only after explicit consent.
- Authorized GBK: 6 fictional inbox records loaded; dashboard summary and analytics shown only after mock allow-list approval.
- Unapproved GBK: denied; no record workspace.
- List filter: “transcript shared” shows only consenting submissions.
- Transcript detail: messages rendered using text nodes; initially collapsed.
- Export: transcript EXCLUDED by default; requires checkbox and warnings to include.
- Close workspace: record list/detail, dashboard charts and counters cleared; auth signout called.
- Desktop 1440px / mobile 390px: no horizontal overflow; no uncaught JavaScript errors.

## Regression checks

- 55/55 smart 4.2 text understanding assertions pass.
- 15/15 smart 4.3 context assertions pass.
- JS syntax checks pass for modified files.
- HTML parsed and internal referenced assets checked locally.

## Not yet done

- Supabase SQL migration has **not** been executed against the user's database in this environment.
- Real Supabase RLS, permissions, email/password, multiple GBK accounts, retention, rate limiting, spam prevention and backup/restore require a user-controlled staging environment.
- Clinical/professional counseling safety and legal compliance not certified.
- Browser tests use fake credentials and fake student records, never real pupil data.

**Do not process actual pupil counseling records until access control, school authorization, anti-abuse gating and data governance are completed.**
