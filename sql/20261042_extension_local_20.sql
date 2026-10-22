-- Extensión Local (20 %) · UN SOLO SQL: notas por unidad (30/40/30), compuerta de dominio con el Checkpoint de Cosmovisión Bíblica,
-- boletines de Dual Diploma y carpeta "03 Extensión Local" en Storage.
-- Rúbrica oficial: Conocimiento 30 % + Ejecución 40 % + Conexión local y fe 30 %. Los puntos se calculan AQUÍ (el cliente solo envía niveles).
-- Aditiva e idempotente. No toca tablas existentes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Verificación del token firmado (el mismo que usa Life Skills). Interna: solo la API con service_role ─────────
CREATE OR REPLACE FUNCTION public.ext_local_verify_token(p_token text)
RETURNS TABLE(student_id uuid, school_year text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_parts text[]; v_student uuid; v_year text; v_level text; v_exp bigint; v_sig text; v_msg text;
  v_secret text := 'chanak_life_skills_secret_salt_2026_secure'; -- el mismo valor que award_life_skills_coins
BEGIN
  v_parts := string_to_array(COALESCE(p_token, ''), '.');
  BEGIN
    IF array_length(v_parts, 1) = 5 THEN
      v_student := v_parts[1]::uuid; v_year := v_parts[2]; v_level := v_parts[3]; v_exp := v_parts[4]::bigint; v_sig := v_parts[5];
      v_msg := v_student::text || ':' || v_year || ':' || v_level || ':' || v_exp::text;
    ELSIF array_length(v_parts, 1) = 4 THEN
      v_student := v_parts[1]::uuid; v_year := v_parts[2]; v_exp := v_parts[3]::bigint; v_sig := v_parts[4];
      v_msg := v_student::text || ':' || v_year || ':' || v_exp::text;
    ELSE RAISE EXCEPTION 'Token con formato inválido';
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Token con formato inválido';
  END;
  IF extract(epoch from now())::bigint > v_exp THEN RAISE EXCEPTION 'Token expirado'; END IF;
  IF lower(v_sig) <> lower(encode(hmac(v_msg::bytea, v_secret::bytea, 'sha256'), 'hex')) THEN RAISE EXCEPTION 'Firma inválida'; END IF;
  RETURN QUERY SELECT v_student, v_year;
END $$;
REVOKE ALL ON FUNCTION public.ext_local_verify_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ext_local_verify_token(text) TO service_role;

-- ─── 2. Notas por unidad (modalidad A · Homeschool guiado) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extension_local_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year text NOT NULL,
  quarter text NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  route text NOT NULL,                 -- es | us | pa
  track text NOT NULL,                 -- p. ej. fl_civics, world_language:spanish1, finance_tech, lengua, historia_geo, es:eso2
  unit_key text NOT NULL,              -- p. ej. us:fl_civics:Oct
  unit_title text,
  quiz_correct integer NOT NULL DEFAULT 0 CHECK (quiz_correct >= 0),
  quiz_total integer NOT NULL DEFAULT 5 CHECK (quiz_total > 0),
  execution_level integer CHECK (execution_level BETWEEN 1 AND 4),
  local_level integer CHECK (local_level BETWEEN 1 AND 4),
  knowledge_pts numeric(5,2) NOT NULL DEFAULT 0,   -- 0..30
  execution_pts numeric(5,2) NOT NULL DEFAULT 0,   -- 0..40
  local_pts numeric(5,2) NOT NULL DEFAULT 0,       -- 0..30
  weighted_grade numeric(5,2) NOT NULL DEFAULT 0,  -- 0..100
  grade_level text,                                -- grado del estudiante (1-12) cuando la app lo conoce
  checkpoint_required boolean NOT NULL DEFAULT false,   -- Secundaria/Bachillerato (7-12): Biblical Worldview Checkpoint
  checkpoint_scores integer[],                     -- 5 criterios, 0..4
  checkpoint_pct numeric(5,2),                     -- 0..100 (se calcula aquí)
  checkpoint_essay text,
  mastery boolean NOT NULL DEFAULT false,          -- nota >= 80 y, si hay checkpoint, checkpoint >= 80
  assessed_by text NOT NULL DEFAULT 'self' CHECK (assessed_by IN ('self', 'supervisor', 'staff')),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, school_year, unit_key)
);
CREATE INDEX IF NOT EXISTS idx_el_grades_student ON public.extension_local_grades(student_id, school_year, quarter);
ALTER TABLE public.extension_local_grades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.extension_local_grades FROM anon;
GRANT SELECT, UPDATE ON public.extension_local_grades TO authenticated;

DROP POLICY IF EXISTS el_grades_select ON public.extension_local_grades;
CREATE POLICY el_grades_select ON public.extension_local_grades FOR SELECT TO authenticated
  USING (
    COALESCE(public.get_current_user_role(), '') IN ('admin', 'super_admin', 'director')
    OR public.is_coordinator_for(student_id) OR public.is_parent_of(student_id) OR public.is_tutor_of(student_id)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = extension_local_grades.student_id
        AND (s.profile_id IN (SELECT id FROM public.current_profile_ids() AS id) OR s.user_id = auth.uid()))
  );
-- Solo el personal revisa/aprueba (cambia estado y niveles); el estudiante nunca puede aprobar su propia nota.
DROP POLICY IF EXISTS el_grades_staff_update ON public.extension_local_grades;
CREATE POLICY el_grades_staff_update ON public.extension_local_grades FOR UPDATE TO authenticated
  USING (COALESCE(public.get_current_user_role(), '') IN ('admin', 'super_admin', 'director') OR public.is_coordinator_for(student_id))
  WITH CHECK (COALESCE(public.get_current_user_role(), '') IN ('admin', 'super_admin', 'director') OR public.is_coordinator_for(student_id));

-- Envío de la nota desde la app (token firmado). Puntos calculados en el servidor; una nota aprobada no se sobrescribe.
CREATE OR REPLACE FUNCTION public.submit_extension_local_grade(
  p_token text, p_route text, p_track text, p_unit_key text, p_unit_title text, p_quarter text,
  p_quiz_correct integer, p_quiz_total integer, p_execution_level integer, p_local_level integer,
  p_assessed_by text DEFAULT 'self', p_notes text DEFAULT NULL,
  p_grade_level text DEFAULT NULL, p_checkpoint_required boolean DEFAULT false, p_checkpoint_scores integer[] DEFAULT NULL, p_checkpoint_essay text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student uuid; v_year text; v_k numeric; v_e numeric; v_l numeric; v_w numeric; v_status text; v_by text; v_cp numeric; v_m boolean; v_words int;
BEGIN
  BEGIN
    SELECT t.student_id, t.school_year INTO v_student, v_year FROM public.ext_local_verify_token(p_token) t;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
  IF p_route NOT IN ('es', 'us', 'pa') OR p_quarter NOT IN ('Q1', 'Q2', 'Q3', 'Q4') OR COALESCE(trim(p_unit_key), '') = ''
     OR COALESCE(p_quiz_total, 0) < 1 OR p_quiz_correct < 0 OR p_quiz_correct > p_quiz_total
     OR p_execution_level NOT BETWEEN 1 AND 4 OR p_local_level NOT BETWEEN 1 AND 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Datos no válidos');
  END IF;
  v_by := CASE WHEN p_assessed_by = 'supervisor' THEN 'supervisor' ELSE 'self' END;
  v_k := round(30.0 * p_quiz_correct / p_quiz_total, 2);
  v_e := round(40.0 * p_execution_level / 4, 2);
  v_l := round(30.0 * p_local_level / 4, 2);
  v_w := v_k + v_e + v_l;
  IF COALESCE(p_checkpoint_required, false) THEN
    IF p_checkpoint_scores IS NULL OR array_length(p_checkpoint_scores, 1) <> 5 OR EXISTS (SELECT 1 FROM unnest(p_checkpoint_scores) x WHERE x IS NULL OR x NOT BETWEEN 0 AND 4) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Faltan los 5 criterios del checkpoint (0-4).');
    END IF;
    v_words := COALESCE(array_length(regexp_split_to_array(trim(COALESCE(p_checkpoint_essay, '')), '\s+'), 1), 0);
    IF trim(COALESCE(p_checkpoint_essay, '')) = '' OR v_words < 120 THEN
      RETURN jsonb_build_object('success', false, 'error', 'El ensayo del checkpoint debe tener al menos 120 palabras.');
    END IF;
    v_cp := round((SELECT sum(x) FROM unnest(p_checkpoint_scores) x) * 100.0 / 20, 2);
  END IF;
  v_m := v_w >= 80 AND (NOT COALESCE(p_checkpoint_required, false) OR v_cp >= 80);

  IF EXISTS (SELECT 1 FROM public.extension_local_grades WHERE student_id = v_student AND school_year = v_year AND unit_key = p_unit_key AND status = 'approved') THEN
    RETURN jsonb_build_object('success', false, 'locked', true, 'error', 'Esta unidad ya fue aprobada por el personal.');
  END IF;

  INSERT INTO public.extension_local_grades(student_id, school_year, quarter, route, track, unit_key, unit_title, quiz_correct, quiz_total,
      execution_level, local_level, knowledge_pts, execution_pts, local_pts, weighted_grade, assessed_by, status, notes,
      grade_level, checkpoint_required, checkpoint_scores, checkpoint_pct, checkpoint_essay, mastery)
  VALUES (v_student, v_year, p_quarter, p_route, left(p_track, 60), left(p_unit_key, 120), left(p_unit_title, 200), p_quiz_correct, p_quiz_total,
      p_execution_level, p_local_level, v_k, v_e, v_l, v_w, v_by, 'pending_review', left(p_notes, 1000),
      left(p_grade_level, 10), COALESCE(p_checkpoint_required, false), p_checkpoint_scores, v_cp, left(p_checkpoint_essay, 6000), v_m)
  ON CONFLICT (student_id, school_year, unit_key) DO UPDATE SET
      quarter = EXCLUDED.quarter, route = EXCLUDED.route, track = EXCLUDED.track, unit_title = EXCLUDED.unit_title,
      quiz_correct = EXCLUDED.quiz_correct, quiz_total = EXCLUDED.quiz_total, execution_level = EXCLUDED.execution_level,
      local_level = EXCLUDED.local_level, knowledge_pts = EXCLUDED.knowledge_pts, execution_pts = EXCLUDED.execution_pts,
      local_pts = EXCLUDED.local_pts, weighted_grade = EXCLUDED.weighted_grade, assessed_by = EXCLUDED.assessed_by,
      grade_level = EXCLUDED.grade_level, checkpoint_required = EXCLUDED.checkpoint_required, checkpoint_scores = EXCLUDED.checkpoint_scores,
      checkpoint_pct = EXCLUDED.checkpoint_pct, checkpoint_essay = EXCLUDED.checkpoint_essay, mastery = EXCLUDED.mastery,
      status = 'pending_review', notes = EXCLUDED.notes, updated_at = now()
  RETURNING status INTO v_status;
  RETURN jsonb_build_object('success', true, 'knowledge', v_k, 'execution', v_e, 'local', v_l, 'weighted', v_w, 'checkpoint', v_cp, 'mastery', v_m, 'status', v_status);
END $$;
REVOKE ALL ON FUNCTION public.submit_extension_local_grade(text, text, text, text, text, text, integer, integer, integer, integer, text, text, text, boolean, integer[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_extension_local_grade(text, text, text, text, text, text, integer, integer, integer, integer, text, text, text, boolean, integer[], text) TO anon, authenticated;

-- Resumen para la app y la ficha: nota por unidad y promedio trimestral (provisional = todas; oficial = solo aprobadas).
CREATE OR REPLACE FUNCTION public.get_extension_local_summary(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_student uuid; v_year text; v_units jsonb; v_q jsonb; v_reports jsonb;
BEGIN
  BEGIN
    SELECT t.student_id, t.school_year INTO v_student, v_year FROM public.ext_local_verify_token(p_token) t;
  EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('unit_key', unit_key, 'unit_title', unit_title, 'quarter', quarter, 'route', route, 'track', track,
      'knowledge', knowledge_pts, 'execution', execution_pts, 'local', local_pts, 'weighted', weighted_grade, 'status', status,
      'quiz_correct', quiz_correct, 'quiz_total', quiz_total, 'mastery', mastery, 'checkpoint_pct', checkpoint_pct, 'execution_level', execution_level, 'local_level', local_level) ORDER BY quarter, unit_key), '[]'::jsonb)
    INTO v_units FROM public.extension_local_grades WHERE student_id = v_student AND school_year = v_year;
  SELECT COALESCE(jsonb_object_agg(quarter, jsonb_build_object('provisional', prov, 'official', off, 'units', n)), '{}'::jsonb) INTO v_q FROM (
    SELECT quarter, round(avg(weighted_grade), 2) AS prov, round(avg(weighted_grade) FILTER (WHERE status = 'approved'), 2) AS off, count(*) AS n
      FROM public.extension_local_grades WHERE student_id = v_student AND school_year = v_year GROUP BY quarter) q;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('quarter', quarter, 'school_name', school_name, 'school_grade', school_grade, 'file_name', file_name, 'status', status, 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_reports FROM public.extension_local_reports WHERE student_id = v_student AND school_year = v_year;
  RETURN jsonb_build_object('success', true, 'school_year', v_year, 'units', v_units, 'quarters', v_q, 'reports', v_reports);
END $$;
REVOKE ALL ON FUNCTION public.get_extension_local_summary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_extension_local_summary(text) TO anon, authenticated;

-- Vista para el promedio global 60/20/20: el 20 % de cada trimestre (oficial = solo aprobadas; provisional = todas).
CREATE OR REPLACE VIEW public.extension_local_quarter_grades WITH (security_invoker = true) AS
  SELECT student_id, school_year, quarter,
         round(avg(weighted_grade), 2) AS provisional_grade,
         round(avg(weighted_grade) FILTER (WHERE status = 'approved'), 2) AS official_grade,
         count(*) AS units, count(*) FILTER (WHERE status = 'approved') AS units_approved, count(*) FILTER (WHERE mastery) AS units_mastered
    FROM public.extension_local_grades GROUP BY student_id, school_year, quarter;
GRANT SELECT ON public.extension_local_quarter_grades TO authenticated;

-- ─── 3. Boletines de la modalidad B (Dual Diploma / matrícula local) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extension_local_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year text NOT NULL,
  quarter text NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  school_name text,
  school_grade numeric(5,2) CHECK (school_grade IS NULL OR school_grade BETWEEN 0 AND 100),  -- nota del colegio en escala 0-100, si la familia la indica
  file_path text NOT NULL,            -- <student_id>/03 Extensión Local/<año>/<Qn>-...
  file_name text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_el_reports_student ON public.extension_local_reports(student_id, school_year, quarter);
ALTER TABLE public.extension_local_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.extension_local_reports FROM anon;
GRANT SELECT, UPDATE ON public.extension_local_reports TO authenticated;
DROP POLICY IF EXISTS el_reports_select ON public.extension_local_reports;
CREATE POLICY el_reports_select ON public.extension_local_reports FOR SELECT TO authenticated
  USING (
    COALESCE(public.get_current_user_role(), '') IN ('admin', 'super_admin', 'director')
    OR public.is_coordinator_for(student_id) OR public.is_parent_of(student_id) OR public.is_tutor_of(student_id)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = extension_local_reports.student_id
        AND (s.profile_id IN (SELECT id FROM public.current_profile_ids() AS id) OR s.user_id = auth.uid()))
  );
DROP POLICY IF EXISTS el_reports_staff_update ON public.extension_local_reports;
CREATE POLICY el_reports_staff_update ON public.extension_local_reports FOR UPDATE TO authenticated
  USING (COALESCE(public.get_current_user_role(), '') IN ('admin', 'super_admin', 'director') OR public.is_coordinator_for(student_id))
  WITH CHECK (COALESCE(public.get_current_user_role(), '') IN ('admin', 'super_admin', 'director') OR public.is_coordinator_for(student_id));

-- La llama solo la API de la app (service_role) después de subir el archivo a Storage.
CREATE OR REPLACE FUNCTION public.register_extension_local_report(
  p_student_id uuid, p_school_year text, p_quarter text, p_school_name text, p_school_grade numeric, p_file_path text, p_file_name text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_quarter NOT IN ('Q1', 'Q2', 'Q3', 'Q4') OR left(COALESCE(p_file_path, ''), 37) <> p_student_id::text || '/' THEN
    RAISE EXCEPTION 'Datos no válidos';
  END IF;
  INSERT INTO public.extension_local_reports(student_id, school_year, quarter, school_name, school_grade, file_path, file_name)
  VALUES (p_student_id, p_school_year, p_quarter, left(p_school_name, 200), p_school_grade, p_file_path, left(p_file_name, 200)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.register_extension_local_report(uuid, text, text, text, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_extension_local_report(uuid, text, text, text, numeric, text, text) TO service_role;

-- ─── 4. Storage: carpeta SIS por estudiante → "<student_id>/03 Extensión Local/..." (privada) ──────────────────────
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('student-folders', 'student-folders', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;
    EXECUTE 'DROP POLICY IF EXISTS student_folders_read ON storage.objects';
    EXECUTE $p$CREATE POLICY student_folders_read ON storage.objects FOR SELECT TO authenticated USING (
      bucket_id = 'student-folders' AND (
        COALESCE(public.get_current_user_role(), '') IN ('admin', 'super_admin', 'director')
        OR public.is_coordinator_for(NULLIF((storage.foldername(name))[1], '')::uuid)
        OR public.is_parent_of(NULLIF((storage.foldername(name))[1], '')::uuid)
        OR public.is_tutor_of(NULLIF((storage.foldername(name))[1], '')::uuid)
        OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = NULLIF((storage.foldername(name))[1], '')::uuid
            AND (s.profile_id IN (SELECT id FROM public.current_profile_ids() AS id) OR s.user_id = auth.uid()))))$p$;
  END IF;
END $$;
