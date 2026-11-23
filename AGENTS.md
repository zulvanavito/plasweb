# AGENTS.md — `plasweb` (PLAS-TypeScript Web & Backend REST API)

## Batas Workspace Ketat
- **Writable:** `D:\01 Projects\plasweb\`
- **STRICTLY READ-ONLY (DILARANG DIUBAH):**
  - `C:\Users\shawn\Documents\Secondbrain\01 Projects\PLAS\` (Blueprint acuan)
  - `D:\01 Projects\plasmobile\` (Client mobile acuan kontrak DTO & repository)

## Keputusan Teknis Terkunci
1. **Package manager:** `npm`
2. **Stack:** Next.js App Router + React 19 + TypeScript (`strict: true`) + Tailwind CSS v4 + Zod + Vitest
3. **Database client:** `pg` (`node-postgres` murni tanpa ORM) — transaksi eksplisit `BEGIN` + `SET LOCAL request.jwt.claims`
4. **LLM Provider:** Google Gemini (`gemini-2.5-flash` via `@google/genai`), Groq (`AI_PROVIDER=groq`, default `qwen/qwen3.8-27b` via native `fetch` dengan pembersihan blok `<think>...</think>`), serta adapter `mock` deterministik untuk uji lokal
5. **Normalisasi FIB:** `trim + lowercase + collapse whitespace` (`regexp_replace(lower(btrim(text)), '\s+', ' ', 'g')`), selaras `levenshtein.dart` agar kunci operator `-` tetap valid

## Aturan Arsitektur & Keamanan Wajib
- **Single-Entry REST API:** Seluruh data Mobile (`plasmobile`) & Web Dosen melalui `/api/*`. Tidak ada akses langsung client ke tabel Supabase (`anon`/`authenticated` di-REVOKE).
- **Least Privilege PostgreSQL (`P4`):** Pool server menggunakan role `plas_api` (`NOBYPASSRLS`) dengan `SET LOCAL request.jwt.claims` di dalam transaksi. **Dilarang** memakai `service_role` untuk request pengguna normal.
- **Anti-Kebocoran Kunci Jawaban (`P13`):** Endpoint/DTO mahasiswa dan prompt LLM **tidak pernah** menerima kunci jawaban (`correct_*`, `correct_answer_snapshot`, atau `explanation` sebelum submit). Kunci jawaban hanya diproyeksikan khusus endpoint Read-Only dosen (`/api/lecturer/*`) untuk kelas yang diampu.
- **Web Dashboard Dosen Read-Only:** Tepat 3 menu sidebar (`Dashboard`, `Data Kelas`, `Aktivitas Pembelajaran`), tanpa operasi CRUD kelas/materi/soal/mahasiswa dan tanpa AI di web. Ikuti `DESIGN.md v1.1` (Light Mode Academic Code & Paper, zero emoji, zero em-dash `U+2014`, zero placeholder ikon teks ASCII).
- **Ponytail Discipline:** Solusi paling ringkas dan langsung tanpa abstraksi/dependency berlebih; setiap logika non-trivial wajib punya test.
