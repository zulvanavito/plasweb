-- ============================================================================
-- 005_functions_triggers_g4_ai.sql — G4: Kuota AI WITA, Idempotensi, & Recovery
-- ============================================================================

-- TR-08: State machine ai_usage
-- Tolak DELETE, tolak SUCCESS -> PENDING/FAILED, tolak FAILED -> SUCCESS langsung,
-- izinkan FAILED -> PENDING khusus reaktivasi FN-08 (processed_at = NULL + refresh reserved_at).
CREATE OR REPLACE FUNCTION public.fn_g4_ai_usage_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION USING MESSAGE = 'ai_usage tidak boleh dihapus (ST004)', ERRCODE = 'ST004';
    END IF;

    IF NEW.mahasiswa_id IS DISTINCT FROM OLD.mahasiswa_id
       OR NEW.request_id IS DISTINCT FROM OLD.request_id
       OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION USING MESSAGE = 'identitas metadata ai_usage bersifat immutable (ST004)', ERRCODE = 'ST004';
    END IF;

    IF OLD.status = 'SUCCESS' AND NEW.status IS DISTINCT FROM 'SUCCESS' THEN
        RAISE EXCEPTION USING MESSAGE = 'status AI SUCCESS bersifat final (ST004)', ERRCODE = 'ST004';
    END IF;

    IF OLD.status = 'FAILED' THEN
        IF NEW.status = 'PENDING' THEN
            IF NEW.processed_at IS NOT NULL OR NEW.reserved_at < OLD.reserved_at THEN
                RAISE EXCEPTION USING MESSAGE = 'reaktivasi FAILED -> PENDING wajib reset processed_at & perbarui reserved_at (ST004)', ERRCODE = 'ST004';
            END IF;
        ELSIF NEW.status IS DISTINCT FROM 'FAILED' THEN
            RAISE EXCEPTION USING MESSAGE = 'transisi status FAILED ke selain PENDING ditolak (ST004)', ERRCODE = 'ST004';
        END IF;
    END IF;

    IF OLD.status = 'PENDING' AND NEW.status NOT IN ('PENDING', 'SUCCESS', 'FAILED') THEN
        RAISE EXCEPTION USING MESSAGE = 'transisi status ai_usage tidak valid (ST004)', ERRCODE = 'ST004';
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ai_usage_state ON public.ai_usage;
CREATE TRIGGER trg_ai_usage_state
    BEFORE UPDATE OR DELETE ON public.ai_usage
    FOR EACH ROW EXECUTE FUNCTION public.fn_g4_ai_usage_state();

-- FN-08 reserve_ai_usage (zona waktu Asia/Makassar, payload_hash, reaktivasi FAILED -> PENDING)
CREATE OR REPLACE FUNCTION public.fn_reserve_ai_usage(
    p_request_id UUID,
    p_payload_hash TEXT,
    p_stale_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
    reservation_status TEXT,
    remaining_quota INTEGER,
    daily_limit INTEGER,
    usage_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_now TIMESTAMPTZ;
    v_today DATE;
    v_used INTEGER;
    v_existing public.ai_usage;
    v_limit CONSTANT INTEGER := 10;
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

    v_now := statement_timestamp();
    v_today := timezone('Asia/Makassar', v_now)::date;

    -- Lepaskan slot PENDING milik mahasiswa yang melewati batas stale > 5 menit
    UPDATE public.ai_usage u
    SET status = 'FAILED',
        processed_at = v_now
    WHERE u.mahasiswa_id = v_mahasiswa_id
      AND u.status = 'PENDING'
      AND u.reserved_at < (v_now - make_interval(mins => GREATEST(1, COALESCE(p_stale_minutes, 5))));

    SELECT count(*)::integer INTO v_used
    FROM public.ai_usage u
    WHERE u.mahasiswa_id = v_mahasiswa_id
      AND u.usage_date = v_today
      AND u.status IN ('PENDING', 'SUCCESS');

    SELECT * INTO v_existing
    FROM public.ai_usage u
    WHERE u.request_id = p_request_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.mahasiswa_id <> v_mahasiswa_id THEN
            RAISE EXCEPTION USING MESSAGE = 'request_id AI bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
        END IF;
        IF v_existing.payload_hash <> p_payload_hash THEN
            RAISE EXCEPTION USING MESSAGE = 'idempotency conflict pada reserve_ai_usage (ID001)', ERRCODE = 'ID001';
        END IF;

        IF v_existing.status = 'SUCCESS' THEN
            RETURN QUERY SELECT 'already_processed'::text, GREATEST(0, v_limit - v_used), v_limit, v_today;
            RETURN;
        ELSIF v_existing.status = 'PENDING' THEN
            RAISE EXCEPTION USING MESSAGE = 'permintaan AI dengan request_id ini masih diproses (ST005)', ERRCODE = 'ST005';
        ELSE
            -- Status sebelumnya FAILED -> reaktivasi jika kuota tersedia
            IF v_used >= v_limit THEN
                RAISE EXCEPTION USING MESSAGE = 'kuota harian AI telah habis (DBR11)', ERRCODE = 'DBR11';
            END IF;

            UPDATE public.ai_usage u
            SET status = 'PENDING',
                usage_date = v_today,
                reserved_at = v_now,
                processed_at = NULL
            WHERE u.ai_usage_id = v_existing.ai_usage_id;

            RETURN QUERY SELECT 'reserved'::text, GREATEST(0, v_limit - (v_used + 1)), v_limit, v_today;
            RETURN;
        END IF;
    END IF;

    IF v_used >= v_limit THEN
        RAISE EXCEPTION USING MESSAGE = 'kuota harian AI telah habis (DBR11)', ERRCODE = 'DBR11';
    END IF;

    INSERT INTO public.ai_usage (
        mahasiswa_id, request_id, payload_hash, usage_date, status, created_at, reserved_at, processed_at
    ) VALUES (
        v_mahasiswa_id, p_request_id, p_payload_hash, v_today, 'PENDING', v_now, v_now, NULL
    );

    RETURN QUERY SELECT 'reserved'::text, GREATEST(0, v_limit - (v_used + 1)), v_limit, v_today;
END $$;

-- FN-09 finalize_ai_usage
CREATE OR REPLACE FUNCTION public.fn_finalize_ai_usage(
    p_request_id UUID,
    p_final_status VARCHAR(10)
)
RETURNS TABLE (
    status VARCHAR(10),
    remaining_quota INTEGER,
    daily_limit INTEGER,
    usage_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_mahasiswa_id UUID;
    v_now TIMESTAMPTZ;
    v_today DATE;
    v_row public.ai_usage;
    v_used INTEGER;
    v_limit CONSTANT INTEGER := 10;
BEGIN
    v_uid := public.fn_request_auth_uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'identitas pengguna tidak terverifikasi (AU001)', ERRCODE = 'AU001';
    END IF;

    IF p_final_status NOT IN ('SUCCESS', 'FAILED') THEN
        RAISE EXCEPTION USING MESSAGE = 'status finalisasi AI harus SUCCESS atau FAILED (ST004)', ERRCODE = 'ST004';
    END IF;

    SELECT m.mahasiswa_id INTO v_mahasiswa_id
    FROM public.mahasiswa m
    WHERE m.auth_user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'profil mahasiswa tidak ditemukan (AU001)', ERRCODE = 'AU001';
    END IF;

    SELECT * INTO v_row
    FROM public.ai_usage u
    WHERE u.request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'record ai_usage tidak ditemukan', ERRCODE = 'P0002';
    END IF;
    IF v_row.mahasiswa_id <> v_mahasiswa_id THEN
        RAISE EXCEPTION USING MESSAGE = 'request_id AI bukan milik pemanggil (AU001)', ERRCODE = 'AU001';
    END IF;

    v_now := statement_timestamp();
    v_today := timezone('Asia/Makassar', v_now)::date;

    IF v_row.status = p_final_status THEN
        SELECT count(*)::integer INTO v_used
        FROM public.ai_usage u
        WHERE u.mahasiswa_id = v_mahasiswa_id
          AND u.usage_date = v_today
          AND u.status IN ('PENDING', 'SUCCESS');

        RETURN QUERY SELECT v_row.status, GREATEST(0, v_limit - v_used), v_limit, v_today;
        RETURN;
    END IF;

    IF v_row.status IN ('SUCCESS', 'FAILED') THEN
        RAISE EXCEPTION USING MESSAGE = 'status final ai_usage tidak dapat diubah ke hasil berbeda (ST004)', ERRCODE = 'ST004';
    END IF;

    UPDATE public.ai_usage u
    SET status = p_final_status,
        processed_at = v_now
    WHERE u.ai_usage_id = v_row.ai_usage_id;

    SELECT count(*)::integer INTO v_used
    FROM public.ai_usage u
    WHERE u.mahasiswa_id = v_mahasiswa_id
      AND u.usage_date = v_today
      AND u.status IN ('PENDING', 'SUCCESS');

    RETURN QUERY SELECT p_final_status, GREATEST(0, v_limit - v_used), v_limit, v_today;
END $$;

-- FN-11 reconcile_stale_ai_usage (untuk background recovery server Next.js)
CREATE OR REPLACE FUNCTION public.fn_reconcile_stale_ai_usage(p_stale_minutes INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := statement_timestamp();
    v_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE public.ai_usage u
        SET status = 'FAILED',
            processed_at = v_now
        WHERE u.status = 'PENDING'
          AND u.reserved_at < (v_now - make_interval(mins => GREATEST(1, COALESCE(p_stale_minutes, 5))))
        RETURNING 1
    )
    SELECT count(*)::integer INTO v_count FROM updated;

    RETURN v_count;
END $$;
