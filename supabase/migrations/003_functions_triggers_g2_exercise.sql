-- ============================================================================
-- 003_functions_triggers_g2_exercise.sql — Helpers, Profil, & G2 Exercise
-- ============================================================================

-- Helper 1: Ambil auth.uid() dari request.jwt.claims yang di-SET LOCAL.
CREATE OR REPLACE FUNCTION public.fn_request_auth_uid()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_claims TEXT;
    v_sub TEXT;
BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '');
    IF v_claims IS NULL THEN
        RETURN NULL;
    END IF;

    v_sub := v_claims::jsonb ->> 'sub';
    IF v_sub IS NULL OR v_sub !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN NULL;
    END IF;

    RETURN v_sub::uuid;
EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
END $$;

-- Helper 2: Validasi format UUID string tanpa throw untrapped cast error.
CREATE OR REPLACE FUNCTION public.fn_is_valid_uuid(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT p_text IS NOT NULL
       AND p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

-- Helper 3: Normalisasi FIB selaras levenshtein.dart (trim + lowercase + collapse whitespace).
-- Tidak menghapus tanda baca/operator agar kunci seperti '-' pada Exercise 4.3 tetap valid.
CREATE OR REPLACE FUNCTION public.fn_normalize_fib(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT regexp_replace(lower(btrim(COALESCE(p_text, ''))), '\s+', ' ', 'g');
$$;

-- Helper 4: Evaluasi FIB Levenshtein Similarity >= 0.70 dengan batas 255 karakter.
CREATE OR REPLACE FUNCTION public.fn_evaluate_fib(p_student TEXT, p_expected TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_student TEXT;
    v_expected TEXT;
    v_max_len INTEGER;
    v_dist INTEGER;
    v_similarity NUMERIC;
BEGIN
    IF p_student IS NULL OR char_length(p_student) > 255 THEN
        RAISE EXCEPTION USING
            MESSAGE = 'jawaban FIB tidak boleh melebihi 255 karakter (AN001)',
            ERRCODE = 'AN001';
    END IF;

    v_student := public.fn_normalize_fib(p_student);
    v_expected := public.fn_normalize_fib(p_expected);

    IF v_student = '' AND v_expected = '' THEN
        RETURN TRUE;
    END IF;
    IF v_student = '' OR v_expected = '' THEN
        RETURN FALSE;
    END IF;

    v_max_len := GREATEST(char_length(v_student), char_length(v_expected));
    v_dist := levenshtein(v_student, v_expected);
    v_similarity := 1::numeric - (v_dist::numeric / v_max_len::numeric);
    RETURN v_similarity >= 0.70::numeric;
END $$;

-- Helper 5: Validasi ketat bentuk kanonis JSONB tanpa key tambahan (P6).
CREATE OR REPLACE FUNCTION public.fn_validate_canonical_answer(p_type VARCHAR(3), p_answer JSONB)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_key_count INTEGER;
    v_raw TEXT;
BEGIN
    IF p_answer IS NULL OR jsonb_typeof(p_answer) <> 'object' THEN
        RAISE EXCEPTION USING
            MESSAGE = 'jawaban harus berupa JSON object kanonis (AN001)',
            ERRCODE = 'AN001';
    END IF;

    SELECT count(*)::integer INTO v_key_count FROM jsonb_object_keys(p_answer);
    IF v_key_count <> 1 THEN
        RAISE EXCEPTION USING
            MESSAGE = 'jawaban tidak boleh memiliki key tambahan di luar skema kanonis (AN001)',
            ERRCODE = 'AN001';
    END IF;

    IF p_type = 'MC' THEN
        IF NOT (p_answer ? 'option_id') OR jsonb_typeof(p_answer->'option_id') <> 'string' THEN
            RAISE EXCEPTION USING
                MESSAGE = 'jawaban MC wajib berbentuk {"option_id":"<uuid>"} (AN001)',
                ERRCODE = 'AN001';
        END IF;
        v_raw := p_answer->>'option_id';
        IF NOT public.fn_is_valid_uuid(v_raw) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'option_id MC harus berupa UUID valid (AN001)',
                ERRCODE = 'AN001';
        END IF;
    ELSIF p_type = 'TF' THEN
        IF NOT (p_answer ? 'value') OR jsonb_typeof(p_answer->'value') <> 'boolean' THEN
            RAISE EXCEPTION USING
                MESSAGE = 'jawaban TF wajib berbentuk {"value":<boolean>} (AN001)',
                ERRCODE = 'AN001';
        END IF;
    ELSIF p_type = 'FIB' THEN
        IF NOT (p_answer ? 'value') OR jsonb_typeof(p_answer->'value') <> 'string' THEN
            RAISE EXCEPTION USING
                MESSAGE = 'jawaban FIB wajib berbentuk {"value":"<teks>"} (AN001)',
                ERRCODE = 'AN001';
        END IF;
        v_raw := p_answer->>'value';
        IF char_length(v_raw) > 255 THEN
            RAISE EXCEPTION USING
                MESSAGE = 'jawaban FIB melebihi batas maksimal 255 karakter (AN001)',
                ERRCODE = 'AN001';
        END IF;
    ELSE
        RAISE EXCEPTION USING
            MESSAGE = 'tipe soal tidak dikenali (DBR03)',
            ERRCODE = 'DBR03';
    END IF;
END $$;

-- ============================================================================
-- Profil & Kelas (RPC Terkontrol untuk role plas_api)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_upsert_student_profile(
    p_nama VARCHAR(255),
    p_nim VARCHAR(30),
    p_kelas_id UUID DEFAULT NULL
)
RETURNS public.mahasiswa
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_existing public.mahasiswa;
    v_created public.mahasiswa;
    v_nama TEXT;
    v_nim TEXT;
BEGIN
    v_uid := public.fn_request_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'identitas pengguna tidak terverifikasi (AU001)', ERRCODE = 'AU001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('plas:profile:' || v_uid::text, 0));

    IF EXISTS (SELECT 1 FROM public.dosen d WHERE d.auth_user_id = v_uid) THEN
        RAISE EXCEPTION USING MESSAGE = 'akun sudah terdaftar sebagai dosen (DBR13)', ERRCODE = 'DBR13';
    END IF;

    SELECT * INTO v_existing FROM public.mahasiswa m WHERE m.auth_user_id = v_uid;
    IF FOUND THEN
        RETURN v_existing;
    END IF;

    v_nama := btrim(COALESCE(p_nama, ''));
    v_nim := btrim(COALESCE(p_nim, ''));
    IF v_nama = '' OR v_nim = '' OR char_length(v_nama) > 255 OR char_length(v_nim) > 30 THEN
        RAISE EXCEPTION USING MESSAGE = 'nama dan nim wajib diisi sesuai panjang kolom (AN001)', ERRCODE = 'AN001';
    END IF;

    IF p_kelas_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.kelas k WHERE k.kelas_id = p_kelas_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'kelas tidak ditemukan', ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.mahasiswa (auth_user_id, nim, nama, kelas_id)
    VALUES (v_uid, v_nim, v_nama, p_kelas_id)
    RETURNING * INTO v_created;

    RETURN v_created;
END $$;

CREATE OR REPLACE FUNCTION public.fn_update_student_class(p_kelas_id UUID DEFAULT NULL)
RETURNS public.mahasiswa
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_student public.mahasiswa;
    v_updated public.mahasiswa;
BEGIN
    v_uid := public.fn_request_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'identitas pengguna tidak terverifikasi (AU001)', ERRCODE = 'AU001';
    END IF;

    SELECT * INTO v_student
    FROM public.mahasiswa m
    WHERE m.auth_user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'profil mahasiswa belum ditemukan', ERRCODE = 'P0002';
    END IF;

    IF p_kelas_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.kelas k WHERE k.kelas_id = p_kelas_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'kelas tidak ditemukan', ERRCODE = 'P0002';
    END IF;

    UPDATE public.mahasiswa
    SET kelas_id = p_kelas_id
    WHERE mahasiswa_id = v_student.mahasiswa_id
    RETURNING * INTO v_updated;

    RETURN v_updated;
END $$;

-- ============================================================================
-- Trigger G2 (TR-01, TR-03, TR-04, TR-07 sisi Exercise)
-- ============================================================================

-- TR-01: Validasi opsi MC & bentuk kanonis pada exercise_answer BEFORE INSERT
CREATE OR REPLACE FUNCTION public.fn_g2_exercise_answer_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_status VARCHAR(16);
    v_opt_uuid UUID;
BEGIN
    SELECT ea.status INTO v_status
    FROM public.exercise_attempt ea
    WHERE ea.exercise_attempt_id = NEW.exercise_attempt_id;

    IF v_status IS DISTINCT FROM 'IN_PROGRESS' THEN
        RAISE EXCEPTION USING
            MESSAGE = 'jawaban tidak dapat ditambahkan setelah attempt SUBMITTED (DBR10)',
            ERRCODE = 'DBR10';
    END IF;

    PERFORM public.fn_validate_canonical_answer(NEW.question_type_snapshot, NEW.student_answer);
    PERFORM public.fn_validate_canonical_answer(NEW.question_type_snapshot, NEW.correct_answer_snapshot);

    IF NEW.question_type_snapshot = 'MC' THEN
        v_opt_uuid := (NEW.student_answer->>'option_id')::uuid;
        IF NOT EXISTS (
            SELECT 1 FROM public.exercise_question_option o
            WHERE o.exercise_question_id = NEW.exercise_question_id
              AND o.exercise_question_option_id = v_opt_uuid
        ) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'opsi jawaban bukan milik soal exercise terkait (OP001)',
                ERRCODE = 'OP001';
        END IF;
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_exercise_answer_validate ON public.exercise_answer;
CREATE TRIGGER trg_exercise_answer_validate
    BEFORE INSERT ON public.exercise_answer
    FOR EACH ROW EXECUTE FUNCTION public.fn_g2_exercise_answer_before_insert();

-- TR-03 & TR-07: exercise_answer dan snapshot-nya bersifat immutable setelah dibuat
CREATE OR REPLACE FUNCTION public.fn_g2_exercise_answer_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION USING
        MESSAGE = 'jawaban dan snapshot latihan bersifat immutable (DBR10)',
        ERRCODE = 'DBR10';
END $$;

DROP TRIGGER IF EXISTS trg_exercise_answer_immutable ON public.exercise_answer;
CREATE TRIGGER trg_exercise_answer_immutable
    BEFORE UPDATE OR DELETE ON public.exercise_answer
    FOR EACH ROW EXECUTE FUNCTION public.fn_g2_exercise_answer_immutable();

-- TR-04 (sisi Exercise): jaga transisi status IN_PROGRESS -> SUBMITTED dan immutability pasca SUBMITTED
CREATE OR REPLACE FUNCTION public.fn_g2_exercise_attempt_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION USING MESSAGE = 'exercise_attempt tidak boleh dihapus (DBR10)', ERRCODE = 'DBR10';
    END IF;

    IF OLD.status = 'SUBMITTED' THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt latihan sudah SUBMITTED dan immutable (DBR10)', ERRCODE = 'DBR10';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (OLD.status = 'IN_PROGRESS' AND NEW.status = 'SUBMITTED') THEN
            RAISE EXCEPTION USING MESSAGE = 'transisi status exercise_attempt tidak valid (ST004)', ERRCODE = 'ST004';
        END IF;
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_exercise_attempt_state ON public.exercise_attempt;
CREATE TRIGGER trg_exercise_attempt_state
    BEFORE UPDATE OR DELETE ON public.exercise_attempt
    FOR EACH ROW EXECUTE FUNCTION public.fn_g2_exercise_attempt_state();

-- ============================================================================
-- RPC G2: FN-01, FN-02, FN-03
-- ============================================================================

-- FN-01 create_exercise_attempt
CREATE OR REPLACE FUNCTION public.fn_create_exercise_attempt(
    p_exercise_id UUID,
    p_creation_request_id UUID,
    p_payload_hash TEXT
)
RETURNS TABLE (
    attempt_id UUID,
    exercise_id UUID,
    attempt_number SMALLINT,
    status VARCHAR(16),
    score NUMERIC(5,2),
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    is_replay BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_existing public.exercise_attempt;
    v_attempt_count INTEGER;
    v_created public.exercise_attempt;
BEGIN
    v_uid := public.fn_request_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'identitas pengguna tidak terverifikasi (AU001)', ERRCODE = 'AU001';
    END IF;

    SELECT m.mahasiswa_id INTO v_mahasiswa_id
    FROM public.mahasiswa m
    WHERE m.auth_user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'profil mahasiswa tidak ditemukan (AU001)', ERRCODE = 'AU001';
    END IF;

    -- Replay check sebelum validasi batas attempt
    SELECT * INTO v_existing
    FROM public.exercise_attempt ea
    WHERE ea.creation_request_id = p_creation_request_id;

    IF FOUND THEN
        IF v_existing.mahasiswa_id <> v_mahasiswa_id THEN
            RAISE EXCEPTION USING MESSAGE = 'creation_request_id bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
        END IF;
        IF v_existing.payload_hash <> p_payload_hash THEN
            RAISE EXCEPTION USING MESSAGE = 'idempotency conflict pada create_exercise_attempt (ID001)', ERRCODE = 'ID001';
        END IF;
        RETURN QUERY SELECT
            v_existing.exercise_attempt_id,
            v_existing.exercise_id,
            v_existing.attempt_no,
            v_existing.status,
            v_existing.score,
            v_existing.started_at,
            v_existing.submitted_at,
            TRUE;
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.exercise e WHERE e.exercise_id = p_exercise_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'exercise tidak ditemukan', ERRCODE = 'P0002';
    END IF;

    SELECT count(*)::integer INTO v_attempt_count
    FROM public.exercise_attempt ea
    WHERE ea.mahasiswa_id = v_mahasiswa_id
      AND ea.exercise_id = p_exercise_id;

    IF v_attempt_count >= 3 THEN
        RAISE EXCEPTION USING MESSAGE = 'batas maksimal 3 percobaan exercise telah tercapai (DBR05)', ERRCODE = 'DBR05';
    END IF;

    INSERT INTO public.exercise_attempt (
        mahasiswa_id, exercise_id, attempt_no, creation_request_id, payload_hash, started_at, status
    ) VALUES (
        v_mahasiswa_id, p_exercise_id, (v_attempt_count + 1)::smallint, p_creation_request_id, p_payload_hash, statement_timestamp(), 'IN_PROGRESS'
    )
    RETURNING * INTO v_created;

    RETURN QUERY SELECT
        v_created.exercise_attempt_id,
        v_created.exercise_id,
        v_created.attempt_no,
        v_created.status,
        v_created.score,
        v_created.started_at,
        v_created.submitted_at,
        FALSE;
END $$;

-- FN-02 submit_exercise_answer
CREATE OR REPLACE FUNCTION public.fn_submit_exercise_answer(
    p_attempt_id UUID,
    p_question_id UUID,
    p_answer JSONB,
    p_time_spent_seconds INTEGER,
    p_submission_request_id UUID,
    p_payload_hash TEXT
)
RETURNS TABLE (
    attempt_id UUID,
    question_id UUID,
    is_correct BOOLEAN,
    explanation TEXT,
    hint TEXT,
    answered_at TIMESTAMPTZ,
    is_replay BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_replay_ans public.exercise_answer;
    v_replay_att public.exercise_attempt;
    v_replay_q public.exercise_question;
    v_attempt public.exercise_attempt;
    v_q public.exercise_question;
    v_options_snapshot JSONB;
    v_correct_snapshot JSONB;
    v_is_correct BOOLEAN;
    v_now TIMESTAMPTZ;
    v_opt_uuid UUID;
BEGIN
    v_uid := public.fn_request_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'identitas pengguna tidak terverifikasi (AU001)', ERRCODE = 'AU001';
    END IF;

    SELECT m.mahasiswa_id INTO v_mahasiswa_id
    FROM public.mahasiswa m
    WHERE m.auth_user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'profil mahasiswa tidak ditemukan (AU001)', ERRCODE = 'AU001';
    END IF;

    -- 1. Replay check SEBELUM validasi status/urutan
    SELECT * INTO v_replay_ans
    FROM public.exercise_answer ans
    WHERE ans.submission_request_id = p_submission_request_id;

    IF FOUND THEN
        SELECT * INTO v_replay_att
        FROM public.exercise_attempt ea
        WHERE ea.exercise_attempt_id = v_replay_ans.exercise_attempt_id;

        IF v_replay_att.mahasiswa_id <> v_mahasiswa_id THEN
            RAISE EXCEPTION USING MESSAGE = 'submission_request_id bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
        END IF;
        IF v_replay_ans.payload_hash <> p_payload_hash THEN
            RAISE EXCEPTION USING MESSAGE = 'idempotency conflict pada submit_exercise_answer (ID001)', ERRCODE = 'ID001';
        END IF;

        SELECT * INTO v_replay_q
        FROM public.exercise_question q
        WHERE q.exercise_question_id = v_replay_ans.exercise_question_id;

        RETURN QUERY SELECT
            v_replay_ans.exercise_attempt_id,
            v_replay_ans.exercise_question_id,
            v_replay_ans.is_correct,
            v_replay_q.explanation,
            v_replay_q.hint,
            v_replay_ans.answered_at,
            TRUE;
        RETURN;
    END IF;

    IF p_time_spent_seconds IS NULL OR p_time_spent_seconds < 0 THEN
        RAISE EXCEPTION USING MESSAGE = 'time_spent_seconds tidak valid (AN001)', ERRCODE = 'AN001';
    END IF;

    -- 2. Lock attempt & validasi pemilik + status
    SELECT * INTO v_attempt
    FROM public.exercise_attempt ea
    WHERE ea.exercise_attempt_id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'exercise_attempt tidak ditemukan', ERRCODE = 'P0002';
    END IF;
    IF v_attempt.mahasiswa_id <> v_mahasiswa_id THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
    END IF;
    IF v_attempt.status <> 'IN_PROGRESS' THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt sudah SUBMITTED (ST001)', ERRCODE = 'ST001';
    END IF;

    -- 3. Validasi soal milik exercise
    SELECT * INTO v_q
    FROM public.exercise_question q
    WHERE q.exercise_question_id = p_question_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'pertanyaan tidak ditemukan', ERRCODE = 'P0002';
    END IF;
    IF v_q.exercise_id <> v_attempt.exercise_id THEN
        RAISE EXCEPTION USING MESSAGE = 'pertanyaan bukan milik exercise attempt terkait (AU001)', ERRCODE = 'AU001';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.exercise_answer ans
        WHERE ans.exercise_attempt_id = p_attempt_id
          AND ans.exercise_question_id = p_question_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'soal sudah dijawab pada attempt ini (DBR06)', ERRCODE = 'DBR06';
    END IF;

    -- 4. Validasi bentuk kanonis & evaluasi
    PERFORM public.fn_validate_canonical_answer(v_q.question_type, p_answer);

    IF v_q.question_type = 'MC' THEN
        v_opt_uuid := (p_answer->>'option_id')::uuid;
        IF NOT EXISTS (
            SELECT 1 FROM public.exercise_question_option o
            WHERE o.exercise_question_id = v_q.exercise_question_id
              AND o.exercise_question_option_id = v_opt_uuid
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'opsi tidak ditemukan pada pertanyaan ini (OP001)', ERRCODE = 'OP001';
        END IF;

        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'option_id', o.exercise_question_option_id::text,
                    'text', o.option_text,
                    'sequence', o.sequence
                ) ORDER BY o.sequence
            ),
            '[]'::jsonb
        ) INTO v_options_snapshot
        FROM public.exercise_question_option o
        WHERE o.exercise_question_id = v_q.exercise_question_id;

        v_correct_snapshot := jsonb_build_object('option_id', v_q.correct_option_id::text);
        v_is_correct := (v_opt_uuid = v_q.correct_option_id);
    ELSIF v_q.question_type = 'TF' THEN
        v_options_snapshot := NULL;
        v_correct_snapshot := jsonb_build_object('value', v_q.correct_boolean);
        v_is_correct := ((p_answer->'value')::boolean = v_q.correct_boolean);
    ELSE
        v_options_snapshot := NULL;
        v_correct_snapshot := jsonb_build_object('value', v_q.correct_text);
        v_is_correct := public.fn_evaluate_fib(p_answer->>'value', v_q.correct_text);
    END IF;

    v_now := statement_timestamp();

    INSERT INTO public.exercise_answer (
        exercise_attempt_id,
        exercise_question_id,
        question_sequence,
        submission_request_id,
        payload_hash,
        question_snapshot,
        question_type_snapshot,
        options_snapshot,
        correct_answer_snapshot,
        student_answer,
        is_correct,
        time_spent_seconds,
        answered_at
    ) VALUES (
        p_attempt_id,
        p_question_id,
        v_q.sequence,
        p_submission_request_id,
        p_payload_hash,
        v_q.question_text,
        v_q.question_type,
        v_options_snapshot,
        v_correct_snapshot,
        p_answer,
        v_is_correct,
        p_time_spent_seconds,
        v_now
    );

    RETURN QUERY SELECT
        p_attempt_id,
        p_question_id,
        v_is_correct,
        v_q.explanation,
        v_q.hint,
        v_now,
        FALSE;
END $$;

-- FN-03 finalize_exercise_attempt
CREATE OR REPLACE FUNCTION public.fn_finalize_exercise_attempt(
    p_attempt_id UUID,
    p_request_id UUID DEFAULT NULL
)
RETURNS TABLE (
    attempt_id UUID,
    exercise_id UUID,
    attempt_number SMALLINT,
    status VARCHAR(16),
    score NUMERIC(5,2),
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    is_replay BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_attempt public.exercise_attempt;
    v_total_q INTEGER;
    v_answered_q INTEGER;
    v_correct_q INTEGER;
    v_score NUMERIC(5,2);
    v_updated public.exercise_attempt;
BEGIN
    v_uid := public.fn_request_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'identitas pengguna tidak terverifikasi (AU001)', ERRCODE = 'AU001';
    END IF;

    SELECT m.mahasiswa_id INTO v_mahasiswa_id
    FROM public.mahasiswa m
    WHERE m.auth_user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'profil mahasiswa tidak ditemukan (AU001)', ERRCODE = 'AU001';
    END IF;

    SELECT * INTO v_attempt
    FROM public.exercise_attempt ea
    WHERE ea.exercise_attempt_id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'exercise_attempt tidak ditemukan', ERRCODE = 'P0002';
    END IF;
    IF v_attempt.mahasiswa_id <> v_mahasiswa_id THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
    END IF;

    IF v_attempt.status = 'SUBMITTED' THEN
        IF p_request_id IS NOT NULL AND v_attempt.finalization_request_id = p_request_id THEN
            RETURN QUERY SELECT
                v_attempt.exercise_attempt_id,
                v_attempt.exercise_id,
                v_attempt.attempt_no,
                v_attempt.status,
                v_attempt.score,
                v_attempt.started_at,
                v_attempt.submitted_at,
                TRUE;
            RETURN;
        END IF;
        RAISE EXCEPTION USING MESSAGE = 'attempt latihan sudah dikumpulkan sebelumnya (ST001)', ERRCODE = 'ST001';
    END IF;

    SELECT count(*)::integer INTO v_total_q
    FROM public.exercise_question q
    WHERE q.exercise_id = v_attempt.exercise_id;

    SELECT count(*)::integer, count(*) FILTER (WHERE ans.is_correct)::integer
    INTO v_answered_q, v_correct_q
    FROM public.exercise_answer ans
    WHERE ans.exercise_attempt_id = p_attempt_id;

    IF v_total_q = 0 OR v_answered_q < v_total_q THEN
        RAISE EXCEPTION USING MESSAGE = 'masih ada soal latihan yang belum dijawab (ST002)', ERRCODE = 'ST002';
    END IF;

    v_score := ROUND((v_correct_q::numeric / v_total_q::numeric) * 100::numeric, 2);

    UPDATE public.exercise_attempt
    SET status = 'SUBMITTED',
        submitted_at = statement_timestamp(),
        score = v_score,
        finalization_request_id = p_request_id
    WHERE exercise_attempt_id = p_attempt_id
    RETURNING * INTO v_updated;

    RETURN QUERY SELECT
        v_updated.exercise_attempt_id,
        v_updated.exercise_id,
        v_updated.attempt_no,
        v_updated.status,
        v_updated.score,
        v_updated.started_at,
        v_updated.submitted_at,
        FALSE;
END $$;
