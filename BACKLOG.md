# BACKLOG.md — `plasweb`

## Audit Sinkronisasi Blueprint vs `plasmobile` (Acuan Kontrak)
| # | Area | Penyelarasan di `plasweb` |
|---|---|---|
| 1 | Normalisasi FIB vs kunci `-` | Gunakan `trim + lowercase + collapse whitespace` (`fn_normalize_fib`), selaras `levenshtein.dart`, sehingga kunci operator `-` (Exercise 4.3 Soal 1) tidak hilang. |
| 2 | Error code `nim_conflict` | Petakan PostgreSQL `23505` pada `mahasiswa.nim` -> `409 nim_conflict`; `DBR13` -> `409 profile_conflict`; `POST /api/me` idempoten jika profil mahasiswa sudah ada. |
| 3 | Kolom `exercise_answer.answered_at` | Tambah `answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` pada `exercise_answer` untuk `ExerciseAnswerResponseDto.answered_at`. |
| 4 | Idempotensi `POST .../submit` | Tambah `finalization_request_id UUID UNIQUE` pada `exercise_attempt` dan `test_attempt` (replay `200` jika key sama, `409 already_submitted` jika key baru). |
| 5 | Mapping nama field DTO | Selaraskan 100% ke DTO `plasmobile`: `attempt_number`, `text`, `content_markdown`, `created_at` (`/activities`), `{ pre_test, post_test }`, `first_question: null`, dan `resume` memastikan `question_started_at` terisi. |
| 6 | Konten & jumlah soal resmi | Pakai `POST /api/me` dan seed resmi penuh: 7 Materi, 20 SubMateri, 20 Exercise (33 soal), 1 PRE (20 soal), 1 POST (20 soal). |
| 7 | Kontrak insert MC (`P3`/`P5`) | Tanpa kolom `is_correct`; pre-generate UUID opsi dan insert soal + opsi dalam 1 transaksi dengan `correct_option_id` FK `DEFERRABLE`. |

---

## Roadmap Bertahap (Tahap 1 s.d. Tahap 7)

### Tahap 1 — Fondasi Proyek, Schema SQL v0.3, RLS P4, Fungsi G1–G4, & Seed Resmi
- [x] Dokumen kontrol proyek (`AGENTS.md`, `BACKLOG.md`, `CHANGELOG.md`)
- [x] Scaffold Next.js App Router + TypeScript strict + Tailwind v4 + Zod + Vitest + `pg` + `@google/genai` + `@supabase/supabase-js` + `jose`
- [x] Token desain `DESIGN.md v1.1` (`globals.css`, `layout.tsx` dengan `Plus Jakarta Sans` & `JetBrains Mono`)
- [x] Migrasi SQL `001_schema_v03.sql` (16 tabel, CHECK kanonis `P6`, `answered_at`, `finalization_request_id`, indeks)
- [x] Migrasi SQL `002_triggers_g1.sql` (7 trigger G1 + guard `UPDATE OF question_type` + min 2 opsi MC)
- [x] Migrasi SQL `003_functions_triggers_g2_exercise.sql` (FIB Levenshtein >= 70%, `FN-01`–`FN-03`, `fn_upsert_student_profile`, `fn_update_student_class`, `TR-01`/`TR-03`/`TR-04`/`TR-07`)
- [x] Migrasi SQL `004_functions_triggers_g3_test.sql` (`FN-04`–`FN-07`, `FN-10`, `DBR-15`, snapshot atomik, `TR-02`/`TR-03`/`TR-04`/`TR-06`)
- [x] Migrasi SQL `005_functions_triggers_g4_ai.sql` (`FN-08`–`FN-09`, `FN-11` rekonsiliasi 5 menit, `TR-08`)
- [x] Migrasi SQL `006_rls_grants_p4.sql` (role `plas_api NOBYPASSRLS`, `REVOKE anon/authenticated`, RLS 16 tabel mahasiswa & dosen Read-Only)
- [x] Generator & seed resmi `007_seed_official_content.sql` (7 Materi, 20 SubMateri, 20 Exercise / 33 soal, 20 Pre-Test + 20 Post-Test)
- [x] Skrip `scripts/migrate.mjs` & `scripts/regress.mjs` + unit/structural test Vitest lokal (`tests/stage1-sql-seed.test.ts`)
- [x] Eksekusi `npm run db:migrate` pada Supabase Dev (`001`–`007` + dosen dev & kelas `TI-2A-2026` selesai; `regress.mjs` khusus scratch DB terpisah)

### Tahap 2 — Core Backend Runtime & 15 Endpoint Mahasiswa (§4.1–§4.3, §4.6)
- [x] Pool `pg` + `withUserTransaction` (`SET LOCAL ROLE plas_api` + `SET LOCAL request.jwt.claims` kompatibel Supavisor port 6543, tanpa `service_role`)
- [x] Verifikasi JWT Supabase Auth via JWKS ECC P-256 + fallback HS256 (`SEC-05`), pemetaan 21 SQLSTATE + `nim_conflict`, kanonikalisasi `payload_hash`, validasi Zod ketat (`AN001`)
- [x] DTO allow-list mahasiswa tanpa kunci jawaban (`P13`, `SEC-04`)
- [x] 15 Route Handlers (`/api/me`, `/api/classes`, `/api/me/class`, `/api/materials*`, `/api/sub-materials*`, `/api/exercises*`, `/api/exercise-attempts*`, `/api/progress`, `/api/activities`) + unit & contract tests (`tests/stage2-core-runtime.test.ts`, `tests/stage2-student-api-contracts.test.ts`)

### Tahap 3 — 7 Endpoint Tes Linear (§4.4) & 2 Endpoint AI Socratic (§4.5)
- [x] 7 Route Handlers Tes (`/api/tests`, `/api/tests/[testId]/attempts`, `/api/test-attempts/[attemptId]/questions/[sequence]/start|answers`, `.../resume`, `.../submit`, `/api/test-attempts/[attemptId]`)
- [x] 2 Route Handlers AI (`/api/ai/quota`, `/api/ai/ask`) via `@google/genai` (`gemini-2.5-flash`) + Socratic 3-level prompt + output guardrail + mock adapter + rekonsiliasi `PENDING > 5 menit` (`src/instrumentation.ts`)
- [x] Uji White Box Basis Path (`P14`) untuk evaluator FIB/MC, validasi payload kanonis, dan guardrail AI (`tests/stage3-whitebox-basis-path.test.ts`, `tests/stage3-tests-and-ai-contracts.test.ts`)

### Tahap 4 — 8 Endpoint Dosen Read-Only (§5) & UI Web Dashboard (`W01`–`W06`)
- [x] 8 Route Handlers `/api/lecturer/*` termasuk ekspor CSV aman & kunci jawaban Read-Only review (`P13`), mengecualikan `kelas_id NULL`, `NULL` skor tidak dianggap 0
- [x] Layar Web Dosen Light Mode (`W01`–`W06`) sesuai `DESIGN.md v1.1` & `PRD WEB.md` (3 menu sidebar, 4 state wajib, WCAG 2.1 AA)

### Tahap 5 — Integrasi End-to-End, Audit Keamanan (`SEC-01`–`SEC-14`), & Finalisasi
- [x] Audit keamanan statis/kontrak, dukungan Groq, & perbaikan runtime (`SEC-01`–`SEC-14`, `tests/stage5-security-audit.test.ts`, `GroqAiProvider` via `AI_PROVIDER=groq`, perbaikan `src/instrumentation.ts` & `next.config.ts` untuk `next dev`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`)
- [x] Verifikasi manual/live pengguna: uji silang live `plasmobile` <-> `plasweb` <-> Supabase Dev, database & AI Socratic terkonfirmasi berjalan sesuai rancangan

### Tahap 6 — Manajemen Kelas Dosen (CRUD Kelas, Keluarkan Mahasiswa, & Relaksasi Re-join `DBR-14`)
- [x] Migrasi SQL `008_lecturer_class_crud.sql` di Supabase Dev: relaksasi trigger `fn_g1_kelas_lock()` (`DBR-14`) saat `kelas_id IS NULL`, serta 4 RPC `SECURITY DEFINER` dosen (`fn_lecturer_create_class`, `fn_lecturer_update_class`, `fn_lecturer_delete_class`, `fn_lecturer_remove_student_from_class`) dengan `GRANT EXECUTE` khusus `plas_api`
- [x] Backend & Endpoint REST: `POST /api/lecturer/classes`, `PATCH/DELETE /api/lecturer/classes/[kelasId]`, `DELETE /api/lecturer/classes/[kelasId]/students/[mahasiswaId]`, mapping error `409 class_code_conflict`, serta sinkronisasi `pre_test_submitted` pada `GET /api/me` (`m.kelas_id IS NOT NULL`) agar mahasiswa yang dikeluarkan/kelasnya dihapus bisa bergabung kembali dan menyinkronkan seluruh nilai
- [x] UI Web Dosen (`W03`): tombol `Buat Kelas Baru`, `Edit`, `Hapus`, & `Keluarkan` beserta modal form `ClassFormModal` dan konfirmasi `ConfirmActionModal` pada `/classes` dan `/classes/[kelasId]`
- [x] Pembaruan suite uji (`tests/stage1`, `stage2`, `stage4`, `stage5`) & sinkronisasi dokumen (`AGENTS.md`, `BACKLOG.md`, `CHANGELOG.md`, `README.md`, `walkthrough.md`)

### Tahap 7 — Halaman Publik Google OAuth Branding Verification & GIS `signInWithIdToken`
- [x] Menambahkan placeholder `NEXT_PUBLIC_GOOGLE_CLIENT_ID` di `.env.example` dan memperjelas branding **PLAS (PLAS-TypeScript)** pada metadata `src/app/layout.tsx`
- [x] Mengganti `redirect("/login")` pada `src/app/page.tsx` menjadi halaman beranda publik resmi **PLAS (Programming Learning Assistant System) - PLAS-TypeScript** tanpa autentikasi, dengan CTA **Masuk Portal Dosen** (`/login`) serta tautan **Kebijakan Privasi** (`/privacy`) dan **Ketentuan Layanan** (`/terms`)
- [x] Menambahkan halaman publik `src/app/privacy/page.tsx` (`/privacy`) dan `src/app/terms/page.tsx` (`/terms`) bergaya *Academic Code & Paper* (`DESIGN.md v1.1`) dengan pengungkapan akses scope Google (`openid email profile`), penyimpanan Supabase, larangan penjualan/pembagian data pihak ketiga, ketentuan akun dosen/mahasiswa, dan kontak `zavitoanwari@gmail.com`
- [x] Mengubah Google Sign-In di `src/app/login/page.tsx` dari `signInWithOAuth` menjadi **Google Identity Services (GIS)** via `next/script` (`https://accounts.google.com/gsi/client`) + nonce Web Crypto (`SHA-256`) + `supabase.auth.signInWithIdToken`, beserta tautan `/`, `/privacy`, `/terms` pada footer kartu login
- [x] Memperbarui indikator loading `!authReady` di `src/app/(dashboard)/layout.tsx` menjadi cincin spinner `animate-spin` mengelilingi `PlasAppLogo` dengan status **PLAS-TypeScript** dan `role="status"` / `aria-live="polite"`
- [x] Menambahkan uji kontrak & hygiene di `tests/stage4-lecturer-api-and-csv.test.ts` serta verifikasi penuh (`42/42` test Vitest, `npm run typecheck`, `npm run lint`, dan isolated `next build`)

---

## Status Terakhir & Langkah Lanjutan (Handoff)
- **Posisi terakhir:** Seluruh implementasi **Tahap 1 s.d. Tahap 7** selesai dan terverifikasi (`7` berkas / `42` test Vitest lulus, `npm run typecheck`, `npm run lint`, dan `npm run build` terisolasi lulus). Migrasi SQL `001`–`008` terpasang di Supabase Dev.
- **Catatan operasional:**
  - Pastikan `NEXT_PUBLIC_GOOGLE_CLIENT_ID` terisi di environment produksi/lokal dan Client ID Google Web tersebut terdaftar di pengaturan Google provider Supabase Auth agar tombol GIS `signInWithIdToken` aktif pada `/login`.
  - Bila menjalankan `npm run db:regress` (`DBT-01`–`DBT-30`) di masa depan, jalankan **hanya** pada scratch PostgreSQL DB terpisah (**jangan** jalankan pada Supabase Dev karena `scripts/regress.mjs` menghapus schema `public`).
  - Lanjutkan sinkronisasi di sisi aplikasi mobile (`plasmobile`) menggunakan prompt penyesuaian `isClassLocked` bila diperlukan agar UI mobile selaras penuh untuk skenario `kelas == null && preTestSubmitted == true`.
