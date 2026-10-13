-- READ ONLY audit, no student content returned. Run AFTER migration.
SELECT 'student_submissions RLS' AS check_name,
       c.relrowsecurity::text AS observed,
       'true' AS expected
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relname='student_submissions'
UNION ALL
SELECT 'anon SELECT permission',
       pg_catalog.has_table_privilege('anon','public.student_submissions','SELECT')::text,
       'false'
UNION ALL
SELECT 'anon UPDATE permission',
       pg_catalog.has_table_privilege('anon','public.student_submissions','UPDATE')::text,
       'false'
UNION ALL
SELECT 'anon DELETE permission',
       pg_catalog.has_table_privilege('anon','public.student_submissions','DELETE')::text,
       'false'
UNION ALL
SELECT 'anon INSERT transcript_data',
       pg_catalog.has_column_privilege('anon','public.student_submissions','transcript_data','INSERT')::text,
       'true'
UNION ALL
SELECT 'anon INSERT transcript_consent',
       pg_catalog.has_column_privilege('anon','public.student_submissions','transcript_consent','INSERT')::text,
       'true';

-- Inspect effective policies carefully; a permissive anonymous SELECT policy
-- from another deployment must be fixed before using real cases.
SELECT policyname, cmd, roles, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname='public' AND tablename IN ('gbk_records','student_submissions')
ORDER BY tablename, policyname;
