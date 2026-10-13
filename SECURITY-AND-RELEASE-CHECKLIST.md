# Kawan CBT 5.0 — Security & Release Checklist

## Before making any new version public

- [ ] Make a GitHub commit/branch for known-good production code.
- [ ] Download or arrange a proper server-side database backup (GitHub history does not back up Supabase).
- [ ] Review existing approved GBK allow-list. Revoke GBK users who no longer need access.
- [ ] In an incognito window, verify a student cannot read any records directly.
- [ ] Verify actual Supabase `anon` role has **no SELECT, UPDATE, DELETE** on `student_submissions` and no access to `gbk_records`. Verify row level security enabled.
- [ ] Verify `student_submissions` anon INSERT grants only the specific student-submit columns, not teacher-only notes or status.
- [ ] Confirm unauthorised authenticated user cannot read or modify either table, including using direct REST API.
- [ ] Add **server-side request throttling / bot protection** to anonymous student submissions before use by real pupils; front-end form throttles are insufficient.
- [ ] Configure SSL/HTTPS and restrict allowed authentication redirects.
- [ ] Test reset password, login, logout, 10-minute timeout, tab-hiding cleanup on shared devices.
- [ ] Establish access log/retention/deletion policy and official school approval before processing real identifiable counselling information.
- [ ] Conduct guided testing with pupils and GBK using fictional stories; review language accessibility and misclassification risks.

## Supabase inspection query (read-only metadata, NOT sufficient by itself)

```sql
select schemaname, tablename, rowsecurity, forcerowsecurity
from pg_tables
where schemaname='public' and tablename in ('gbk_records', 'student_submissions');

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename in ('gbk_records', 'student_submissions')
order by tablename, policyname;
```

Run this only in the Supabase Dashboard SQL Editor. Review policies manually. **Do not paste secret keys, passwords, student records or private credentials into chats.**
