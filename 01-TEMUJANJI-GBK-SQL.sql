-- Kawan CBT 5.2: pupil appointment REQUESTS, not real-time booking.
-- Run as project owner in Supabase SQL Editor AFTER the original GBK setup.
-- Keeps gbk_records and student_submissions permissions unchanged.
-- WARNING: anonymous INSERT alone cannot stop spam. Production needs an Edge
-- Function with server-side rate limits + bot protection and school approval.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.is_authorized_gbk()') IS NULL THEN
   RAISE EXCEPTION 'Missing is_authorized_gbk() from original GBK setup';
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.gbk_appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reference_code text NOT NULL UNIQUE CHECK(reference_code ~ '^T-[A-Z0-9]{10}$'),
 student_name text NOT NULL CHECK (length(btrim(student_name)) BETWEEN 2 AND 70),
 class_name text NOT NULL CHECK (length(btrim(class_name)) BETWEEN 2 AND 40),
 preferred_date date NOT NULL,
 preferred_time text NOT NULL CHECK (preferred_time IN ('Waktu rehat','Sebelum balik','Selepas sekolah','Ikut masa cikgu')),
 request_purpose text NOT NULL DEFAULT 'Tidak dinyatakan'
   CHECK (request_purpose IN ('Tidak dinyatakan','Saya mahu bercerita','Bincang tentang perasaan','Bincang tentang sekolah')),
 student_acknowledged boolean NOT NULL DEFAULT false CHECK(student_acknowledged = true),
 created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'Baharu'
   CHECK (status IN ('Baharu','Dalam urusan','Disahkan','Selesai','Tidak dapat diatur')),
 appointment_at timestamptz,
 gbk_note text NOT NULL DEFAULT '' CHECK (length(gbk_note) <= 500),
 reviewed_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT confirm_requires_time CHECK (status <> 'Disahkan' OR appointment_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS gbk_appointments_created_idx ON public.gbk_appointments(created_at DESC);
CREATE INDEX IF NOT EXISTS gbk_appointments_status_idx ON public.gbk_appointments(status);

-- Server rules: cannot request a past date or over 60 days in the future.
-- When updating, the original pupil submission may not be rewritten.
CREATE OR REPLACE FUNCTION public.kawan_appointment_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
   IF NEW.preferred_date < (pg_catalog.now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date
      OR NEW.preferred_date > ((pg_catalog.now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date + 60) THEN
     RAISE EXCEPTION 'Preferred date must be within the next 60 days';
   END IF;
   NEW.student_name := pg_catalog.btrim(NEW.student_name);
   NEW.class_name := pg_catalog.btrim(NEW.class_name);
 ELSE
   IF ROW(NEW.reference_code,NEW.student_name,NEW.class_name,NEW.preferred_date,
          NEW.preferred_time,NEW.request_purpose,NEW.student_acknowledged,NEW.created_at)
      IS DISTINCT FROM
      ROW(OLD.reference_code,OLD.student_name,OLD.class_name,OLD.preferred_date,
          OLD.preferred_time,OLD.request_purpose,OLD.student_acknowledged,OLD.created_at) THEN
     RAISE EXCEPTION 'Original student appointment request cannot be edited';
   END IF;
   NEW.updated_at := pg_catalog.now();
   NEW.reviewed_by := auth.uid();
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS kawan_appointment_guard_trigger ON public.gbk_appointments;
CREATE TRIGGER kawan_appointment_guard_trigger
BEFORE INSERT OR UPDATE ON public.gbk_appointments
FOR EACH ROW EXECUTE FUNCTION public.kawan_appointment_guard();

ALTER TABLE public.gbk_appointments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gbk_appointments FROM PUBLIC, anon, authenticated;
-- Pupil browser can only submit these exact fields, not see returned rows.
GRANT INSERT (reference_code,student_name,class_name,preferred_date,
  preferred_time,request_purpose,student_acknowledged) ON public.gbk_appointments TO anon;
GRANT SELECT ON public.gbk_appointments TO authenticated;
GRANT UPDATE(status,appointment_at,gbk_note) ON public.gbk_appointments TO authenticated;
-- No DELETE privilege for either browser role.
DROP POLICY IF EXISTS kawan_appointment_submit_anon ON public.gbk_appointments;
DROP POLICY IF EXISTS kawan_appointment_read_gbk ON public.gbk_appointments;
DROP POLICY IF EXISTS kawan_appointment_manage_gbk ON public.gbk_appointments;
CREATE POLICY kawan_appointment_submit_anon ON public.gbk_appointments
FOR INSERT TO anon WITH CHECK (
 student_acknowledged = true AND status = 'Baharu'
 AND appointment_at IS NULL AND gbk_note = '' AND reviewed_by IS NULL
);
CREATE POLICY kawan_appointment_read_gbk ON public.gbk_appointments
FOR SELECT TO authenticated USING (public.is_authorized_gbk());
CREATE POLICY kawan_appointment_manage_gbk ON public.gbk_appointments
FOR UPDATE TO authenticated USING (public.is_authorized_gbk())
WITH CHECK (public.is_authorized_gbk());
REVOKE ALL ON FUNCTION public.kawan_appointment_guard() FROM PUBLIC, anon, authenticated;
COMMIT;

-- NO anonymous SELECT/UPDATE/DELETE. Client "request sent" != time confirmed.
-- This is a private prototype, not production-ready without abuse safeguards.
