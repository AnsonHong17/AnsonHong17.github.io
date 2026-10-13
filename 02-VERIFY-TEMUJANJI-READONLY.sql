-- Read-only permission audit. Run in Supabase SQL Editor.
SELECT rolname, has_table_privilege(rolname,'public.gbk_appointments','SELECT') AS can_select,
 has_table_privilege(rolname,'public.gbk_appointments','DELETE') AS can_delete,
 has_column_privilege(rolname,'public.gbk_appointments','student_name','INSERT') AS can_insert_name,
 has_column_privilege(rolname,'public.gbk_appointments','status','UPDATE') AS can_update_status
FROM pg_roles WHERE rolname IN ('anon','authenticated') ORDER BY rolname;
SELECT policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public' AND tablename='gbk_appointments';
SELECT relname,relrowsecurity FROM pg_class WHERE oid='public.gbk_appointments'::regclass;
-- NOTE: authenticated SQL privileges alone do NOT mean all authenticated
-- users can read. RLS requires public.is_authorized_gbk() to return true.
-- Expected anon: can_select=false, can_delete=false, can_insert_name=true,
-- can_update_status=false. Authenticated: can_select=true, can_delete=false,
-- can_insert_name=false, can_update_status=true (GBK RLS required).
