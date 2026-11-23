# `plasweb` - PLAS-TypeScript Web Dashboard & Backend REST API

`plasweb` adalah backend **Single-Entry REST API** dan **Web Dashboard Dosen Read-Only** untuk ekosistem **PLAS-TypeScript** (pembelajaran TypeScript berbasis Mobile, Web Analitik, dan AI Socratic Assistant).

Aplikasi ini dibangun menggunakan **Next.js 15 App Router**, **React 19**, **TypeScript (`strict`)**, **Tailwind CSS v4**, dan driver **`pg` (`node-postgres` murni tanpa ORM)** yang terhubung ke **Supabase PostgreSQL 16**.

---

## Fitur Utama

### 1. Backend Single-Entry REST API (`/api/*`)
Seluruh pertukaran data aplikasi mobile (`plasmobile`) maupun web dosen melewati Route Handlers Next.js (akses langsung client ke tabel Supabase via `anon`/`authenticated` dicabut/`REVOKE`):
- **Autentikasi & Profil Mahasiswa:** `GET/POST /api/me`, `GET /api/classes`, `PUT /api/me/class`.
- **Materi, Sub-Materi, & Latihan:** `GET /api/materials`, `GET /api/materials/[materialId]`, `GET /api/sub-materials/[submaterialId]`, `GET /api/sub-materials/[submaterialId]/exercise`, `POST /api/exercises/[exerciseId]/attempts`, `POST /api/exercise-attempts/[attemptId]/answers`, `POST /api/exercise-attempts/[attemptId]/submit`, `GET /api/exercise-attempts/[attemptId]`.
- **Progress & Log Aktivitas:** `GET /api/progress`, `GET /api/activities`.
- **Tes Linear (Pre-Test & Post-Test):** `GET /api/tests`, `POST /api/tests/[testId]/attempts`, `POST /api/test-attempts/[attemptId]/questions/[sequence]/start`, `POST /api/test-attempts/[attemptId]/questions/[sequence]/answers`, `GET /api/test-attempts/[attemptId]/resume`, `POST /api/test-attempts/[attemptId]/submit`, `GET /api/test-attempts/[attemptId]`.
- **AI Learning Assistant (Socratic 3-Level):** `GET /api/ai/quota`, `POST /api/ai/ask`.
- **Endpoint Dosen Read-Only (`GET`-only):**
  - `GET /api/lecturer/dashboard`
  - `GET /api/lecturer/classes`
  - `GET /api/lecturer/classes/[kelasId]`
  - `GET /api/lecturer/activities`
  - `GET /api/lecturer/activities/[attemptId]`
  - `GET /api/lecturer/evaluations`
  - `GET /api/lecturer/evaluations/[mahasiswaId]`
  - `GET /api/lecturer/evaluations/export` (ekspor CSV aman)

### 2. Web Dashboard Dosen Read-Only (`W01`-`W06`)
Antarmuka Light Mode (*Academic Code & Paper*) tanpa operasi mutasi (CRUD) dan tanpa asisten AI di web:
- **`/login` (`W01`):** Login Email + Kata Sandi dan Google Sign-In via Supabase Auth (tanpa tab pendaftaran), menolak akun non-dosen dengan pesan aman `403 forbidden`.
- **`/dashboard` (`W02`):** 4 kartu KPI, grafik SVG distribusi status latihan, perbandingan Pre-Test vs Post-Test berpasangan, tren aktivitas harian (`Asia/Makassar` / `WITA`), serta daftar aktivitas terbaru.
- **`/classes` & `/classes/[kelasId]` (`W03`):** Daftar kelas ampuan dosen, pencarian/filter tahun akademik & semester, daftar mahasiswa per kelas, serta unduh CSV.
- **`/activities` (`W04`) & Modal Tinjauan (`W05`/`W06`):** Tab riwayat latihan & evaluasi Pre/Post beserta selisih, distribusi Materi 01-07, rincian jawaban mahasiswa + kunci jawaban Read-Only dosen, serta keterangan metode evaluasi FIB (`Case-insensitive + Trim + Levenshtein Similarity >= 70%`).

### 3. AI Socratic Learning Assistant (`AI_PROVIDER`)
Mendukung tiga adapter provider pada `src/lib/ai/provider.ts` tanpa ketergantungan framework AI tambahan:
- **`gemini` (default):** Google Gemini (`gemini-2.5-flash` via `@google/genai`).
- **`groq`:** Groq Chat Completions API via `fetch` bawaan Node (`https://api.groq.com/openai/v1/chat/completions`, default model `qwen/qwen3.8-27b`, otomatis membersihkan blok reasoning `<think>...</think>`).
- **`mock`:** Adapter deterministik lokal untuk pengujian.

Setiap permintaan `POST /api/ai/ask` melalui pipeline:
1. Validasi payload (`Zod`) & pemuatan konteks soal/materi **tanpa** kunci jawaban.
2. Reservasi kuota harian atomik (`fn_reserve_ai_usage`, zona waktu `Asia/Makassar`) yang di-`COMMIT` sebelum panggilan LLM.
3. System prompt Socratic 3 level (`1` Konsep Dasar, `2` Strategi, `3` Penalaran) + timeout 24 detik (`504 ai_timeout`).
4. Output guardrail anti-bocor kunci jawaban (`MC`/`TF`/`FIB`) dengan 1x retry koreksi otomatis.
5. Finalisasi status `SUCCESS`/`FAILED` (`fn_finalize_ai_usage`) serta rekonsiliasi otomatis slot `PENDING` > 5 menit melalui `src/instrumentation.ts`.

---

## Arsitektur Keamanan & Aturan Data
- **Least Privilege PostgreSQL (`P4`):** Pool server (`src/lib/db/pool.ts`) memakai role `plas_api` (`NOBYPASSRLS`) dan menjalankan `BEGIN` + `SET LOCAL ROLE plas_api` + `set_config('request.jwt.claims', ..., true)` per transaksi (kompatibel dengan Supavisor transaction pooler port `6543`). `service_role` tidak pernah dipakai di runtime request.
- **Verifikasi JWT (`SEC-05`):** Verifikasi token Supabase Auth melalui JWKS ECC P-256 (`ES256`/`RS256`/`EdDSA` via `jose`) dengan fallback opsional `HS256`.
- **Anti-Kebocoran Kunci Jawaban (`P13`):** Endpoint/DTO mahasiswa dan prompt LLM tidak pernah menerima `correct_*`, `correct_answer_snapshot`, atau `explanation` sebelum submit.
- **Idempotensi Request:** Header `Idempotency-Key` (UUID) beserta pemeriksaan SHA-256 `payload_hash` kanonis (`src/lib/http/idempotency.ts`).
- **Aturan Analitik Dosen:** Mengecualikan pengguna umum (`kelas_id IS NULL`), tidak menganggap skor `IN_PROGRESS`/`NOT_STARTED` (`NULL`) sebagai `0`, menghitung selisih Pre-Test vs Post-Test hanya pada pasangan berstatus `SUBMITTED`, dan menetralkan CSV formula injection (`=`, `+`, `-`, `@`, tab/CR).

---

## Struktur Direktori

```text
plasweb/
├── src/
│   ├── instrumentation.ts              # Rekonsiliasi AI PENDING > 5 menit (Node runtime)
│   ├── app/
│   │   ├── (dashboard)/                # App Shell & halaman W02-W04 (/dashboard, /classes, /activities)
│   │   ├── login/page.tsx              # Halaman masuk dosen W01
│   │   └── api/                        # 22 route mobile + 8 route dosen (/api/lecturer/*)
│   ├── components/
│   │   ├── charts/                     # Grafik SVG analitik dosen
│   │   ├── lecturer/                   # Modal tinjauan Read-Only W05 & W06
│   │   └── ui/                         # Ikon SVG, maskot, badge status, code block, modal & error state
│   └── lib/
│       ├── ai/                         # Provider (Gemini/Groq/Mock), prompt Socratic, guardrail, reconciler
│       ├── api/                        # Client fetch Read-Only & formatter WITA
│       ├── auth/                       # Verifikasi JWT Supabase (JWKS / HS256)
│       ├── db/                         # Pool pg & transaksi SET LOCAL ROLE plas_api
│       ├── domain/                     # Evaluator jawaban lokal (mirror FIB/MC)
│       ├── dto/                        # Allow-list DTO mapper mahasiswa & dosen
│       ├── http/                       # Error SQLSTATE mapper, idempotensi, wrapper route
│       ├── services/                   # Layanan bisnis mahasiswa, dosen, & sanitasi CSV
│       ├── supabase/                   # Browser Supabase client (khusus Auth)
│       └── validation/                 # Skema Zod kanonis & parser query
├── supabase/migrations/                # Migrasi SQL terurut 001 s.d. 007
├── scripts/                            # generate-seed.mjs, migrate.mjs, regress.mjs
├── tests/                              # 7 berkas suite uji Vitest (stage1 s.d. stage5)
├── .env.example                        # Template variabel lingkungan
├── AGENTS.md                           # Batas workspace & keputusan teknis terkunci
├── BACKLOG.md                          # Status roadmap bertahap & handoff
└── CHANGELOG.md                        # Catatan perubahan tiap tahap
```

---

## Prasyarat & Konfigurasi Lingkungan

- **Node.js** >= 20 LTS dan **npm**
- Project **Supabase** (PostgreSQL 16 + Supabase Auth)

Salin `.env.example` menjadi `.env.local` lalu isi nilai sesuai project Anda:

```dotenv
# PostgreSQL runtime (wajib role plas_api tanpa BYPASSRLS; port 6543 Supavisor disarankan)
DATABASE_URL=postgresql://plas_api:CHANGE_ME@127.0.0.1:6543/postgres?uselibpqcompat=true&sslmode=require

# PostgreSQL admin (khusus scripts/migrate.mjs & scripts/regress.mjs, JANGAN dipakai runtime)
DATABASE_ADMIN_URL=postgresql://postgres:CHANGE_ME@127.0.0.1:5432/postgres

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# Opsional bila project masih memakai HS256 legacy; kosongkan jika memakai ECC P-256 JWKS
SUPABASE_JWT_SECRET=

# AI Learning Assistant (AI_PROVIDER: gemini | groq | mock)
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=qwen/qwen3.8-27b
AI_PENDING_TIMEOUT_MINUTES=5
```

> **Penting:** Jangan pernah meng-commit `.env.local` atau memaparkan `DATABASE_ADMIN_URL` / API key ke repository.

---

## Setup Database & Migrasi

1. Instal dependensi:
   ```bash
   npm install
   ```
2. Jalankan migrasi SQL (`001` s.d. `007`) ke database target menggunakan `DATABASE_ADMIN_URL`:
   ```bash
   npm run db:migrate
   ```
3. *(Opsional)* Regenerasi ulang seed konten resmi (`007_seed_official_content.sql`):
   ```bash
   npm run db:seed:generate
   ```

> **Peringatan `db:regress`:** Perintah `npm run db:regress` menjalankan `scripts/regress.mjs` yang melakukan `DROP SCHEMA public CASCADE` pada database target. Jalankan **hanya** pada scratch PostgreSQL database terpisah, **jangan** pada database Supabase Dev/Production.

---

## Menjalankan & Menguji Aplikasi

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan Next.js (`http://localhost:3000`) |
| `npm run build` | Membangun bundle produksi Next.js (`next build`) |
| `npm run start` | Menjalankan server produksi hasil build |
| `npm test` | Menjalankan seluruh suite unit, contract, white-box, & audit keamanan (`vitest run`) |
| `npm run typecheck` | Pemeriksaan tipe TypeScript ketat (`tsc --noEmit`) |
| `npm run lint` | Pemeriksaan lint ESLint (`eslint .`) |
| `npm run db:migrate` | Menjalankan migrasi SQL `supabase/migrations/001`–`007` |
| `npm run db:regress` | Uji regresi SQL `DBT-01`–`DBT-30` pada scratch DB terpisah |

### Cakupan Suite Uji (`tests/`)
- `tests/stage1-sql-seed.test.ts` — Validasi struktur migrasi SQL `001`–`007` & seed resmi.
- `tests/stage2-core-runtime.test.ts` — Unit test runtime (JWKS/JWT, SQLSTATE mapping, SHA-256 `payload_hash`, validasi Zod).
- `tests/stage2-student-api-contracts.test.ts` — Kontrak 15 endpoint mahasiswa (§4.1-§4.3, §4.6) & anti-bocor kunci jawaban.
- `tests/stage3-tests-and-ai-contracts.test.ts` — Kontrak 7 endpoint tes linear (§4.4), AI Socratic (§4.5), serta unit test `GroqAiProvider`.
- `tests/stage3-whitebox-basis-path.test.ts` — Uji White Box Basis Path (`P14`) evaluator FIB/MC, validator payload, & guardrail AI.
- `tests/stage4-lecturer-api-and-csv.test.ts` — Kontrak 8 endpoint dosen Read-Only (§5), sanitasi CSV, aturan `NULL != 0`, & kebersihan teks UI.
- `tests/stage5-security-audit.test.ts` — Audit keamanan statis `SEC-01`-`SEC-14` (`plas_api`, nihil `service_role` di `src/`, 30/30 route ber-JWT, guard `instrumentation.ts`).
