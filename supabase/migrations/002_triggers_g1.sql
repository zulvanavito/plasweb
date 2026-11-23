-- ============================================================================
-- 002_triggers_g1.sql — G1: Integritas Konten, Profil Eksklusif, & DBR-14
-- ============================================================================

-- G1.1 | DBR-13: satu auth.users.id hanya satu jenis profil
-- SECURITY DEFINER terbatas agar trigger lintas tabel tetap dapat memeriksa
-- tabel lawan ketika dijalankan oleh role server plas_api tanpa BYPASSRLS.
CREATE OR REPLACE FUNCTION public.fn_g1_mahasiswa_profile_excl()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(
        hashtextextended('plas:profile:' || NEW.auth_user_id::text, 0)
    );
    IF EXISTS (
        SELECT 1 FROM public.dosen d
        WHERE d.auth_user_id = NEW.auth_user_id
    ) THEN
        RAISE EXCEPTION USING
            MESSAGE = 'auth.users.id sudah terhubung ke profil dosen (DBR-13)',
            ERRCODE = 'DBR13';
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_g1_dosen_profile_excl()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(
        hashtextextended('plas:profile:' || NEW.auth_user_id::text, 0)
    );
    IF EXISTS (
        SELECT 1 FROM public.mahasiswa m
        WHERE m.auth_user_id = NEW.auth_user_id
    ) THEN
        RAISE EXCEPTION USING
            MESSAGE = 'auth.users.id sudah terhubung ke profil mahasiswa (DBR-13)',
            ERRCODE = 'DBR13';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mahasiswa_profile_excl ON public.mahasiswa;
CREATE TRIGGER trg_mahasiswa_profile_excl
    BEFORE INSERT OR UPDATE OF auth_user_id ON public.mahasiswa
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_mahasiswa_profile_excl();

DROP TRIGGER IF EXISTS trg_dosen_profile_excl ON public.dosen;
CREATE TRIGGER trg_dosen_profile_excl
    BEFORE INSERT OR UPDATE OF auth_user_id ON public.dosen
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_dosen_profile_excl();

-- G1.2 | DBR-14 / P8: kunci perubahan kelas setelah PRE SUBMITTED
CREATE OR REPLACE FUNCTION public.fn_g1_kelas_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NEW.kelas_id IS DISTINCT FROM OLD.kelas_id THEN
        IF EXISTS (
            SELECT 1
            FROM public.test_attempt ta
            JOIN public.test t ON t.test_id = ta.test_id
            WHERE ta.mahasiswa_id = OLD.mahasiswa_id
              AND t.test_type = 'PRE'
              AND ta.status = 'SUBMITTED'
        ) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'kelas tidak dapat diubah setelah pre-test SUBMITTED (DBR-14)',
                ERRCODE = 'DBR14';
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mahasiswa_kelas_lock ON public.mahasiswa;
CREATE TRIGGER trg_mahasiswa_kelas_lock
    BEFORE UPDATE OF kelas_id ON public.mahasiswa
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_kelas_lock();

-- G1.3 | DBR-03: tipe pertanyaan = tipe exercise induk (dua arah)
CREATE OR REPLACE FUNCTION public.fn_g1_question_type_consistent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_parent_type VARCHAR(3);
BEGIN
    SELECT e.question_type INTO v_parent_type
    FROM public.exercise e
    WHERE e.exercise_id = NEW.exercise_id;

    IF v_parent_type IS DISTINCT FROM NEW.question_type THEN
        RAISE EXCEPTION USING
            MESSAGE = 'tipe pertanyaan tidak sesuai tipe exercise (DBR-03)',
            ERRCODE = 'DBR03';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_exercise_question_type ON public.exercise_question;
CREATE TRIGGER trg_exercise_question_type
    BEFORE INSERT OR UPDATE OF question_type, exercise_id ON public.exercise_question
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_question_type_consistent();

CREATE OR REPLACE FUNCTION public.fn_g1_exercise_type_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NEW.question_type IS DISTINCT FROM OLD.question_type THEN
        IF EXISTS (
            SELECT 1 FROM public.exercise_question q
            WHERE q.exercise_id = OLD.exercise_id
              AND q.question_type IS DISTINCT FROM NEW.question_type
        ) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'tipe exercise tidak dapat diubah selama masih memiliki soal bertipe lain (DBR-03)',
                ERRCODE = 'DBR03';
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_exercise_type_update_guard ON public.exercise;
CREATE TRIGGER trg_exercise_type_update_guard
    BEFORE UPDATE OF question_type ON public.exercise
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_exercise_type_update_guard();

-- G1.4 | DBR-03: exercise tidak kehilangan pertanyaan terakhir
CREATE OR REPLACE FUNCTION public.fn_g1_question_last_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    PERFORM 1 FROM public.exercise e
    WHERE e.exercise_id = OLD.exercise_id
    FOR UPDATE;

    IF NOT EXISTS (
        SELECT 1 FROM public.exercise_question q
        WHERE q.exercise_id = OLD.exercise_id
          AND q.exercise_question_id <> OLD.exercise_question_id
    ) THEN
        RAISE EXCEPTION USING
            MESSAGE = 'exercise tidak boleh kehilangan pertanyaan terakhir (DBR-03)',
            ERRCODE = 'DBR03';
    END IF;
    RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_exercise_question_last ON public.exercise_question;
CREATE TRIGGER trg_exercise_question_last
    BEFORE DELETE ON public.exercise_question
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_question_last_guard();

-- G1.5 | DBR-04: opsi hanya untuk soal MC (latihan & tes)
CREATE OR REPLACE FUNCTION public.fn_g1_exercise_option_mc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_type VARCHAR(3);
BEGIN
    SELECT q.question_type INTO v_type
    FROM public.exercise_question q
    WHERE q.exercise_question_id = NEW.exercise_question_id;

    IF v_type IS DISTINCT FROM 'MC' THEN
        RAISE EXCEPTION USING
            MESSAGE = 'opsi hanya boleh untuk pertanyaan MC (DBR-04)',
            ERRCODE = 'DBR04';
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_g1_test_option_mc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_type VARCHAR(3);
BEGIN
    SELECT q.question_type INTO v_type
    FROM public.test_question q
    WHERE q.test_question_id = NEW.test_question_id;

    IF v_type IS DISTINCT FROM 'MC' THEN
        RAISE EXCEPTION USING
            MESSAGE = 'opsi hanya boleh untuk pertanyaan MC (DBR-04)',
            ERRCODE = 'DBR04';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_exercise_option_mc ON public.exercise_question_option;
CREATE TRIGGER trg_exercise_option_mc
    BEFORE INSERT OR UPDATE ON public.exercise_question_option
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_exercise_option_mc();

DROP TRIGGER IF EXISTS trg_test_option_mc ON public.test_question_option;
CREATE TRIGGER trg_test_option_mc
    BEFORE INSERT OR UPDATE ON public.test_question_option
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_test_option_mc();

-- G1.6 | DBR-04 (Penambalan G1): soal MC wajib memiliki minimal 2 opsi saat commit
CREATE OR REPLACE FUNCTION public.fn_g1_exercise_mc_min_options()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_question_id UUID;
    v_qtype VARCHAR(3);
    v_opt_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'exercise_question' THEN
        v_question_id := NEW.exercise_question_id;
    ELSE
        v_question_id := COALESCE(NEW.exercise_question_id, OLD.exercise_question_id);
    END IF;

    SELECT q.question_type INTO v_qtype
    FROM public.exercise_question q
    WHERE q.exercise_question_id = v_question_id;

    IF v_qtype = 'MC' THEN
        SELECT count(*)::integer INTO v_opt_count
        FROM public.exercise_question_option o
        WHERE o.exercise_question_id = v_question_id;

        IF v_opt_count < 2 THEN
            RAISE EXCEPTION USING
                MESSAGE = 'pertanyaan MC wajib memiliki minimal 2 opsi (DBR-04)',
                ERRCODE = 'DBR04';
        END IF;
    END IF;
    RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.fn_g1_test_mc_min_options()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_question_id UUID;
    v_qtype VARCHAR(3);
    v_opt_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'test_question' THEN
        v_question_id := NEW.test_question_id;
    ELSE
        v_question_id := COALESCE(NEW.test_question_id, OLD.test_question_id);
    END IF;

    SELECT q.question_type INTO v_qtype
    FROM public.test_question q
    WHERE q.test_question_id = v_question_id;

    IF v_qtype = 'MC' THEN
        SELECT count(*)::integer INTO v_opt_count
        FROM public.test_question_option o
        WHERE o.test_question_id = v_question_id;

        IF v_opt_count < 2 THEN
            RAISE EXCEPTION USING
                MESSAGE = 'pertanyaan MC tes wajib memiliki minimal 2 opsi (DBR-04)',
                ERRCODE = 'DBR04';
        END IF;
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_exercise_question_mc_min_options ON public.exercise_question;
CREATE CONSTRAINT TRIGGER trg_exercise_question_mc_min_options
    AFTER INSERT OR UPDATE OF question_type ON public.exercise_question
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_exercise_mc_min_options();

DROP TRIGGER IF EXISTS trg_exercise_option_mc_min_options ON public.exercise_question_option;
CREATE CONSTRAINT TRIGGER trg_exercise_option_mc_min_options
    AFTER DELETE ON public.exercise_question_option
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_exercise_mc_min_options();

DROP TRIGGER IF EXISTS trg_test_question_mc_min_options ON public.test_question;
CREATE CONSTRAINT TRIGGER trg_test_question_mc_min_options
    AFTER INSERT OR UPDATE OF question_type ON public.test_question
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_test_mc_min_options();

DROP TRIGGER IF EXISTS trg_test_option_mc_min_options ON public.test_question_option;
CREATE CONSTRAINT TRIGGER trg_test_option_mc_min_options
    AFTER DELETE ON public.test_question_option
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.fn_g1_test_mc_min_options();
