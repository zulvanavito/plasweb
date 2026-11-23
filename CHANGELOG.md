# CHANGELOG.md — `plasweb`

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).

## [Unreleased]

### Tahap 5 — Perbaikan Runtime Dev, Audit Keamanan (`SEC-01`–`SEC-14`) & Finalisasi
- Menambahkan dukungan provider AI **Groq** (`AI_PROVIDER=groq`) pada `src/lib/ai/provider.ts` (`GroqAiProvider` memakai `fetch` bawaan Node ke `https://api.groq.com/openai/v1/chat/completions` dengan model default `qwen/qwen3.8-27b`, timeout 24 detik -> `504 ai_timeout`, key kosong/error non-2xx -> `502 ai_service_error`, pembersihan blok `<think>...</think>` Qwen 3, serta placeholder `.env.example` dan unit test Vitest pada `tests/stage3-tests-and-ai-contracts.test.ts`).
- Memperbaiki crash/warning `next dev` (`Can't resolve 'fs'` di `pg-connection-string` dan `Can't resolve 'pg-native'`): memindahkan impor `@/lib/ai/reconciler` di `src/instrumentation.ts` menjadi dynamic `import()` di dalam guard `if (process.env.NEXT_RUNTIME === "nodejs")` agar Edge bundle tidak menarik `pg`, serta menambahkan `serverExternalPackages: ["pg"]` pada `next.config.ts` (startup `next dev` terkonfirmasi memuat `/instrumentation` dan `Ready` dengan `stderr` kosong).
- Menambahkan suite audit keamanan & runtime hygiene `tests/stage5-security-audit.test.ts` (memverifikasi nol `service_role`/`DATABASE_ADMIN_URL` di `src/`, 30/30 route API terjaga JWT, 8/8 route dosen `GET`-only, `SET LOCAL ROLE plas_api`, klien Read-Only, dan modal `Escape`).
- Memperbarui `BACKLOG.md` (menandai audit otomatis & build selesai sambil mencatat uji silang/visual live untuk sesi lokal pengguna) dan menyelesaikan verifikasi akhir `npm test`, `npm run typecheck`, `npm run lint`, serta `npm run build`.

### Tahap 4 — 8 Endpoint Dosen Read-Only (§5) & UI Web Dashboard (`W01`–`W06`)
- Mengimplementasikan 8 Route Handlers `GET`-only (`/api/lecturer/dashboard`, `/api/lecturer/classes`, `/api/lecturer/classes/[kelasId]`, `/api/lecturer/activities`, `/api/lecturer/activities/[attemptId]`, `/api/lecturer/evaluations`, `/api/lecturer/evaluations/[mahasiswaId]`, `/api/lecturer/evaluations/export`) melalui role `plas_api` + JWT (`requireLecturer` -> `403 forbidden` bagi non-dosen, scoping `k.dosen_id`, mengecualikan `kelas_id IS NULL` `WEB-BR-002`, menjaga `NULL` tidak dianggap 0 `WEB-BR-009`, pasangan `SUBMITTED` Pre/Post `WEB-BR-010`, kunci jawaban Read-Only `P13`, serta sanitasi CSV formula injection `=,+,-,@`).
- Membangun antarmuka Web Dashboard Dosen Read-Only Light Mode (*Academic Code & Paper* `DESIGN.md v1.1`) untuk layar `W01`–`W06`: `/login` (Email+Sandi & Google Sign-In tanpa tab Daftar), App Shell 3 menu (`Dashboard`, `Data Kelas`, `Aktivitas Pembelajaran`), KPI + 4 grafik SVG + modal tinjauan `W05`/`W06`, zona waktu `Asia/Makassar` (`WITA`), serta bebas em-dash/emoji.
- Menambahkan unit & contract tests Vitest (`tests/stage4-lecturer-api-and-csv.test.ts`) untuk verifikasi kontrak 8 endpoint dosen, anti-kebocoran `SEC-02`/`SEC-07`/`SEC-09`/`SEC-13`, sanitasi CSV, dan kebersihan teks UI.

### Tahap 3 — 7 Endpoint Tes Linear (§4.4) & 2 Endpoint AI Socratic (§4.5)
- Implementasi 7 Route Handlers Tes Linear (`/api/tests`, `/api/tests/[testId]/attempts`, `/api/test-attempts/[attemptId]/questions/[sequence]/start`, `.../answers`, `.../resume`, `.../submit`, dan `/api/test-attempts/[attemptId]`) beserta layanan `src/lib/services/student-tests.ts` tanpa kebocoran kunci atau `explanation` (`P13`/`SEC-04`).
- Implementasi modul AI Socratic & 2 Route Handlers AI (`/api/ai/quota`, `/api/ai/ask`):
  - `src/lib/ai/socratic-prompt.ts`: System Prompt Socratic 3-level (`1` Konsep Dasar, `2` Strategi, `3` Penalaran) tanpa menyertakan kunci jawaban.
  - `src/lib/ai/guardrail.ts`: Output guardrail anti-bocor kunci untuk `MC`, `TF`, `FIB` + 1x retry koreksi otomatis.
  - `src/lib/ai/provider.ts`: `GeminiAiProvider` (`gemini-2.5-flash` via `@google/genai`, timeout 24 detik < 35 detik client) & `MockSocraticAiProvider`.
  - `src/lib/services/student-ai.ts`: orkestrator 2 transaksi terpisah (`fn_reserve_ai_usage` commit sebelum LLM -> panggil model + guardrail -> `fn_finalize_ai_usage` `SUCCESS`/`FAILED`).
  - `src/lib/ai/reconciler.ts` & `src/instrumentation.ts`: pembersihan otomatis slot `PENDING` > 5 menit saat startup dan tiap 60 detik.
- Penambahan `src/lib/domain/answer-evaluator.ts` (mirror evaluator FIB/MC) dan suite uji `tests/stage3-tests-and-ai-contracts.test.ts` serta `tests/stage3-whitebox-basis-path.test.ts` (`P14`).

### Tahap 2 — Core Backend Runtime & 15 Endpoint Mahasiswa (§4.1–§4.3, §4.6)
- Penambahan runtime server inti:
  - `src/lib/db/pool.ts`: pool `pg` memakai `DATABASE_URL` (`plas_api`, kompatibel Supavisor port 6543 tanpa named prepared statements) dengan `runWithUserTransaction` (`BEGIN` + `SET LOCAL ROLE plas_api` + `set_config('request.jwt.claims', ..., true)`).
  - `src/lib/auth/verify-token.ts`: verifikasi JWT Supabase Auth via JWKS ECC P-256 (`ES256`/`RS256`/`EdDSA` via `jose`) + fallback opsional `HS256`.
  - `src/lib/http/errors.ts`, `src/lib/http/idempotency.ts`, `src/lib/http/route.ts`, & `src/lib/validation/schemas.ts`: pemetaan 21 SQLSTATE + `nim_conflict`, `Idempotency-Key` + SHA-256 `payload_hash` kanonis, dan validasi bentuk `StudentAnswer` ketat (`P6`/`AN001`).
  - `src/lib/dto/student-mappers.ts`: DTO allow-list tanpa kunci jawaban (`P13`/`SEC-04`), konversi numerik `score`, dan `explanation` hanya pasca `SUBMITTED`.
- Implementasi layanan & 15 Route Handlers mahasiswa (`/api/me`, `/api/classes`, `/api/me/class`, `/api/materials`, `/api/materials/[materialId]`, `/api/sub-materials/[submaterialId]`, `/api/sub-materials/[submaterialId]/exercise`, `/api/exercises/[exerciseId]/attempts`, `/api/exercise-attempts/[attemptId]/answers`, `/api/exercise-attempts/[attemptId]/submit`, `/api/exercise-attempts/[attemptId]`, `/api/progress`, `/api/activities`).
- Penambahan `tests/stage2-core-runtime.test.ts` & `tests/stage2-student-api-contracts.test.ts` (total 14/14 test lulus, `tsc --noEmit`, `eslint`, dan `next build` lulus); pembaruan status migrasi Supabase Dev Tahap 1 di `BACKLOG.md`.

### Tahap 1 — Fondasi Proyek, Schema SQL v0.3, RLS P4, Fungsi G1–G4, & Seed Resmi
- Inisiasi dokumen kontrol proyek (`AGENTS.md`, `BACKLOG.md`, `CHANGELOG.md`) dan konfigurasi dasar Next.js 15 App Router + React 19 + TypeScript strict + Tailwind CSS v4 + Zod + Vitest + `pg` + `@google/genai` + `@supabase/supabase-js` + `jose`.
- Penyiapan token desain Light Mode `DESIGN.md v1.1` pada `src/app/globals.css`, font self-hosted `@fontsource-variable/plus-jakarta-sans` & `@fontsource-variable/jetbrains-mono` di `src/app/layout.tsx` (build 100% offline), serta halaman dasar `src/app/page.tsx`.
- Penambahan migrasi PostgreSQL 16 terurut (`supabase/migrations/001` s.d. `006`) untuk 16 tabel, trigger G1 (+ guard `UPDATE OF question_type` & min 2 opsi MC), fungsi & trigger G2 (Exercise + FIB Levenshtein >= 70% dengan normalisasi `trim + lowercase + collapse whitespace`), G3 (Tes linear + `DBR-15`), G4 (Kuota AI WITA + rekonsiliasi 5 menit), serta model akses P4 (`plas_api NOBYPASSRLS`, revoke `anon`/`authenticated`, helper non-rekursif `fn_current_dosen_id()`, RLS 16 tabel mahasiswa & dosen Read-Only).
- Penambahan generator deterministik `scripts/generate-seed.mjs` yang menghasilkan `supabase/migrations/007_seed_official_content.sql` dari dokumen resmi `PLAS` (7 Materi, 20 SubMateri, 20 Exercise / 33 soal / 56 opsi, 20 Pre-Test + 20 Post-Test).
- Penambahan `scripts/migrate.mjs`, `scripts/regress.mjs`, dan suite uji lokal `tests/stage1-sql-seed.test.ts` (6/6 test lulus, `tsc --noEmit` lulus, `eslint` lulus, `next build` lulus; verifikasi live PostgreSQL/Supabase Dev menunggu koneksi siap).
