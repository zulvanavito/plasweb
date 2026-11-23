-- ============================================================================
-- 006_rls_grants_p4.sql — Role plas_api (NOBYPASSRLS), REVOKE Client, & RLS 16 Tabel
-- ============================================================================

-- 1. Role server khusus Next.js (tanpa BYPASSRLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'plas_api') THEN
        CREATE ROLE plas_api LOGIN PASSWORD 'CHANGE_ME_PLAS_API_DEV' NOINHERIT NOBYPASSRLS;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'plas_api' AND rolbypassrls) THEN
        RAISE EXCEPTION 'FAIL-SETUP: role plas_api tidak boleh memiliki BYPASSRLS';
    END IF;
END $$;

-- Helper RLS tanpa rekursi: ambil dosen_id pemanggil bila auth_user_id terdaftar sebagai dosen
CREATE OR REPLACE FUNCTION public.fn_current_dosen_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
    SELECT d.dosen_id
    FROM public.dosen d
    WHERE d.auth_user_id = public.fn_request_auth_uid()
    LIMIT 1;
$$;

-- 2. Aktifkan RLS pada seluruh 16 tabel aplikasi
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'material',
        'sub_material',
        'exercise',
        'exercise_question',
        'exercise_question_option',
        'exercise_attempt',
        'exercise_answer',
        'test',
        'test_question',
        'test_question_option',
        'test_attempt',
        'test_answer',
        'mahasiswa',
        'kelas',
        'dosen',
        'ai_usage'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 3. Cabut seluruh akses langsung dari anon dan authenticated (P4)
-- Guard IF EXISTS agar skrip berjalan bersih baik di Supabase maupun PostgreSQL 16 standar.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
        REVOKE ALL ON SCHEMA public FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
        REVOKE ALL ON SCHEMA public FROM authenticated;
    END IF;
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 4. GRANT minimum untuk plas_api:
--    Hanya SELECT pada 16 tabel; seluruh mutasi wajib lewat RPC final (T6).
GRANT USAGE ON SCHEMA public TO plas_api;
GRANT SELECT ON
    public.material,
    public.sub_material,
    public.exercise,
    public.exercise_question,
    public.exercise_question_option,
    public.test,
    public.test_question,
    public.test_question_option,
    public.mahasiswa,
    public.kelas,
    public.dosen,
    public.exercise_attempt,
    public.exercise_answer,
    public.test_attempt,
    public.test_answer,
    public.ai_usage
    TO plas_api;

GRANT EXECUTE ON FUNCTION
    public.fn_request_auth_uid(),
    public.fn_current_dosen_id(),
    public.fn_is_valid_uuid(TEXT),
    public.fn_normalize_fib(TEXT),
    public.fn_evaluate_fib(TEXT, TEXT),
    public.fn_validate_canonical_answer(VARCHAR, JSONB),
    public.fn_upsert_student_profile(VARCHAR, VARCHAR, UUID),
    public.fn_update_student_class(UUID),
    public.fn_create_exercise_attempt(UUID, UUID, TEXT),
    public.fn_submit_exercise_answer(UUID, UUID, JSONB, INTEGER, UUID, TEXT),
    public.fn_finalize_exercise_attempt(UUID, UUID),
    public.fn_create_test_attempt(UUID, UUID, TEXT),
    public.fn_start_test_question(UUID, SMALLINT),
    public.fn_submit_test_answer(UUID, SMALLINT, JSONB, UUID, TEXT),
    public.fn_finalize_test_attempt(UUID, UUID),
    public.fn_get_or_resume_test_attempt(UUID),
    public.fn_reserve_ai_usage(UUID, TEXT, INTEGER),
    public.fn_finalize_ai_usage(UUID, VARCHAR),
    public.fn_reconcile_stale_ai_usage(INTEGER)
    TO plas_api;

-- 5. Kebijakan RLS lengkap untuk seluruh 16 tabel (konteks JWT plas_api)
-- A. Tabel konten & daftar kelas/dosen (Read-Only untuk pengguna ber-JWT valid)
DROP POLICY IF EXISTS plas_api_select_material ON public.material;
CREATE POLICY plas_api_select_material ON public.material
    FOR SELECT TO plas_api USING (public.fn_request_auth_uid() IS NOT NULL);

DROP POLICY IF EXISTS plas_api_select_sub_material ON public.sub_material;
CREATE POLICY plas_api_select_sub_material ON public.sub_material
    FOR SELECT TO plas_api USING (public.fn_request_auth_uid() IS NOT NULL);

DROP POLICY IF EXISTS plas_api_select_exercise ON public.exercise;
CREATE POLICY plas_api_select_exercise ON public.exercise
    FOR SELECT TO plas_api USING (public.fn_request_auth_uid() IS NOT NULL);

DROP POLICY IF EXISTS plas_api_select_exercise_question ON public.exercise_question;
CREATE POLICY plas_api_select_exercise_question ON public.exercise_question
    FOR SELECT TO plas_api USING (public.fn_request_auth_uid() IS NOT NULL);

DROP POLICY IF EXISTS plas_api_select_exercise_question_option ON public.exercise_question_option;
CREATE POLICY plas_api_select_exercise_question_option ON public.exercise_question_option
    FOR SELECT TO plas_api USING (public.fn_request_auth_uid() IS NOT NULL);

DROP POLICY IF EXISTS plas_api_select_test ON public.test;
CREATE POLICY plas_api_select_test ON public.test
    FOR SELECT TO plas_api USING (public.fn_request_auth_uid() IS NOT NULL);

DROP POLICY IF EXISTS plas_api_select_test_question ON public.test_question;
CREATE POLICY plas_api_select_test_question ON public.test_question
    FOR SELECT TO plas_api USING (public.fn_request_auth_uid() IS NOT NULL);

DROP POLICY IF EXISTS plas_api_select_test_question_option ON public.test_question_option;
CREATE POLICY plas_api_select_test_question_option ON public.test_question_option
    FOR SELECT TO plas_api USING (public.fn_request_auth_uid() IS NOT NULL);

-- Kelas dapat dibaca mahasiswa untuk GET /classes dan dosen hanya untuk kelas yang diampunya
DROP POLICY IF EXISTS plas_api_select_kelas ON public.kelas;
CREATE POLICY plas_api_select_kelas ON public.kelas
    FOR SELECT TO plas_api USING (
        public.fn_request_auth_uid() IS NOT NULL
        AND (
            public.fn_current_dosen_id() IS NULL
            OR dosen_id = public.fn_current_dosen_id()
        )
    );

-- Dosen dapat dilihat sendiri oleh dosen atau nama dosen pengampu oleh mahasiswa pada GET /classes
DROP POLICY IF EXISTS plas_api_select_dosen ON public.dosen;
CREATE POLICY plas_api_select_dosen ON public.dosen
    FOR SELECT TO plas_api USING (
        public.fn_request_auth_uid() IS NOT NULL
        AND (
            auth_user_id = public.fn_request_auth_uid()
            OR public.fn_current_dosen_id() IS NULL
        )
    );

-- B. Mahasiswa: hanya diri sendiri ATAU dosen pengampu kelasnya (kelas_id IS NOT NULL)
DROP POLICY IF EXISTS plas_api_select_mahasiswa ON public.mahasiswa;
CREATE POLICY plas_api_select_mahasiswa ON public.mahasiswa
    FOR SELECT TO plas_api USING (
        auth_user_id = public.fn_request_auth_uid()
        OR (
            kelas_id IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.kelas k
                WHERE k.kelas_id = mahasiswa.kelas_id
                  AND k.dosen_id = public.fn_current_dosen_id()
            )
        )
    );

-- C. Attempt & Answer Exercise: hanya pemilik mahasiswa ATAU dosen pengampu kelasnya
DROP POLICY IF EXISTS plas_api_select_exercise_attempt ON public.exercise_attempt;
CREATE POLICY plas_api_select_exercise_attempt ON public.exercise_attempt
    FOR SELECT TO plas_api USING (
        EXISTS (
            SELECT 1
            FROM public.mahasiswa m
            LEFT JOIN public.kelas k ON k.kelas_id = m.kelas_id
            WHERE m.mahasiswa_id = exercise_attempt.mahasiswa_id
              AND (
                  m.auth_user_id = public.fn_request_auth_uid()
                  OR (m.kelas_id IS NOT NULL AND k.dosen_id = public.fn_current_dosen_id())
              )
        )
    );

DROP POLICY IF EXISTS plas_api_select_exercise_answer ON public.exercise_answer;
CREATE POLICY plas_api_select_exercise_answer ON public.exercise_answer
    FOR SELECT TO plas_api USING (
        EXISTS (
            SELECT 1
            FROM public.exercise_attempt ea
            JOIN public.mahasiswa m ON m.mahasiswa_id = ea.mahasiswa_id
            LEFT JOIN public.kelas k ON k.kelas_id = m.kelas_id
            WHERE ea.exercise_attempt_id = exercise_answer.exercise_attempt_id
              AND (
                  m.auth_user_id = public.fn_request_auth_uid()
                  OR (m.kelas_id IS NOT NULL AND k.dosen_id = public.fn_current_dosen_id())
              )
        )
    );

-- D. Attempt & Answer Test: hanya pemilik mahasiswa ATAU dosen pengampu kelasnya
DROP POLICY IF EXISTS plas_api_select_test_attempt ON public.test_attempt;
CREATE POLICY plas_api_select_test_attempt ON public.test_attempt
    FOR SELECT TO plas_api USING (
        EXISTS (
            SELECT 1
            FROM public.mahasiswa m
            LEFT JOIN public.kelas k ON k.kelas_id = m.kelas_id
            WHERE m.mahasiswa_id = test_attempt.mahasiswa_id
              AND (
                  m.auth_user_id = public.fn_request_auth_uid()
                  OR (m.kelas_id IS NOT NULL AND k.dosen_id = public.fn_current_dosen_id())
              )
        )
    );

DROP POLICY IF EXISTS plas_api_select_test_answer ON public.test_answer;
CREATE POLICY plas_api_select_test_answer ON public.test_answer
    FOR SELECT TO plas_api USING (
        EXISTS (
            SELECT 1
            FROM public.test_attempt ta
            JOIN public.mahasiswa m ON m.mahasiswa_id = ta.mahasiswa_id
            LEFT JOIN public.kelas k ON k.kelas_id = m.kelas_id
            WHERE ta.test_attempt_id = test_answer.test_attempt_id
              AND (
                  m.auth_user_id = public.fn_request_auth_uid()
                  OR (m.kelas_id IS NOT NULL AND k.dosen_id = public.fn_current_dosen_id())
              )
        )
    );

-- E. AI Usage: strictly hanya milik mahasiswa sendiri (dosen tidak mengakses AI mahasiswa)
DROP POLICY IF EXISTS plas_api_select_ai_usage ON public.ai_usage;
CREATE POLICY plas_api_select_ai_usage ON public.ai_usage
    FOR SELECT TO plas_api USING (
        EXISTS (
            SELECT 1 FROM public.mahasiswa m
            WHERE m.mahasiswa_id = ai_usage.mahasiswa_id
              AND m.auth_user_id = public.fn_request_auth_uid()
        )
    );
