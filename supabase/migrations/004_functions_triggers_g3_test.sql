-- ============================================================================
-- 004_functions_triggers_g3_test.sql — G3: Siklus Tes Linear & DBR-15
-- ============================================================================

-- TR-02: Validasi opsi MC terhadap options_snapshot baris test_answer terkait
CREATE OR REPLACE FUNCTION public.fn_g3_test_answer_validate_option()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.answered_at IS NOT NULL AND NEW.question_type_snapshot = 'MC' THEN
        IF NEW.selected_option_id IS NULL OR NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(OLD.options_snapshot, '[]'::jsonb)) AS opt
            WHERE opt->>'option_id' = NEW.selected_option_id::text
        ) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'opsi jawaban tes tidak ditemukan dalam snapshot attempt (OP001)',
                ERRCODE = 'OP001';
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_test_answer_validate_option ON public.test_answer;
CREATE TRIGGER trg_test_answer_validate_option
    BEFORE UPDATE ON public.test_answer
    FOR EACH ROW EXECUTE FUNCTION public.fn_g3_test_answer_validate_option();

-- TR-06: Immutability snapshot & write-once progres jawaban tes
CREATE OR REPLACE FUNCTION public.fn_g3_test_answer_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_attempt_status VARCHAR(16);
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION USING MESSAGE = 'test_answer tidak boleh dihapus (DBR10)', ERRCODE = 'DBR10';
    END IF;

    IF NEW.test_attempt_id IS DISTINCT FROM OLD.test_attempt_id
       OR NEW.test_question_id IS DISTINCT FROM OLD.test_question_id
       OR NEW.question_sequence IS DISTINCT FROM OLD.question_sequence
       OR NEW.question_snapshot IS DISTINCT FROM OLD.question_snapshot
       OR NEW.question_type_snapshot IS DISTINCT FROM OLD.question_type_snapshot
       OR NEW.options_snapshot IS DISTINCT FROM OLD.options_snapshot
       OR NEW.correct_answer_snapshot IS DISTINCT FROM OLD.correct_answer_snapshot
       OR NEW.option_order_snapshot IS DISTINCT FROM OLD.option_order_snapshot THEN
        RAISE EXCEPTION USING MESSAGE = 'snapshot soal tes bersifat immutable (DBR10)', ERRCODE = 'DBR10';
    END IF;

    SELECT ta.status INTO v_attempt_status
    FROM public.test_attempt ta
    WHERE ta.test_attempt_id = OLD.test_attempt_id;

    IF v_attempt_status = 'SUBMITTED' THEN
        RAISE EXCEPTION USING MESSAGE = 'test_answer terkunci setelah attempt SUBMITTED (DBR10)', ERRCODE = 'DBR10';
    END IF;

    IF OLD.answered_at IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'jawaban tes yang sudah tercatat bersifat immutable (DBR10)', ERRCODE = 'DBR10';
    END IF;

    IF OLD.question_started_at IS NOT NULL AND NEW.question_started_at IS DISTINCT FROM OLD.question_started_at THEN
        RAISE EXCEPTION USING MESSAGE = 'question_started_at tidak dapat di-reset setelah terisi (DBR10)', ERRCODE = 'DBR10';
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_test_answer_immutable ON public.test_answer;
CREATE TRIGGER trg_test_answer_immutable
    BEFORE UPDATE OR DELETE ON public.test_answer
    FOR EACH ROW EXECUTE FUNCTION public.fn_g3_test_answer_immutable();

-- TR-04 (sisi Tes): State machine IN_PROGRESS -> SUBMITTED & immutability pasca SUBMITTED
CREATE OR REPLACE FUNCTION public.fn_g3_test_attempt_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION USING MESSAGE = 'test_attempt tidak boleh dihapus (DBR10)', ERRCODE = 'DBR10';
    END IF;

    IF OLD.status = 'SUBMITTED' THEN
        RAISE EXCEPTION USING MESSAGE = 'test_attempt sudah SUBMITTED dan immutable (DBR10)', ERRCODE = 'DBR10';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (OLD.status = 'IN_PROGRESS' AND NEW.status = 'SUBMITTED') THEN
            RAISE EXCEPTION USING MESSAGE = 'transisi status test_attempt tidak valid (ST004)', ERRCODE = 'ST004';
        END IF;
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_test_attempt_state ON public.test_attempt;
CREATE TRIGGER trg_test_attempt_state
    BEFORE UPDATE OR DELETE ON public.test_attempt
    FOR EACH ROW EXECUTE FUNCTION public.fn_g3_test_attempt_state();

-- ============================================================================
-- RPC G3: FN-04, FN-05, FN-06, FN-07, FN-10
-- ============================================================================

-- FN-04 create_test_attempt (atomik: DBR-15 + snapshot soal, opsi acak 1x, kunci)
CREATE OR REPLACE FUNCTION public.fn_create_test_attempt(
    p_test_id UUID,
    p_creation_request_id UUID,
    p_payload_hash TEXT
)
RETURNS TABLE (
    attempt_id UUID,
    test_id UUID,
    test_type VARCHAR(8),
    status VARCHAR(16),
    total_questions INTEGER,
    current_sequence SMALLINT,
    started_at TIMESTAMPTZ,
    is_replay BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_existing public.test_attempt;
    v_test public.test;
    v_total_q INTEGER;
    v_total_ex INTEGER;
    v_done_ex INTEGER;
    v_created public.test_attempt;
    v_q RECORD;
    v_options_snap JSONB;
    v_order_snap JSONB;
    v_correct_snap JSONB;
    v_min_seq SMALLINT;
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

    -- Replay check sebelum validasi DBR07/DBR15
    SELECT * INTO v_existing
    FROM public.test_attempt ta
    WHERE ta.creation_request_id = p_creation_request_id;

    IF FOUND THEN
        IF v_existing.mahasiswa_id <> v_mahasiswa_id THEN
            RAISE EXCEPTION USING MESSAGE = 'creation_request_id bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
        END IF;
        IF v_existing.payload_hash <> p_payload_hash THEN
            RAISE EXCEPTION USING MESSAGE = 'idempotency conflict pada create_test_attempt (ID001)', ERRCODE = 'ID001';
        END IF;

        SELECT t.* INTO v_test FROM public.test t WHERE t.test_id = v_existing.test_id;
        SELECT count(*)::integer INTO v_total_q FROM public.test_answer ans WHERE ans.test_attempt_id = v_existing.test_attempt_id;
        SELECT COALESCE(MIN(ans.question_sequence) FILTER (WHERE ans.answered_at IS NULL), v_total_q::smallint)
        INTO v_min_seq
        FROM public.test_answer ans
        WHERE ans.test_attempt_id = v_existing.test_attempt_id;

        RETURN QUERY SELECT
            v_existing.test_attempt_id,
            v_existing.test_id,
            v_test.test_type,
            v_existing.status,
            v_total_q,
            v_min_seq,
            v_existing.started_at,
            TRUE;
        RETURN;
    END IF;

    SELECT * INTO v_test FROM public.test t WHERE t.test_id = p_test_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'tes tidak ditemukan', ERRCODE = 'P0002';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.test_attempt ta
        WHERE ta.mahasiswa_id = v_mahasiswa_id
          AND ta.test_id = p_test_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'mahasiswa sudah memiliki attempt untuk tes ini (DBR07)', ERRCODE = 'DBR07';
    END IF;

    -- DBR-15: syarat wajib Post-test (seluruh Exercise >= 1 attempt SUBMITTED)
    IF v_test.test_type = 'POST' THEN
        SELECT count(*)::integer INTO v_total_ex FROM public.exercise;
        SELECT count(DISTINCT ea.exercise_id)::integer INTO v_done_ex
        FROM public.exercise_attempt ea
        WHERE ea.mahasiswa_id = v_mahasiswa_id
          AND ea.status = 'SUBMITTED';

        IF v_total_ex = 0 OR v_done_ex < v_total_ex THEN
            RAISE EXCEPTION USING MESSAGE = 'seluruh exercise wajib diselesaikan sebelum memulai Post-test (DBR15)', ERRCODE = 'DBR15';
        END IF;
    END IF;

    SELECT count(*)::integer INTO v_total_q
    FROM public.test_question q
    WHERE q.test_id = p_test_id;

    IF v_total_q = 0 THEN
        RAISE EXCEPTION USING MESSAGE = 'tes belum memiliki soal (TE001)', ERRCODE = 'TE001';
    END IF;

    INSERT INTO public.test_attempt (
        mahasiswa_id, test_id, creation_request_id, payload_hash, started_at, status
    ) VALUES (
        v_mahasiswa_id, p_test_id, p_creation_request_id, p_payload_hash, statement_timestamp(), 'IN_PROGRESS'
    )
    RETURNING * INTO v_created;

    -- Snapshot semua soal dan pengacakan opsi MC satu kali dalam transaksi yang sama
    FOR v_q IN
        SELECT q.*
        FROM public.test_question q
        WHERE q.test_id = p_test_id
        ORDER BY q.sequence ASC
    LOOP
        IF v_q.question_type = 'MC' THEN
            WITH shuffled AS (
                SELECT
                    o.test_question_option_id,
                    o.option_text,
                    row_number() OVER (ORDER BY random()) AS new_seq
                FROM public.test_question_option o
                WHERE o.test_question_id = v_q.test_question_id
            )
            SELECT
                jsonb_agg(
                    jsonb_build_object(
                        'option_id', s.test_question_option_id::text,
                        'text', s.option_text,
                        'sequence', s.new_seq
                    ) ORDER BY s.new_seq
                ),
                jsonb_agg(s.test_question_option_id::text ORDER BY s.new_seq)
            INTO v_options_snap, v_order_snap
            FROM shuffled s;

            v_correct_snap := jsonb_build_object('option_id', v_q.correct_option_id::text);
        ELSIF v_q.question_type = 'TF' THEN
            v_options_snap := NULL;
            v_order_snap := NULL;
            v_correct_snap := jsonb_build_object('value', v_q.correct_boolean);
        ELSE
            v_options_snap := NULL;
            v_order_snap := NULL;
            v_correct_snap := jsonb_build_object('value', v_q.correct_text);
        END IF;

        INSERT INTO public.test_answer (
            test_attempt_id,
            test_question_id,
            question_sequence,
            question_snapshot,
            question_type_snapshot,
            options_snapshot,
            correct_answer_snapshot,
            option_order_snapshot
        ) VALUES (
            v_created.test_attempt_id,
            v_q.test_question_id,
            v_q.sequence,
            v_q.question_text,
            v_q.question_type,
            v_options_snap,
            v_correct_snap,
            v_order_snap
        );
    END LOOP;

    RETURN QUERY SELECT
        v_created.test_attempt_id,
        v_created.test_id,
        v_test.test_type,
        v_created.status,
        v_total_q,
        1::smallint,
        v_created.started_at,
        FALSE;
END $$;

-- FN-05 start_test_question (P7: set-if-NULL pada question_started_at)
CREATE OR REPLACE FUNCTION public.fn_start_test_question(
    p_attempt_id UUID,
    p_sequence SMALLINT
)
RETURNS TABLE (
    sequence SMALLINT,
    total_questions INTEGER,
    question_text TEXT,
    question_type VARCHAR(3),
    options JSONB,
    question_started_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_attempt public.test_attempt;
    v_total_q INTEGER;
    v_min_seq SMALLINT;
    v_row public.test_answer;
    v_started TIMESTAMPTZ;
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
    FROM public.test_attempt ta
    WHERE ta.test_attempt_id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'test_attempt tidak ditemukan', ERRCODE = 'P0002';
    END IF;
    IF v_attempt.mahasiswa_id <> v_mahasiswa_id THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
    END IF;
    IF v_attempt.status = 'SUBMITTED' THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt tes sudah SUBMITTED (ST001)', ERRCODE = 'ST001';
    END IF;

    SELECT count(*)::integer, MIN(ans.question_sequence) FILTER (WHERE ans.answered_at IS NULL)
    INTO v_total_q, v_min_seq
    FROM public.test_answer ans
    WHERE ans.test_attempt_id = p_attempt_id;

    SELECT * INTO v_row
    FROM public.test_answer ans
    WHERE ans.test_attempt_id = p_attempt_id
      AND ans.question_sequence = p_sequence
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'urutan soal tes tidak valid (DBR08)', ERRCODE = 'DBR08';
    END IF;
    IF v_row.answered_at IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'soal tes ini sudah dijawab (ST003)', ERRCODE = 'ST003';
    END IF;
    IF v_min_seq IS NULL OR p_sequence <> v_min_seq THEN
        RAISE EXCEPTION USING MESSAGE = 'soal tes wajib dikerjakan berurutan (DBR08)', ERRCODE = 'DBR08';
    END IF;

    IF v_row.question_started_at IS NULL THEN
        UPDATE public.test_answer
        SET question_started_at = statement_timestamp()
        WHERE test_answer_id = v_row.test_answer_id
        RETURNING test_answer.question_started_at INTO v_started;
    ELSE
        v_started := v_row.question_started_at;
    END IF;

    RETURN QUERY SELECT
        v_row.question_sequence,
        v_total_q,
        v_row.question_snapshot,
        v_row.question_type_snapshot,
        COALESCE(v_row.options_snapshot, '[]'::jsonb),
        v_started;
END $$;

-- FN-06 submit_test_answer
CREATE OR REPLACE FUNCTION public.fn_submit_test_answer(
    p_attempt_id UUID,
    p_sequence SMALLINT,
    p_answer JSONB,
    p_submission_request_id UUID,
    p_payload_hash TEXT
)
RETURNS TABLE (
    attempt_id UUID,
    sequence SMALLINT,
    is_recorded BOOLEAN,
    answered_at TIMESTAMPTZ,
    next_sequence SMALLINT,
    is_replay BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_replay public.test_answer;
    v_replay_att public.test_attempt;
    v_attempt public.test_attempt;
    v_row public.test_answer;
    v_total_q INTEGER;
    v_min_seq SMALLINT;
    v_now TIMESTAMPTZ;
    v_elapsed INTEGER;
    v_opt_uuid UUID;
    v_bool BOOLEAN;
    v_txt TEXT;
    v_is_correct BOOLEAN;
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

    -- 1. Replay check sebelum validasi status/urutan
    SELECT * INTO v_replay
    FROM public.test_answer ans
    WHERE ans.submission_request_id = p_submission_request_id;

    IF FOUND THEN
        SELECT * INTO v_replay_att
        FROM public.test_attempt ta
        WHERE ta.test_attempt_id = v_replay.test_attempt_id;

        IF v_replay_att.mahasiswa_id <> v_mahasiswa_id THEN
            RAISE EXCEPTION USING MESSAGE = 'submission_request_id bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
        END IF;
        IF v_replay.payload_hash <> p_payload_hash THEN
            RAISE EXCEPTION USING MESSAGE = 'idempotency conflict pada submit_test_answer (ID001)', ERRCODE = 'ID001';
        END IF;

        SELECT count(*)::integer INTO v_total_q
        FROM public.test_answer ans
        WHERE ans.test_attempt_id = v_replay.test_attempt_id;

        RETURN QUERY SELECT
            v_replay.test_attempt_id,
            v_replay.question_sequence,
            TRUE,
            v_replay.answered_at,
            CASE WHEN v_replay.question_sequence < v_total_q THEN (v_replay.question_sequence + 1)::smallint ELSE NULL END,
            TRUE;
        RETURN;
    END IF;

    -- 2. Lock attempt & validasi status
    SELECT * INTO v_attempt
    FROM public.test_attempt ta
    WHERE ta.test_attempt_id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'test_attempt tidak ditemukan', ERRCODE = 'P0002';
    END IF;
    IF v_attempt.mahasiswa_id <> v_mahasiswa_id THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
    END IF;
    IF v_attempt.status = 'SUBMITTED' THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt tes sudah SUBMITTED (ST001)', ERRCODE = 'ST001';
    END IF;

    SELECT count(*)::integer, MIN(ans.question_sequence) FILTER (WHERE ans.answered_at IS NULL)
    INTO v_total_q, v_min_seq
    FROM public.test_answer ans
    WHERE ans.test_attempt_id = p_attempt_id;

    SELECT * INTO v_row
    FROM public.test_answer ans
    WHERE ans.test_attempt_id = p_attempt_id
      AND ans.question_sequence = p_sequence
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'urutan soal tes tidak valid (DBR08)', ERRCODE = 'DBR08';
    END IF;
    IF v_row.answered_at IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'soal tes sudah dijawab (ST003)', ERRCODE = 'ST003';
    END IF;
    IF v_min_seq IS NULL OR p_sequence <> v_min_seq OR v_row.question_started_at IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'soal tes harus dimulai dan dijawab secara berurutan (DBR08)', ERRCODE = 'DBR08';
    END IF;

    PERFORM public.fn_validate_canonical_answer(v_row.question_type_snapshot, p_answer);

    v_opt_uuid := NULL;
    v_bool := NULL;
    v_txt := NULL;

    IF v_row.question_type_snapshot = 'MC' THEN
        v_opt_uuid := (p_answer->>'option_id')::uuid;
        IF NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(v_row.options_snapshot, '[]'::jsonb)) AS opt
            WHERE opt->>'option_id' = v_opt_uuid::text
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'opsi jawaban bukan bagian snapshot soal ini (OP001)', ERRCODE = 'OP001';
        END IF;
        v_is_correct := (v_opt_uuid::text = (v_row.correct_answer_snapshot->>'option_id'));
    ELSIF v_row.question_type_snapshot = 'TF' THEN
        v_bool := (p_answer->'value')::boolean;
        v_is_correct := (v_bool = (v_row.correct_answer_snapshot->'value')::boolean);
    ELSE
        v_txt := p_answer->>'value';
        v_is_correct := public.fn_evaluate_fib(v_txt, v_row.correct_answer_snapshot->>'value');
    END IF;

    v_now := statement_timestamp();
    v_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_row.question_started_at)))::integer);

    UPDATE public.test_answer
    SET submission_request_id = p_submission_request_id,
        payload_hash = p_payload_hash,
        selected_option_id = v_opt_uuid,
        student_boolean = v_bool,
        student_text = v_txt,
        is_correct = v_is_correct,
        answered_at = v_now,
        time_spent_seconds = v_elapsed
    WHERE test_answer_id = v_row.test_answer_id;

    RETURN QUERY SELECT
        p_attempt_id,
        p_sequence,
        TRUE,
        v_now,
        CASE WHEN p_sequence < v_total_q THEN (p_sequence + 1)::smallint ELSE NULL END,
        FALSE;
END $$;

-- FN-07 finalize_test_attempt
CREATE OR REPLACE FUNCTION public.fn_finalize_test_attempt(
    p_attempt_id UUID,
    p_request_id UUID DEFAULT NULL
)
RETURNS TABLE (
    attempt_id UUID,
    test_id UUID,
    test_type VARCHAR(8),
    status VARCHAR(16),
    score NUMERIC(5,2),
    total_duration_seconds INTEGER,
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
    v_attempt public.test_attempt;
    v_test_type VARCHAR(8);
    v_total_q INTEGER;
    v_answered_q INTEGER;
    v_correct_q INTEGER;
    v_score NUMERIC(5,2);
    v_updated public.test_attempt;
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
    FROM public.test_attempt ta
    WHERE ta.test_attempt_id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'test_attempt tidak ditemukan', ERRCODE = 'P0002';
    END IF;
    IF v_attempt.mahasiswa_id <> v_mahasiswa_id THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
    END IF;

    SELECT t.test_type INTO v_test_type
    FROM public.test t
    WHERE t.test_id = v_attempt.test_id;

    IF v_attempt.status = 'SUBMITTED' THEN
        IF p_request_id IS NOT NULL AND v_attempt.finalization_request_id = p_request_id THEN
            RETURN QUERY SELECT
                v_attempt.test_attempt_id,
                v_attempt.test_id,
                v_test_type,
                v_attempt.status,
                v_attempt.score,
                GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_attempt.submitted_at - v_attempt.started_at)))::integer),
                v_attempt.started_at,
                v_attempt.submitted_at,
                TRUE;
            RETURN;
        END IF;
        RAISE EXCEPTION USING MESSAGE = 'attempt tes sudah dikumpulkan sebelumnya (ST001)', ERRCODE = 'ST001';
    END IF;

    SELECT
        count(*)::integer,
        count(*) FILTER (WHERE ans.answered_at IS NOT NULL)::integer,
        count(*) FILTER (WHERE ans.is_correct IS TRUE)::integer
    INTO v_total_q, v_answered_q, v_correct_q
    FROM public.test_answer ans
    WHERE ans.test_attempt_id = p_attempt_id;

    IF v_total_q = 0 OR v_answered_q < v_total_q THEN
        RAISE EXCEPTION USING MESSAGE = 'masih ada soal tes yang belum dijawab (ST002)', ERRCODE = 'ST002';
    END IF;

    v_score := ROUND((v_correct_q::numeric / v_total_q::numeric) * 100::numeric, 2);

    UPDATE public.test_attempt
    SET status = 'SUBMITTED',
        submitted_at = statement_timestamp(),
        score = v_score,
        finalization_request_id = p_request_id
    WHERE test_attempt_id = p_attempt_id
    RETURNING * INTO v_updated;

    RETURN QUERY SELECT
        v_updated.test_attempt_id,
        v_updated.test_id,
        v_test_type,
        v_updated.status,
        v_updated.score,
        GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_updated.submitted_at - v_updated.started_at)))::integer),
        v_updated.started_at,
        v_updated.submitted_at,
        FALSE;
END $$;

-- FN-10 get_or_resume_test_attempt
CREATE OR REPLACE FUNCTION public.fn_get_or_resume_test_attempt(p_attempt_id UUID)
RETURNS TABLE (
    sequence SMALLINT,
    total_questions INTEGER,
    question_text TEXT,
    question_type VARCHAR(3),
    options JSONB,
    question_started_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_attempt public.test_attempt;
    v_total_q INTEGER;
    v_row public.test_answer;
    v_started TIMESTAMPTZ;
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
    FROM public.test_attempt ta
    WHERE ta.test_attempt_id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'test_attempt tidak ditemukan', ERRCODE = 'P0002';
    END IF;
    IF v_attempt.mahasiswa_id <> v_mahasiswa_id THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
    END IF;
    IF v_attempt.status = 'SUBMITTED' THEN
        RAISE EXCEPTION USING MESSAGE = 'attempt tes sudah SUBMITTED (ST001)', ERRCODE = 'ST001';
    END IF;

    SELECT count(*)::integer INTO v_total_q
    FROM public.test_answer ans
    WHERE ans.test_attempt_id = p_attempt_id;

    SELECT * INTO v_row
    FROM public.test_answer ans
    WHERE ans.test_attempt_id = p_attempt_id
      AND ans.answered_at IS NULL
    ORDER BY ans.question_sequence ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        SELECT * INTO v_row
        FROM public.test_answer ans
        WHERE ans.test_attempt_id = p_attempt_id
        ORDER BY ans.question_sequence DESC
        LIMIT 1;
    END IF;

    IF v_row.question_started_at IS NULL THEN
        UPDATE public.test_answer
        SET question_started_at = statement_timestamp()
        WHERE test_answer_id = v_row.test_answer_id
        RETURNING test_answer.question_started_at INTO v_started;
    ELSE
        v_started := v_row.question_started_at;
    END IF;

    RETURN QUERY SELECT
        v_row.question_sequence,
        v_total_q,
        v_row.question_snapshot,
        v_row.question_type_snapshot,
        COALESCE(v_row.options_snapshot, '[]'::jsonb),
        v_started;
END $$;
