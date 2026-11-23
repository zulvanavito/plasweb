-- ============================================================================
-- 009_lecturer_ai_usage_rls.sql — Izinkan Dosen Membaca Statistik AI Usage
-- Mahasiswa pada Kelas yang Diampu (Read-Only, Mengecualikan kelas_id IS NULL)
-- ============================================================================

DROP POLICY IF EXISTS plas_api_select_ai_usage ON public.ai_usage;
CREATE POLICY plas_api_select_ai_usage ON public.ai_usage
    FOR SELECT TO plas_api USING (
        EXISTS (
            SELECT 1
            FROM public.mahasiswa m
            LEFT JOIN public.kelas k ON k.kelas_id = m.kelas_id
            WHERE m.mahasiswa_id = ai_usage.mahasiswa_id
              AND (
                  m.auth_user_id = public.fn_request_auth_uid()
                  OR (m.kelas_id IS NOT NULL AND k.dosen_id = public.fn_current_dosen_id())
              )
        )
    );
