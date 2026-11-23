import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT_DIR, "supabase", "migrations");

function readMigration(filename: string): string {
  return fs
    .readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8")
    .replace(/\r\n/g, "\n");
}

function normalizeFib(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[b.length]!;
}

function evaluateFib(studentAnswer: string, expectedAnswer: string): boolean {
  if (studentAnswer.length > 255) return false;
  const a = normalizeFib(studentAnswer);
  const b = normalizeFib(expectedAnswer);
  if (a.length === 0 && b.length === 0) return true;
  if (a.length === 0 || b.length === 0) return false;
  const similarity = 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);
  return similarity >= 0.7;
}

describe("Tahap 1 — Migrasi SQL & Seed Resmi PLAS-TypeScript", () => {
  it("memiliki 9 berkas migrasi terurut 001 sampai 009", () => {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    expect(files).toEqual([
      "001_schema_v03.sql",
      "002_triggers_g1.sql",
      "003_functions_triggers_g2_exercise.sql",
      "004_functions_triggers_g3_test.sql",
      "005_functions_triggers_g4_ai.sql",
      "006_rls_grants_p4.sql",
      "007_seed_official_content.sql",
      "008_lecturer_class_crud.sql",
      "009_lecturer_ai_usage_rls.sql",
    ]);
  });

  it("001_schema_v03 mendefinisikan tepat 16 tabel tanpa EXPIRED dan tanpa is_correct", () => {
    const ddl = readMigration("001_schema_v03.sql");
    const tables = [...ddl.matchAll(/CREATE TABLE public\.([a-z_]+)\s*\(/g)].map(
      (m) => m[1]
    );

    expect(tables).toEqual([
      "material",
      "sub_material",
      "mahasiswa",
      "dosen",
      "kelas",
      "exercise",
      "exercise_question",
      "exercise_question_option",
      "exercise_attempt",
      "exercise_answer",
      "test",
      "test_question",
      "test_question_option",
      "test_attempt",
      "test_answer",
      "ai_usage",
    ]);
    expect(ddl).not.toMatch(/EXPIRED/);
    expect(ddl).not.toMatch(/\bis_correct\b\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT/i);
    expect(ddl).toContain("finalization_request_id UUID UNIQUE");
    expect(ddl).toContain("answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    expect(ddl).toContain("payload_hash TEXT NOT NULL");
    expect(ddl).toContain("DEFERRABLE INITIALLY DEFERRED");
  });

  it("002-005 mencakup seluruh 21 SQLSTATE, normalisasi FIB aman untuk '-', dan search_path aman", () => {
    const combined = [
      readMigration("002_triggers_g1.sql"),
      readMigration("003_functions_triggers_g2_exercise.sql"),
      readMigration("004_functions_triggers_g3_test.sql"),
      readMigration("005_functions_triggers_g4_ai.sql"),
    ].join("\n");

    const expectedSqlStates = [
      "DBR03",
      "DBR04",
      "DBR05",
      "DBR06",
      "DBR07",
      "DBR08",
      "DBR10",
      "DBR11",
      "DBR13",
      "DBR14",
      "DBR15",
      "ID001",
      "AN001",
      "OP001",
      "AU001",
      "ST001",
      "ST002",
      "ST003",
      "ST004",
      "ST005",
      "TE001",
    ];

    for (const code of expectedSqlStates) {
      expect(combined, `SQLSTATE ${code} harus ada`).toContain(`'${code}'`);
    }

    // Pastikan normalisasi FIB tidak menghapus karakter operator '-'
    const g2 = readMigration("003_functions_triggers_g2_exercise.sql");
    expect(g2).toContain("regexp_replace(lower(btrim(COALESCE(p_text, ''))), '\\s+', ' ', 'g')");
    expect(g2).not.toContain("[.,;:!?\"'()-]");

    // Pastikan setiap fungsi SECURITY DEFINER mengunci search_path
    const secDefMatches = [
      ...combined.matchAll(/SECURITY DEFINER[\s\S]{0,120}?AS \$\$/g),
    ].map((m) => m[0]);
    expect(secDefMatches.length).toBeGreaterThanOrEqual(15);
    for (const block of secDefMatches) {
      expect(block).toContain("SET search_path = public, extensions, pg_temp");
    }
  });

  it("006_rls_grants_p4 menerapkan model akses P4 (plas_api NOBYPASSRLS, revoke client, RLS 16 tabel)", () => {
    const rls = readMigration("006_rls_grants_p4.sql");
    expect(rls).toContain("NOINHERIT NOBYPASSRLS");
    expect(rls).toContain("fn_current_dosen_id()");
    expect(rls).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon");
    expect(rls).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated");
    expect(rls).toContain("ENABLE ROW LEVEL SECURITY");
    expect(rls).toContain("kelas_id IS NOT NULL");
    expect(rls).not.toMatch(/GRANT\s+(INSERT|UPDATE|DELETE)\s+ON\s+public\./i);
  });

  it("007_seed_official_content memuat persis 7 materi, 20 submateri, 20 exercise (33 soal, 56 opsi), dan 20 PRE + 20 POST dengan kunci MC valid", () => {
    const seed = readMigration("007_seed_official_content.sql");
    expect(seed.startsWith("--")).toBe(true);
    expect(seed).toContain("\nBEGIN;\n");
    expect(seed.trim().endsWith("COMMIT;")).toBe(true);

    const count = (table: string) =>
      [...seed.matchAll(new RegExp(`INSERT INTO public\\.${table}\\b`, "g"))].length;

    expect(count("material")).toBe(7);
    expect(count("sub_material")).toBe(20);
    expect(count("exercise")).toBe(20);
    expect(count("exercise_question")).toBe(33);
    expect(count("exercise_question_option")).toBe(56);
    expect(count("test")).toBe(2);
    expect(count("test_question")).toBe(40);
    expect(count("test_question_option")).toBe(56);
  });

  it("validasi referensi kunci MC pada seed serta uji batas FIB 0.70 / 0.60 dan kunci '-'", () => {
    const seed = readMigration("007_seed_official_content.sql");

    // Kumpulkan seluruh option ID exercise dan test
    const exOptIds = new Set(
      [
        ...seed.matchAll(
          /INSERT INTO public\.exercise_question_option[\s\S]*?VALUES \('([0-9a-f-]{36})'/g
        ),
      ].map((m) => m[1])
    );
    const testOptIds = new Set(
      [
        ...seed.matchAll(
          /INSERT INTO public\.test_question_option[\s\S]*?VALUES \('([0-9a-f-]{36})'/g
        ),
      ].map((m) => m[1])
    );

    // Periksa setiap correct_option_id pada soal MC exercise & test benar-benar ada
    const exCorrectOpts = [
      ...seed.matchAll(
        /INSERT INTO public\.exercise_question[\s\S]*?'MC', '([0-9a-f-]{36})'/g
      ),
    ].map((m) => m[1]);
    expect(exCorrectOpts.length).toBe(14);
    for (const id of exCorrectOpts) {
      expect(exOptIds.has(id)).toBe(true);
    }

    const testCorrectOpts = [
      ...seed.matchAll(
        /INSERT INTO public\.test_question \(test_question_id, test_id, question_type, question_text, correct_option_id,[\s\S]*?'([0-9a-f-]{36})', NULL, NULL, \d+\)/g
      ),
    ].map((m) => m[1]);
    expect(testCorrectOpts.length).toBe(14);
    for (const id of testCorrectOpts) {
      expect(testOptIds.has(id)).toBe(true);
    }

    // Uji batas FIB Levenshtein & operator '-'
    expect(evaluateFib("-", "-")).toBe(true);
    expect(evaluateFib("  -  ", "-")).toBe(true);
    expect(evaluateFib("  ELSE   IF ", "else if")).toBe(true);
    expect(evaluateFib("abcdefghij", "abcdefgxxx")).toBe(true); // 0.70 tepat
    expect(evaluateFib("abcdefghij", "abcdefxxxx")).toBe(false); // 0.60 ditolak
    expect(evaluateFib("a".repeat(256), "a")).toBe(false);
  });

  it("008_lecturer_class_crud mendefinisikan RPC CRUD kelas dosen yang aman dan merelaksasi DBR-14 saat kelas_id IS NULL", () => {
    const m008 = readMigration("008_lecturer_class_crud.sql");

    expect(m008).toContain("OLD.kelas_id IS NOT NULL");
    expect(m008).toContain("NEW.kelas_id IS NOT NULL");
    expect(m008).toContain("fn_g1_kelas_lock()");

    const rpcNames = [
      "fn_lecturer_create_class",
      "fn_lecturer_update_class",
      "fn_lecturer_delete_class",
      "fn_lecturer_remove_student_from_class",
    ];
    for (const fnName of rpcNames) {
      expect(m008).toContain(fnName);
    }

    const secDefBlocks = [
      ...m008.matchAll(/SECURITY DEFINER[\s\S]{0,120}?AS \$\$/g),
    ].map((m) => m[0]);
    expect(secDefBlocks).toHaveLength(5);
    for (const block of secDefBlocks) {
      expect(block).toContain("SET search_path = public, extensions, pg_temp");
    }

    expect(m008).toContain("TO plas_api;");
    expect(m008).not.toMatch(/GRANT\s+(INSERT|UPDATE|DELETE)\s+ON\s+public\./i);
  });

  it("009_lecturer_ai_usage_rls membatasi SELECT ai_usage dosen hanya pada mahasiswa berkelas yang diampu", () => {
    const m009 = readMigration("009_lecturer_ai_usage_rls.sql");

    expect(m009).toContain("ON public.ai_usage");
    expect(m009).toContain("FOR SELECT TO plas_api");
    expect(m009).toContain("m.kelas_id IS NOT NULL");
    expect(m009).toContain("public.fn_current_dosen_id()");
    expect(m009).toContain("public.fn_request_auth_uid()");
    expect(m009).not.toMatch(/GRANT\s+(INSERT|UPDATE|DELETE)\s+ON\s+public\./i);
  });
});
