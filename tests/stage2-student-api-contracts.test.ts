import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import { ApiError } from "@/lib/http/errors";

const AUTH_STUDENT: AuthContext = {
  userId: "10000000-0000-4000-8000-000000000001",
  role: "authenticated",
  email: "mhs@undiksha.ac.id",
};

const MHS_ID = "20000000-0000-4000-8000-000000000001";
const KELAS_ID = "30000000-0000-4000-8000-000000000001";
const MAT_ID = "40000000-0000-4000-8000-000000000001";
const SUB_ID = "50000000-0000-4000-8000-000000000001";
const EX_ID = "60000000-0000-4000-8000-000000000001";
const Q_ID = "70000000-0000-4000-8000-000000000001";
const OPT_ID = "80000000-0000-4000-8000-000000000001";
const ATT_ID = "90000000-0000-4000-8000-000000000001";
const REQ_KEY = "a0000000-0000-4000-8000-000000000001";

let activeDbHandler: (sql: string, params?: unknown[]) => { rows: unknown[] };

vi.mock("@/lib/auth/verify-token", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/verify-token")>(
    "@/lib/auth/verify-token"
  );
  return {
    ...actual,
    authenticateRequest: vi.fn(async (req: Request) => {
      if (!req.headers.get("authorization")) {
        throw new ApiError(401, "unauthorized");
      }
      return AUTH_STUDENT;
    }),
  };
});

vi.mock("@/lib/db/pool", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/pool")>(
    "@/lib/db/pool"
  );
  return {
    ...actual,
    withUserTransaction: vi.fn(
      async <T>(_auth: AuthContext, fn: (db: DbClient) => Promise<T>) => {
        const fakeDb: DbClient = {
          query: async (sql: string, params?: unknown[]) =>
            activeDbHandler(sql, params) as never,
        };
        return fn(fakeDb);
      }
    ),
  };
});

import * as activitiesRoute from "@/app/api/activities/route";
import * as classesRoute from "@/app/api/classes/route";
import * as attemptAnswersRoute from "@/app/api/exercise-attempts/[attemptId]/answers/route";
import * as attemptDetailRoute from "@/app/api/exercise-attempts/[attemptId]/route";
import * as attemptSubmitRoute from "@/app/api/exercise-attempts/[attemptId]/submit/route";
import * as exerciseAttemptsRoute from "@/app/api/exercises/[exerciseId]/attempts/route";
import * as materialDetailRoute from "@/app/api/materials/[materialId]/route";
import * as materialsRoute from "@/app/api/materials/route";
import * as meClassRoute from "@/app/api/me/class/route";
import * as meRoute from "@/app/api/me/route";
import * as progressRoute from "@/app/api/progress/route";
import * as subMaterialExerciseRoute from "@/app/api/sub-materials/[submaterialId]/exercise/route";
import * as subMaterialDetailRoute from "@/app/api/sub-materials/[submaterialId]/route";

const FORBIDDEN_SECRET_KEYS = new Set([
  "correct_option_id",
  "correct_boolean",
  "correct_text",
  "correct_answer",
  "correct_answer_snapshot",
  "is_correct_option",
  "payload_hash",
  "auth_user_id",
]);

function assertNoSecretLeak(node: unknown, context: string): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) {
      assertNoSecretLeak(item, context);
    }
    return;
  }

  const obj = node as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    expect(
      FORBIDDEN_SECRET_KEYS.has(key),
      `Forbidden key "${key}" leaked in ${context}`
    ).toBe(false);
    // Option object must never carry is_correct (P5)
    if (key === "options" && Array.isArray(val)) {
      for (const opt of val) {
        if (opt && typeof opt === "object") {
          expect(
            "is_correct" in (opt as Record<string, unknown>),
            `Option leaked is_correct in ${context}`
          ).toBe(false);
        }
      }
    }
    assertNoSecretLeak(val, context);
  }
}

function authReq(
  url: string,
  init: RequestInit = {}
): Request {
  return new Request(url, {
    ...init,
    headers: {
      Authorization: "Bearer mock-jwt",
      ...(init.headers ?? {}),
    },
  });
}

describe("Tahap 2 — Kontrak 15 Endpoint Mahasiswa & Anti-Kebocoran Kunci (P13)", () => {
  beforeEach(() => {
    activeDbHandler = () => ({ rows: [] });
  });

  it("4.1 GET/POST /api/me, GET /api/classes, PATCH /api/me/class", async () => {
    const profileRow = {
      mahasiswa_id: MHS_ID,
      nama: "Ayu Pratami",
      nim: "2415051001",
      kelas_id: KELAS_ID,
      kelas_nama: "TypeScript A",
      kelas_kode: "TI-2A-2026",
      tahun_akademik: "2026/2027",
      semester: "Ganjil",
      dosen_nama: "Dr. Rina Kusuma",
      pre_test_submitted: false,
      remaining_ai_quota: 9,
    };

    // GET /api/me tanpa profil -> 404 profile_not_found
    const notFoundRes = await meRoute.GET(authReq("http://localhost/api/me"));
    expect(notFoundRes.status).toBe(404);
    expect(((await notFoundRes.json()) as { error: { code: string } }).error.code).toBe(
      "profile_not_found"
    );

    // POST /api/me -> 201 baru
    let profileExists = false;
    let capturedProfileSql = "";
    activeDbHandler = (sql) => {
      if (sql.includes("SELECT nim FROM public.mahasiswa")) {
        return { rows: profileExists ? [{ nim: "2415051001" }] : [] };
      }
      if (sql.includes("fn_upsert_student_profile")) {
        profileExists = true;
        return { rows: [{ mahasiswa_id: MHS_ID }] };
      }
      if (sql.includes("FROM public.mahasiswa m")) {
        capturedProfileSql = sql;
        return { rows: [profileRow] };
      }
      return { rows: [] };
    };

    const createRes = await meRoute.POST(
      authReq("http://localhost/api/me", {
        method: "POST",
        body: JSON.stringify({
          nama: "Ayu Pratami",
          nim: "2415051001",
          kelas_id: KELAS_ID,
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const createdJson = await createRes.json();
    assertNoSecretLeak(createdJson, "POST /api/me");
    expect(createdJson).toEqual({
      mahasiswa_id: MHS_ID,
      nama: "Ayu Pratami",
      nim: "2415051001",
      kelas: {
        kelas_id: KELAS_ID,
        nama: "TypeScript A",
        kode: "TI-2A-2026",
        tahun_akademik: "2026/2027",
        semester: "Ganjil",
        dosen_nama: "Dr. Rina Kusuma",
      },
      pre_test_submitted: false,
      remaining_ai_quota: 9,
    });

    // POST /api/me retry NIM sama -> 200 idempoten; NIM beda -> 409 nim_conflict
    const replayRes = await meRoute.POST(
      authReq("http://localhost/api/me", {
        method: "POST",
        body: JSON.stringify({ nama: "Ayu Pratami", nim: "2415051001" }),
      })
    );
    expect(replayRes.status).toBe(200);

    const conflictNimRes = await meRoute.POST(
      authReq("http://localhost/api/me", {
        method: "POST",
        body: JSON.stringify({ nama: "Ayu Pratami", nim: "9999999999" }),
      })
    );
    expect(conflictNimRes.status).toBe(409);
    expect(
      ((await conflictNimRes.json()) as { error: { code: string } }).error.code
    ).toBe("nim_conflict");

    // Pastikan GET /api/me mensyaratkan m.kelas_id IS NOT NULL untuk pre_test_submitted
    // agar mahasiswa tanpa kelas (dikeluarkan/kelas dihapus) tetap bisa re-join kelas baru.
    expect(capturedProfileSql).toContain("m.kelas_id IS NOT NULL AND EXISTS");

    // GET /api/classes
    activeDbHandler = () => ({
      rows: [
        {
          kelas_id: KELAS_ID,
          nama: "TypeScript A",
          kode: "TI-2A-2026",
          tahun_akademik: "2026/2027",
          semester: "Ganjil",
          dosen_nama: "Dr. Rina Kusuma",
        },
      ],
    });
    const classesRes = await classesRoute.GET(
      authReq("http://localhost/api/classes")
    );
    expect(classesRes.status).toBe(200);
    const classesJson = await classesRes.json();
    assertNoSecretLeak(classesJson, "GET /api/classes");
    expect(classesJson).toHaveLength(1);

    // PATCH /api/me/class -> DBR14 returns 409 class_locked
    activeDbHandler = () => {
      throw { code: "DBR14" };
    };
    const lockedRes = await meClassRoute.PATCH(
      authReq("http://localhost/api/me/class", {
        method: "PATCH",
        body: JSON.stringify({ kelas_id: KELAS_ID }),
      })
    );
    expect(lockedRes.status).toBe(409);
    expect(
      ((await lockedRes.json()) as { error: { code: string } }).error.code
    ).toBe("class_locked");
  });

  it("4.2 & 4.3 Materi, Exercise (tanpa explanation/kunci), Attempt, Answer, Submit, & Review", async () => {
    const safeQuestionRow = {
      question_id: Q_ID,
      sequence: 1,
      question_text: "Pilih blok kode TypeScript yang valid",
      question_type: "MC",
      hint: "Gunakan kurung kurawal",
      options: [
        { option_id: OPT_ID, text: "`{ let x = 1; }`", sequence: 1 },
      ],
    };

    // GET /api/materials
    activeDbHandler = () => ({
      rows: [
        {
          material_id: MAT_ID,
          sequence: 1,
          title: "Struktur Dasar Kode TypeScript",
          description: "Pengenalan statement",
          submaterial_count: 2,
          completed_exercises: 1,
        },
      ],
    });
    const matRes = await materialsRoute.GET(
      authReq("http://localhost/api/materials")
    );
    expect(matRes.status).toBe(200);
    const matJson = await matRes.json();
    assertNoSecretLeak(matJson, "GET /api/materials");
    expect(matJson[0]).toEqual({
      material_id: MAT_ID,
      sequence: 1,
      title: "Struktur Dasar Kode TypeScript",
      description: "Pengenalan statement",
      submaterial_count: 2,
      completed_exercises: 1,
    });

    // GET /api/materials/[materialId]
    activeDbHandler = (sql) => {
      if (sql.includes("FROM public.material")) {
        return {
          rows: [
            {
              material_id: MAT_ID,
              sequence: 1,
              title: "Struktur Dasar",
              description: "",
            },
          ],
        };
      }
      return {
        rows: [
          {
            submaterial_id: SUB_ID,
            sequence: 1,
            title: "Sub 1.1",
            has_submitted_exercise: false,
            attempts_used: 1,
          },
        ],
      };
    };
    const matDetRes = await materialDetailRoute.GET(
      authReq(`http://localhost/api/materials/${MAT_ID}`),
      { params: Promise.resolve({ materialId: MAT_ID }) }
    );
    expect(matDetRes.status).toBe(200);
    const matDetJson = await matDetRes.json();
    assertNoSecretLeak(matDetJson, "GET /api/materials/[id]");
    expect(matDetJson.submaterials[0].max_attempts).toBe(3);

    // GET /api/sub-materials/[submaterialId]
    activeDbHandler = () => ({
      rows: [
        {
          submaterial_id: SUB_ID,
          material_id: MAT_ID,
          sequence: 1,
          title: "Sub 1.1",
          content_markdown: "# Hello",
          exercise_id: EX_ID,
          exercise_title: "Latihan 1.1",
          question_type: "MC",
          latest_attempt_status: "SUBMITTED",
          attempts_used: 1,
          best_score: "100.00",
        },
      ],
    });
    const subRes = await subMaterialDetailRoute.GET(
      authReq(`http://localhost/api/sub-materials/${SUB_ID}`),
      { params: Promise.resolve({ submaterialId: SUB_ID }) }
    );
    expect(subRes.status).toBe(200);
    const subJson = await subRes.json();
    assertNoSecretLeak(subJson, "GET /api/sub-materials/[id]");
    expect(subJson.content_markdown).toBe("# Hello");
    expect(subJson.exercise.best_score).toBe(100);
    expect(subJson.exercise.remaining_attempts).toBe(2);

    // GET /api/sub-materials/[submaterialId]/exercise (TANPA explanation!)
    activeDbHandler = (sql) => {
      if (sql.includes("FROM public.exercise")) {
        return {
          rows: [
            {
              exercise_id: EX_ID,
              submaterial_id: SUB_ID,
              title: "Latihan 1.1",
              question_type: "MC",
            },
          ],
        };
      }
      return { rows: [safeQuestionRow] };
    };
    const exRes = await subMaterialExerciseRoute.GET(
      authReq(`http://localhost/api/sub-materials/${SUB_ID}/exercise`),
      { params: Promise.resolve({ submaterialId: SUB_ID }) }
    );
    expect(exRes.status).toBe(200);
    const exJson = (await exRes.json()) as {
      questions: Array<Record<string, unknown>>;
    };
    assertNoSecretLeak(exJson, "GET .../exercise");
    expect("explanation" in exJson.questions[0]!).toBe(false);

    // POST /api/exercises/[exerciseId]/attempts (201 baru vs 200 replay)
    let isReplay = false;
    activeDbHandler = (sql) => {
      if (sql.includes("fn_create_exercise_attempt")) {
        return {
          rows: [
            {
              attempt_id: ATT_ID,
              exercise_id: EX_ID,
              attempt_number: 1,
              status: "IN_PROGRESS",
              score: null,
              started_at: new Date("2026-11-22T01:00:00Z"),
              submitted_at: null,
              is_replay: isReplay,
            },
          ],
        };
      }
      return { rows: [safeQuestionRow] };
    };
    const createAttRes = await exerciseAttemptsRoute.POST(
      authReq(`http://localhost/api/exercises/${EX_ID}/attempts`, {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
      }),
      { params: Promise.resolve({ exerciseId: EX_ID }) }
    );
    expect(createAttRes.status).toBe(201);
    const attJson = await createAttRes.json();
    assertNoSecretLeak(attJson, "POST /api/exercises/[id]/attempts");
    expect(attJson.attempt_number).toBe(1);
    expect(attJson.questions).toHaveLength(1);

    isReplay = true;
    const replayAttRes = await exerciseAttemptsRoute.POST(
      authReq(`http://localhost/api/exercises/${EX_ID}/attempts`, {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
      }),
      { params: Promise.resolve({ exerciseId: EX_ID }) }
    );
    expect(replayAttRes.status).toBe(200);

    // GET /api/exercises/[exerciseId]/attempts
    activeDbHandler = (sql) => {
      if (sql.includes("SELECT 1 AS exists")) return { rows: [{ exists: 1 }] };
      return {
        rows: [
          {
            attempt_id: ATT_ID,
            exercise_id: EX_ID,
            attempt_number: 1,
            status: "SUBMITTED",
            score: "100.00",
            started_at: "2026-11-22T01:00:00Z",
            submitted_at: "2026-11-22T01:05:00Z",
          },
        ],
      };
    };
    const listAttRes = await exerciseAttemptsRoute.GET(
      authReq(`http://localhost/api/exercises/${EX_ID}/attempts`),
      { params: Promise.resolve({ exerciseId: EX_ID }) }
    );
    expect(listAttRes.status).toBe(200);
    const listAttJson = (await listAttRes.json()) as Array<{ score: number }>;
    expect(typeof listAttJson[0]!.score).toBe("number");
    expect(listAttJson[0]!.score).toBe(100);

    // POST /api/exercise-attempts/[attemptId]/answers
    activeDbHandler = () => ({
      rows: [
        {
          attempt_id: ATT_ID,
          question_id: Q_ID,
          is_correct: true,
          explanation: "Pembahasan konsep",
          hint: "Gunakan kurung kurawal",
          answered_at: "2026-11-22T01:02:00Z",
        },
      ],
    });
    const ansRes = await attemptAnswersRoute.POST(
      authReq(`http://localhost/api/exercise-attempts/${ATT_ID}/answers`, {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
        body: JSON.stringify({
          question_id: Q_ID,
          answer: { option_id: OPT_ID },
          time_spent_seconds: 15,
        }),
      }),
      { params: Promise.resolve({ attemptId: ATT_ID }) }
    );
    expect(ansRes.status).toBe(200);
    const ansJson = await ansRes.json();
    assertNoSecretLeak(ansJson, "POST .../answers");
    expect(ansJson.is_correct).toBe(true);

    // POST /api/exercise-attempts/[attemptId]/submit
    activeDbHandler = () => ({
      rows: [
        {
          attempt_id: ATT_ID,
          exercise_id: EX_ID,
          attempt_number: 1,
          status: "SUBMITTED",
          score: "100.00",
          started_at: "2026-11-22T01:00:00Z",
          submitted_at: "2026-11-22T01:05:00Z",
        },
      ],
    });
    const submitRes = await attemptSubmitRoute.POST(
      authReq(`http://localhost/api/exercise-attempts/${ATT_ID}/submit`, {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
      }),
      { params: Promise.resolve({ attemptId: ATT_ID }) }
    );
    expect(submitRes.status).toBe(200);
    expect(((await submitRes.json()) as { score: number }).score).toBe(100);

    // GET /api/exercise-attempts/[attemptId]: IN_PROGRESS tidak boleh kirim explanation
    let attemptStatus = "IN_PROGRESS";
    activeDbHandler = (sql) => {
      if (sql.includes("FROM public.exercise_attempt ea")) {
        return {
          rows: [
            {
              attempt_id: ATT_ID,
              exercise_id: EX_ID,
              exercise_title: "Latihan 1.1",
              attempt_number: 1,
              status: attemptStatus,
              score: attemptStatus === "SUBMITTED" ? "100.00" : null,
              started_at: "2026-11-22T01:00:00Z",
              submitted_at:
                attemptStatus === "SUBMITTED" ? "2026-11-22T01:05:00Z" : null,
            },
          ],
        };
      }
      return {
        rows: [
          {
            question_id: Q_ID,
            sequence: 1,
            question_text: "Pilih blok kode",
            question_type: "MC",
            options: [{ option_id: OPT_ID, text: "A", sequence: 1 }],
            student_answer: { option_id: OPT_ID },
            is_correct: true,
            explanation: attemptStatus === "SUBMITTED" ? "Penjelasan" : null,
            hint: "Hint",
            time_spent_seconds: 12,
          },
        ],
      };
    };

    const inProgDetailRes = await attemptDetailRoute.GET(
      authReq(`http://localhost/api/exercise-attempts/${ATT_ID}`),
      { params: Promise.resolve({ attemptId: ATT_ID }) }
    );
    const inProgJson = (await inProgDetailRes.json()) as {
      items: Array<{ explanation: string | null }>;
    };
    assertNoSecretLeak(inProgJson, "GET attempt detail IN_PROGRESS");
    expect(inProgJson.items[0]!.explanation).toBeNull();

    attemptStatus = "SUBMITTED";
    const subDetailRes = await attemptDetailRoute.GET(
      authReq(`http://localhost/api/exercise-attempts/${ATT_ID}`),
      { params: Promise.resolve({ attemptId: ATT_ID }) }
    );
    const subDetailJson = (await subDetailRes.json()) as {
      score: number;
      items: Array<{ explanation: string | null }>;
    };
    assertNoSecretLeak(subDetailJson, "GET attempt detail SUBMITTED");
    expect(subDetailJson.score).toBe(100);
    expect(subDetailJson.items[0]!.explanation).toBe("Penjelasan");
  });

  it("4.6 GET /api/progress dan GET /api/activities cocok dengan DTO plasmobile", async () => {
    activeDbHandler = (sql) => {
      if (sql.includes("SELECT mahasiswa_id FROM public.mahasiswa")) {
        return { rows: [{ mahasiswa_id: MHS_ID }] };
      }
      if (sql.includes("WITH mat_status")) {
        return {
          rows: [
            {
              total_materials: 7,
              completed_materials: 7,
              total_exercises: 20,
              completed_exercises: 20,
            },
          ],
        };
      }
      if (sql.includes("FROM public.test t")) {
        return {
          rows: [
            { test_type: "PRE", test_status: "SUBMITTED", test_score: "85.00" },
            { test_type: "POST", test_status: "NOT_STARTED", test_score: null },
          ],
        };
      }
      if (sql.includes("AS usage_date")) {
        return { rows: [{ usage_date: "2026-11-22", remaining_quota: 8 }] };
      }
      return { rows: [] };
    };

    const progRes = await progressRoute.GET(
      authReq("http://localhost/api/progress")
    );
    expect(progRes.status).toBe(200);
    const progJson = await progRes.json();
    assertNoSecretLeak(progJson, "GET /api/progress");
    expect(progJson).toEqual({
      completed_materials: 7,
      total_materials: 7,
      completed_exercises: 20,
      total_exercises: 20,
      pre_test_status: "SUBMITTED",
      pre_test_score: 85,
      post_test_status: "NOT_STARTED",
      post_test_score: null,
      is_post_test_eligible: true,
      ai_quota: {
        remaining_quota: 8,
        daily_limit: 10,
        usage_date: "2026-11-22",
      },
    });

    activeDbHandler = (sql) => {
      if (sql.includes("SELECT mahasiswa_id FROM public.mahasiswa")) {
        return { rows: [{ mahasiswa_id: MHS_ID }] };
      }
      return {
        rows: [
          {
            attempt_id: ATT_ID,
            exercise_id: EX_ID,
            material_title: "Struktur Dasar Kode TypeScript",
            submaterial_title: "Mengenal Pernyataan",
            question_type: "MC",
            attempt_number: 1,
            status: "SUBMITTED",
            score: "100.00",
            created_at: "2026-11-22T01:00:00Z",
            submitted_at: "2026-11-22T01:05:00Z",
          },
        ],
      };
    };

    const actRes = await activitiesRoute.GET(
      authReq("http://localhost/api/activities")
    );
    expect(actRes.status).toBe(200);
    const actJson = (await actRes.json()) as Array<Record<string, unknown>>;
    assertNoSecretLeak(actJson, "GET /api/activities");
    expect(actJson[0]!).toEqual({
      attempt_id: ATT_ID,
      exercise_id: EX_ID,
      material_title: "Struktur Dasar Kode TypeScript",
      submaterial_title: "Mengenal Pernyataan",
      question_type: "MC",
      attempt_number: 1,
      status: "SUBMITTED",
      score: 100,
      created_at: "2026-11-22T01:00:00.000Z",
      submitted_at: "2026-11-22T01:05:00.000Z",
    });
  });
});
