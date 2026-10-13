-- Kawan CBT 5.1 / GBK Dashboard Pro: optional, separate transcript consent.
-- Run in Supabase SQL Editor as project owner BEFORE uploading the new webpage.
-- Existing rows remain summary-only. No case data is migrated or copied.
-- This does NOT implement spam protection or confirm legal/parental consent.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.student_submissions') IS NULL THEN
    RAISE EXCEPTION 'student_submissions missing. Run the earlier student inbox setup before this migration.';
  END IF;
  IF to_regprocedure('public.is_authorized_gbk()') IS NULL THEN
    RAISE EXCEPTION 'is_authorized_gbk() missing. Run the original GBK setup before this migration.';
  END IF;
END $$;

ALTER TABLE public.student_submissions
  ADD COLUMN IF NOT EXISTS transcript_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transcript_data jsonb,
  ADD COLUMN IF NOT EXISTS transcript_shared_at timestamptz;

-- The GBK may edit case status and notes, but must not silently change or
-- fabricate the student's original transcript or consent marker.
CREATE OR REPLACE FUNCTION public.kawan_guard_transcript()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.transcript_consent IS DISTINCT FROM OLD.transcript_consent
      OR NEW.transcript_data IS DISTINCT FROM OLD.transcript_data
      OR NEW.transcript_shared_at IS DISTINCT FROM OLD.transcript_shared_at THEN
      RAISE EXCEPTION 'Student transcript and sharing indicator cannot be edited';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.transcript_consent = true THEN
      NEW.transcript_shared_at := pg_catalog.now(); -- server receipt timestamp
    ELSE
      NEW.transcript_data := NULL;
      NEW.transcript_shared_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kawan_guard_transcript_trigger ON public.student_submissions;
CREATE TRIGGER kawan_guard_transcript_trigger
BEFORE INSERT OR UPDATE ON public.student_submissions
FOR EACH ROW EXECUTE FUNCTION public.kawan_guard_transcript();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.student_submissions'::regclass
      AND conname = 'kawan_transcript_consent_valid'
  ) THEN
    ALTER TABLE public.student_submissions
    ADD CONSTRAINT kawan_transcript_consent_valid
    CHECK (
      (transcript_consent = false AND transcript_data IS NULL AND transcript_shared_at IS NULL)
      OR
      (
        transcript_consent = true
        AND transcript_data IS NOT NULL
        AND pg_catalog.jsonb_typeof(transcript_data) = 'array'
        AND pg_catalog.jsonb_array_length(transcript_data) BETWEEN 1 AND 160
        AND pg_catalog.octet_length(transcript_data::text) <= 90000
        AND transcript_shared_at IS NOT NULL
      )
    );
  END IF;
END $$;

ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;
-- Keep existing RLS policies unchanged; do not enable anonymous SELECT.
-- Anonymous client may only INSERT explicitly approved input columns.
GRANT INSERT (transcript_consent, transcript_data) ON public.student_submissions TO anon;
-- Reduce broad write access: authorised GBK can update FOLLOW-UP fields only;
-- original student answers cannot be silently rewritten by the Dashboard.
REVOKE UPDATE ON public.student_submissions FROM authenticated;
GRANT UPDATE (status, counselor_notes, follow_up_date, reviewed, reviewed_at, updated_at)
  ON public.student_submissions TO authenticated;
REVOKE ALL ON FUNCTION public.kawan_guard_transcript() FROM PUBLIC, anon, authenticated;

COMMIT;

-- NOTE: This accepts a checkbox statement from an anonymous browser; it cannot
-- verify that the person is really a pupil or that legally sufficient consent
-- was obtained. Real deployment requires school permission, appropriate
-- parental/guardian processes, retention policy, security review, and a server-
-- side anti-spam gate (e.g. Edge Function + Turnstile + rate limiting).
