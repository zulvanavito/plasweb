-- ============================================================================
-- 008_lecturer_class_crud.sql — Manajemen Kelas Dosen (CRUD Kelas, Keluarkan
-- Mahasiswa) & Relaksasi DBR-14 saat kelas_id IS NULL
-- ============================================================================

-- 1. Relaksasi DBR-14:
--    Mahasiswa yang sudah mengumpulkan Pre-Test tetap dilarang berpindah
--    langsung dari satu kelas aktif ke kelas aktif lain (OLD -> NEW non-NULL).
--    Transisi ke NULL (kelas dihapus / dikeluarkan dosen) dan dari NULL ke
--    kelas baru (bergabung kembali setelah menjadi Pengguna Umum) diizinkan.
CREATE OR REPLACE FUNCTION public.fn_g1_kelas_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF OLD.kelas_id IS NOT NULL
       AND NEW.kelas_id IS NOT NULL
       AND NEW.kelas_id IS DISTINCT FROM OLD.kelas_id THEN
        IF EXISTS (
            SELECT 1
            FROM public.test_attempt ta
            JOIN public.test t ON t.test_id = ta.test_id
            WHERE ta.mahasiswa_id = OLD.mahasiswa_id
              AND t.test_type = 'PRE'
              AND ta.status = 'SUBMITTED'
        ) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'kelas tidak dapat dipindah langsung setelah pre-test SUBMITTED (DBR-14)',
                ERRCODE = 'DBR14';
        END IF;
    END IF;
    RETURN NEW;
END $$;

-- 2. RPC Dosen: Buat Kelas Baru
CREATE OR REPLACE FUNCTION public.fn_lecturer_create_class(
    p_nama VARCHAR(255),
    p_kode VARCHAR(50),
    p_tahun_akademik VARCHAR(20),
    p_semester VARCHAR(20)
)
RETURNS public.kelas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_dosen_id UUID;
    v_nama TEXT;
    v_kode TEXT;
    v_tahun TEXT;
    v_semester TEXT;
    v_created public.kelas;
BEGIN
    v_dosen_id := public.fn_current_dosen_id();
    IF v_dosen_id IS NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'akses khusus dosen terverifikasi (AU001)',
            ERRCODE = 'AU001';
    END IF;

    v_nama := btrim(COALESCE(p_nama, ''));
    v_kode := upper(btrim(COALESCE(p_kode, '')));
    v_tahun := btrim(COALESCE(p_tahun_akademik, ''));
    v_semester := btrim(COALESCE(p_semester, ''));

    IF v_nama = '' OR char_length(v_nama) > 255
       OR v_kode = '' OR char_length(v_kode) > 50
       OR v_tahun = '' OR char_length(v_tahun) > 20
       OR v_semester NOT IN ('Ganjil', 'Genap') THEN
        RAISE EXCEPTION USING
            MESSAGE = 'data kelas tidak valid (AN001)',
            ERRCODE = 'AN001';
    END IF;

    INSERT INTO public.kelas (dosen_id, nama, kode, tahun_akademik, semester)
    VALUES (v_dosen_id, v_nama, v_kode, v_tahun, v_semester)
    RETURNING * INTO v_created;

    RETURN v_created;
END $$;

-- 3. RPC Dosen: Perbarui Info Kelas Milik Sendiri
CREATE OR REPLACE FUNCTION public.fn_lecturer_update_class(
    p_kelas_id UUID,
    p_nama VARCHAR(255),
    p_kode VARCHAR(50),
    p_tahun_akademik VARCHAR(20),
    p_semester VARCHAR(20)
)
RETURNS public.kelas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_dosen_id UUID;
    v_nama TEXT;
    v_kode TEXT;
    v_tahun TEXT;
    v_semester TEXT;
    v_existing public.kelas;
    v_updated public.kelas;
BEGIN
    v_dosen_id := public.fn_current_dosen_id();
    IF v_dosen_id IS NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'akses khusus dosen terverifikasi (AU001)',
            ERRCODE = 'AU001';
    END IF;

    v_nama := btrim(COALESCE(p_nama, ''));
    v_kode := upper(btrim(COALESCE(p_kode, '')));
    v_tahun := btrim(COALESCE(p_tahun_akademik, ''));
    v_semester := btrim(COALESCE(p_semester, ''));

    IF v_nama = '' OR char_length(v_nama) > 255
       OR v_kode = '' OR char_length(v_kode) > 50
       OR v_tahun = '' OR char_length(v_tahun) > 20
       OR v_semester NOT IN ('Ganjil', 'Genap') THEN
        RAISE EXCEPTION USING
            MESSAGE = 'data kelas tidak valid (AN001)',
            ERRCODE = 'AN001';
    END IF;

    SELECT * INTO v_existing
    FROM public.kelas k
    WHERE k.kelas_id = p_kelas_id
      AND k.dosen_id = v_dosen_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING
            MESSAGE = 'kelas tidak ditemukan atau bukan milik dosen ini',
            ERRCODE = 'P0002';
    END IF;

    UPDATE public.kelas
    SET nama = v_nama,
        kode = v_kode,
        tahun_akademik = v_tahun,
        semester = v_semester
    WHERE kelas_id = p_kelas_id
    RETURNING * INTO v_updated;

    RETURN v_updated;
END $$;

-- 4. RPC Dosen: Hapus Kelas Milik Sendiri (mahasiswa otomatis menjadi Pengguna Umum)
CREATE OR REPLACE FUNCTION public.fn_lecturer_delete_class(p_kelas_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_dosen_id UUID;
    v_deleted_id UUID;
BEGIN
    v_dosen_id := public.fn_current_dosen_id();
    IF v_dosen_id IS NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'akses khusus dosen terverifikasi (AU001)',
            ERRCODE = 'AU001';
    END IF;

    DELETE FROM public.kelas k
    WHERE k.kelas_id = p_kelas_id
      AND k.dosen_id = v_dosen_id
    RETURNING k.kelas_id INTO v_deleted_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING
            MESSAGE = 'kelas tidak ditemukan atau bukan milik dosen ini',
            ERRCODE = 'P0002';
    END IF;

    RETURN v_deleted_id;
END $$;

-- 5. RPC Dosen: Keluarkan Mahasiswa Tertentu dari Kelas (mahasiswa menjadi Pengguna Umum)
CREATE OR REPLACE FUNCTION public.fn_lecturer_remove_student_from_class(
    p_kelas_id UUID,
    p_mahasiswa_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_dosen_id UUID;
    v_removed_id UUID;
BEGIN
    v_dosen_id := public.fn_current_dosen_id();
    IF v_dosen_id IS NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'akses khusus dosen terverifikasi (AU001)',
            ERRCODE = 'AU001';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.kelas k
        WHERE k.kelas_id = p_kelas_id
          AND k.dosen_id = v_dosen_id
    ) THEN
        RAISE EXCEPTION USING
            MESSAGE = 'kelas tidak ditemukan atau bukan milik dosen ini',
            ERRCODE = 'P0002';
    END IF;

    UPDATE public.mahasiswa m
    SET kelas_id = NULL
    WHERE m.mahasiswa_id = p_mahasiswa_id
      AND m.kelas_id = p_kelas_id
    RETURNING m.mahasiswa_id INTO v_removed_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING
            MESSAGE = 'mahasiswa tidak terdaftar di kelas ini',
            ERRCODE = 'P0002';
    END IF;

    RETURN v_removed_id;
END $$;

-- 6. Hak Eksekusi Minimum untuk plas_api (tanpa GRANT INSERT/UPDATE/DELETE pada tabel)
REVOKE ALL ON FUNCTION
    public.fn_lecturer_create_class(VARCHAR, VARCHAR, VARCHAR, VARCHAR),
    public.fn_lecturer_update_class(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR),
    public.fn_lecturer_delete_class(UUID),
    public.fn_lecturer_remove_student_from_class(UUID, UUID)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
    public.fn_lecturer_create_class(VARCHAR, VARCHAR, VARCHAR, VARCHAR),
    public.fn_lecturer_update_class(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR),
    public.fn_lecturer_delete_class(UUID),
    public.fn_lecturer_remove_student_from_class(UUID, UUID)
TO plas_api;
