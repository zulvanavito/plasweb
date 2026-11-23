import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import { ApiError } from "@/lib/http/errors";
import {
  buildEvaluationsCsv,
  sanitizeCsvCell,
} from "@/lib/services/lecturer-csv";

const AUTH_USER: AuthContext = {
  userId: "10000000-0000-4000-8000-000000000099",
  role: "authenticated",
  email: "dosen@undiksha.ac.id",
};

const DOSEN_ID = "d0000000-0000-4000-8000-000000000001";
const KELAS_A_ID = "30000000-0000-4000-8000-000000000001";
const OTHER_KELAS_ID = "30000000-0000-4000-8000-000000000999";
const MHS_1_ID = "20000000-0000-4000-8000-000000000001";
const MHS_2_ID = "20000000-0000-4000-8000-000000000002";
const OTHER_MHS_ID = "20000000-0000-4000-8000-000000000999";
const MAT_1_ID = "40000000-0000-4000-8000-000000000001";
const EX_1_ID = "60000000-0000-4000-8000-000000000001";
const EX_ATT_ID = "90000000-0000-4000-8000-000000000001";
const OTHER_EX_ATT_ID = "90000000-0000-4000-8000-000000000999";
const Q_1_ID = "70000000-0000-4000-8000-000000000001";
const Q_2_ID = "70000000-0000-4000-8000-000000000002";
const OPT_A_ID = "80000000-0000-4000-8000-000000000001";
const OPT_B_ID = "80000000-0000-4000-8000-000000000002";
const PRE_ATT_ID = "91000000-0000-4000-8000-000000000001";
const POST_ATT_ID = "91000000-0000-4000-8000-000000000002";

let capturedQueries: Array<{ sql: string; params: unknown[] | undefined }> = [];
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
      return AUTH_USER;
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
          query: async (sql: string, params?: unknown[]) => {
            capturedQueries.push({ sql, params });
            return activeDbHandler(sql, params) as never;
          },
        };
        return fn(fakeDb);
      }
    ),
  };
});

import * as lecturerActivitiesRoute from "@/app/api/lecturer/activities/route";
import * as lecturerActivityDetailRoute from "@/app/api/lecturer/activities/[attemptId]/route";
import * as lecturerClassDetailRoute from "@/app/api/lecturer/classes/[kelasId]/route";
import * as lecturerClassStudentRoute from "@/app/api/lecturer/classes/[kelasId]/students/[mahasiswaId]/route";
import * as lecturerClassesRoute from "@/app/api/lecturer/classes/route";
import * as lecturerDashboardRoute from "@/app/api/lecturer/dashboard/route";
import * as lecturerEvaluationDetailRoute from "@/app/api/lecturer/evaluations/[mahasiswaId]/route";
import * as lecturerEvaluationsExportRoute from "@/app/api/lecturer/evaluations/export/route";
import * as lecturerEvaluationsRoute from "@/app/api/lecturer/evaluations/route";

function authReq(url: string, withToken = true): Request {
  const headers: Record<string, string> = {};
  if (withToken) {
    headers.authorization = "Bearer dev-lecturer-token";
  }
  return new Request(url, { method: "GET", headers });
}

function defaultLecturerHandler(
  sql: string,
  params?: unknown[]
): { rows: unknown[] } {
  if (sql.includes("FROM public.dosen") && sql.includes("WHERE auth_user_id")) {
    return {
      rows: [
        {
          dosen_id: DOSEN_ID,
          nidn: "0011223344",
          nama: "Dr. Putu Dosen",
          email: "dosen@undiksha.ac.id",
        },
      ],
    };
  }

  if (sql.includes("SELECT 1 AS exists") && sql.includes("FROM public.kelas")) {
    const kelasId = params?.[0];
    return {
      rows: kelasId === KELAS_A_ID ? [{ exists: 1 }] : [],
    };
  }

  if (
    sql.includes("SELECT kode FROM public.kelas WHERE kelas_id = $1 AND dosen_id = $2")
  ) {
    const kelasId = params?.[0];
    return {
      rows: kelasId === KELAS_A_ID ? [{ kode: "TI-2A-2026" }] : [],
    };
  }

  if (sql.includes("SELECT kelas_id, nama, kode") && sql.includes("FROM public.kelas")) {
    return {
      rows: [
        {
          kelas_id: KELAS_A_ID,
          nama: "TI 2A Struktur Data",
          kode: "TI-2A-2026",
        },
      ],
    };
  }

  if (sql.includes("AS total_students") && sql.includes("AS total_classes")) {
    return {
      rows: [{ total_students: 2, total_classes: 1 }],
    };
  }

  if (sql.includes("AS total_exercise_attempts")) {
    return {
      rows: [
        {
          total_exercise_attempts: 3,
          submitted_count: 2,
          in_progress_count: 1,
        },
      ],
    };
  }

  if (sql.includes("WITH scoped_students AS")) {
    return {
      rows: [
        {
          total_test_attempts: 3,
          pre_submitted_count: 2,
          post_submitted_count: 1,
          avg_pre_score: "70.00",
          avg_post_score: "85.00",
          paired_count: 1,
          paired_avg_pre_score: "70.00",
          paired_avg_post_score: "85.00",
        },
      ],
    };
  }

  if (sql.includes("WITH combined AS")) {
    return {
      rows: [
        {
          date: "2026-11-20",
          exercise_attempts: 2,
          test_attempts: 1,
        },
      ],
    };
  }

  if (sql.includes("ORDER BY recent.timestamp DESC")) {
    return {
      rows: [
        {
          id: EX_ATT_ID,
          kind: "EXERCISE",
          student_name: "Budi",
          student_nim: "2415051001",
          kelas_kode: "TI-2A-2026",
          title: "Latihan 1.1",
          status: "SUBMITTED",
          score: "80.00",
          timestamp: "2026-11-20T05:00:00.000Z",
        },
        {
          id: PRE_ATT_ID,
          kind: "TEST",
          student_name: "Sari",
          student_nim: "2415051002",
          kelas_kode: "TI-2A-2026",
          title: "Pre-Test",
          status: "IN_PROGRESS",
          score: "0.00",
          timestamp: "2026-11-20T04:00:00.000Z",
        },
      ],
    };
  }

  if (sql.includes("SELECT DISTINCT tahun_akademik, semester")) {
    return {
      rows: [{ tahun_akademik: "2025/2026", semester: "Genap" }],
    };
  }

  if (
    sql.includes("JOIN public.dosen d ON d.dosen_id = k.dosen_id") &&
    sql.includes("WHERE k.kelas_id = $1")
  ) {
    const kelasId = params?.[0];
    return {
      rows:
        kelasId === KELAS_A_ID
          ? [
              {
                kelas_id: KELAS_A_ID,
                nama: "TI 2A Struktur Data",
                kode: "TI-2A-2026",
                tahun_akademik: "2025/2026",
                semester: "Genap",
                dosen_nama: "Dr. Putu Dosen",
                student_count: 2,
              },
            ]
          : [],
    };
  }

  if (sql.includes("JOIN public.dosen d ON d.dosen_id = k.dosen_id")) {
    return {
      rows: [
        {
          kelas_id: KELAS_A_ID,
          nama: "TI 2A Struktur Data",
          kode: "TI-2A-2026",
          tahun_akademik: "2025/2026",
          semester: "Genap",
          dosen_nama: "Dr. Putu Dosen",
          student_count: 2,
        },
      ],
    };
  }

  if (sql.includes("WHERE m.kelas_id = $1")) {
    return {
      rows: [
        {
          mahasiswa_id: MHS_1_ID,
          nama: "Budi",
          nim: "2415051001",
          exercise_attempts_count: 2,
          submitted_exercises_count: 1,
          avg_exercise_score: "80.00",
          pre_test_status: "SUBMITTED",
          pre_test_score: "70.00",
          post_test_status: "SUBMITTED",
          post_test_score: "85.00",
        },
        {
          mahasiswa_id: MHS_2_ID,
          nama: "Sari",
          nim: "2415051002",
          exercise_attempts_count: 0,
          submitted_exercises_count: 0,
          avg_exercise_score: null,
          pre_test_status: "NOT_STARTED",
          pre_test_score: null,
          post_test_status: "IN_PROGRESS",
          post_test_score: "0.00",
        },
      ],
    };
  }

  if (sql.includes("FROM public.material ORDER BY sequence ASC")) {
    return {
      rows: [{ material_id: MAT_1_ID, sequence: 1, title: "Pointer Dasar" }],
    };
  }

  if (sql.includes("AS attempt_count") && sql.includes("FROM public.material mat")) {
    return {
      rows: [
        {
          material_id: MAT_1_ID,
          sequence: 1,
          title: "Pointer Dasar",
          attempt_count: 2,
          submitted_count: 1,
        },
      ],
    };
  }

  if (
    sql.includes("ea.exercise_attempt_id AS attempt_id") &&
    sql.includes("ORDER BY ea.started_at DESC")
  ) {
    return {
      rows: [
        {
          attempt_id: EX_ATT_ID,
          mahasiswa_id: MHS_1_ID,
          student_name: "Budi",
          student_nim: "2415051001",
          kelas_id: KELAS_A_ID,
          kelas_kode: "TI-2A-2026",
          material_id: MAT_1_ID,
          material_sequence: 1,
          material_title: "Pointer Dasar",
          submaterial_title: "Alamat Memori",
          exercise_title: "Latihan 1.1",
          question_type: "FIB",
          attempt_number: 1,
          status: "SUBMITTED",
          score: "100.00",
          started_at: "2026-11-20T04:00:00.000Z",
          submitted_at: "2026-11-20T04:05:00.000Z",
        },
      ],
    };
  }

  if (sql.includes("WHERE ea.exercise_attempt_id = $1")) {
    const attemptId = params?.[0];
    return {
      rows:
        attemptId === EX_ATT_ID
          ? [
              {
                attempt_id: EX_ATT_ID,
                exercise_id: EX_1_ID,
                student_name: "Budi",
                student_nim: "2415051001",
                kelas_nama: "TI 2A Struktur Data",
                kelas_kode: "TI-2A-2026",
                material_title: "Pointer Dasar",
                submaterial_title: "Alamat Memori",
                exercise_title: "Latihan 1.1",
                question_type: "FIB",
                attempt_number: 1,
                status: "SUBMITTED",
                score: "100.00",
                started_at: "2026-11-20T04:00:00.000Z",
                submitted_at: "2026-11-20T04:05:00.000Z",
              },
            ]
          : [],
    };
  }

  if (sql.includes("FROM public.exercise_question q")) {
    return {
      rows: [
        {
          question_id: Q_1_ID,
          sequence: 1,
          question_text: "Operator dereference di C++ adalah?",
          question_type: "FIB",
          options: [],
          student_answer: { value: "*" },
          correct_answer_snapshot: { value: "*" },
          correct_option_id: null,
          correct_boolean: null,
          correct_text: "*",
          is_correct: true,
          explanation: "Operator * membaca nilai pada alamat pointer.",
          time_spent_seconds: 18,
        },
        {
          question_id: Q_2_ID,
          sequence: 2,
          question_text: "Ukuran pointer bergantung pada arsitektur?",
          question_type: "MC",
          options: [
            { option_id: OPT_A_ID, text: "Benar, 32-bit/64-bit", sequence: 1 },
            { option_id: OPT_B_ID, text: "Selalu 2 byte", sequence: 2 },
          ],
          student_answer: { option_id: OPT_A_ID },
          correct_answer_snapshot: null,
          correct_option_id: OPT_A_ID,
          correct_boolean: null,
          correct_text: null,
          is_correct: true,
          explanation: "Arsitektur 64-bit memakai 8 byte untuk pointer.",
          time_spent_seconds: 12,
        },
      ],
    };
  }

  if (sql.includes("COALESCE(MAX(CASE WHEN t.test_type = 'PRE'")) {
    return {
      rows: [
        {
          mahasiswa_id: MHS_1_ID,
          nama: "=CMD('calc')",
          nim: "2415051001",
          kelas_id: KELAS_A_ID,
          kelas_kode: "TI-2A-2026",
          kelas_nama: "+TI-2A",
          pre_status: "SUBMITTED",
          pre_score: "80.00",
          post_status: "SUBMITTED",
          post_score: "75.00",
        },
        {
          mahasiswa_id: MHS_2_ID,
          nama: "@Sari",
          nim: "-2415051002",
          kelas_id: KELAS_A_ID,
          kelas_kode: "TI-2A-2026",
          kelas_nama: "+TI-2A",
          pre_status: "NOT_STARTED",
          pre_score: null,
          post_status: "IN_PROGRESS",
          post_score: "0.00",
        },
      ],
    };
  }

  if (sql.includes("WHERE m.mahasiswa_id = $1")) {
    const mahasiswaId = params?.[0];
    return {
      rows:
        mahasiswaId === MHS_1_ID
          ? [
              {
                mahasiswa_id: MHS_1_ID,
                nama: "Budi",
                nim: "2415051001",
                kelas_id: KELAS_A_ID,
                kelas_kode: "TI-2A-2026",
                kelas_nama: "TI 2A Struktur Data",
              },
            ]
          : [],
    };
  }

  if (sql.includes("FROM public.test_attempt ta") && sql.includes("WHERE ta.mahasiswa_id = $1")) {
    return {
      rows: [
        {
          attempt_id: PRE_ATT_ID,
          test_type: "PRE",
          status: "SUBMITTED",
          score: "80.00",
          started_at: "2026-11-20T01:00:00.000Z",
          submitted_at: "2026-11-20T01:20:00.000Z",
        },
        {
          attempt_id: POST_ATT_ID,
          test_type: "POST",
          status: "IN_PROGRESS",
          score: "0.00",
          started_at: "2026-11-20T02:00:00.000Z",
          submitted_at: null,
        },
      ],
    };
  }

  if (sql.includes("FROM public.test_answer ans")) {
    return {
      rows: [
        {
          sequence: 1,
          question_text: "Operator alamat adalah &?",
          question_type: "TF",
          options: [],
          correct_answer_snapshot: { value: true },
          selected_option_id: null,
          student_boolean: true,
          student_text: null,
          is_correct: true,
          answered_at: "2026-11-20T01:02:00.000Z",
          time_spent_seconds: 25,
        },
      ],
    };
  }

  throw new Error(`Unexpected SQL in test mock: ${sql}`);
}

describe("Tahap 4 & 6 — Endpoint Dosen (§5), Manajemen Kelas, Keamanan, CSV & UI Hygiene", () => {
  beforeEach(() => {
    capturedQueries = [];
    activeDbHandler = defaultLecturerHandler;
  });

  it("6 route analitik/evaluasi /api/lecturer/* tetap strictly GET-only (SEC-09), sedangkan mutasi terbatas pada manajemen kelas", () => {
    const readOnlyAnalyticsModules = [
      lecturerDashboardRoute,
      lecturerActivitiesRoute,
      lecturerActivityDetailRoute,
      lecturerEvaluationsRoute,
      lecturerEvaluationDetailRoute,
      lecturerEvaluationsExportRoute,
    ];

    for (const mod of readOnlyAnalyticsModules) {
      const record = mod as Record<string, unknown>;
      expect(typeof record.GET).toBe("function");
      expect(record.POST).toBeUndefined();
      expect(record.PATCH).toBeUndefined();
      expect(record.PUT).toBeUndefined();
      expect(record.DELETE).toBeUndefined();
    }

    const classesMod = lecturerClassesRoute as Record<string, unknown>;
    expect(typeof classesMod.GET).toBe("function");
    expect(typeof classesMod.POST).toBe("function");
    expect(classesMod.PATCH).toBeUndefined();
    expect(classesMod.PUT).toBeUndefined();
    expect(classesMod.DELETE).toBeUndefined();

    const classDetailMod = lecturerClassDetailRoute as Record<string, unknown>;
    expect(typeof classDetailMod.GET).toBe("function");
    expect(typeof classDetailMod.PATCH).toBe("function");
    expect(typeof classDetailMod.DELETE).toBe("function");
    expect(classDetailMod.POST).toBeUndefined();
    expect(classDetailMod.PUT).toBeUndefined();

    const classStudentMod = lecturerClassStudentRoute as Record<string, unknown>;
    expect(typeof classStudentMod.DELETE).toBe("function");
    expect(classStudentMod.GET).toBeUndefined();
    expect(classStudentMod.POST).toBeUndefined();
    expect(classStudentMod.PATCH).toBeUndefined();
    expect(classStudentMod.PUT).toBeUndefined();
  });

  it("menolak tanpa JWT (401) dan menolak mahasiswa / non-dosen (403 forbidden, SEC-13)", async () => {
    const noTokenRes = await lecturerDashboardRoute.GET(
      authReq("http://localhost/api/lecturer/dashboard", false)
    );
    expect(noTokenRes.status).toBe(401);

    activeDbHandler = (sql) => {
      if (sql.includes("FROM public.dosen")) {
        return { rows: [] };
      }
      throw new Error(`Should stop at requireLecturer: ${sql}`);
    };

    const responses = await Promise.all([
      lecturerDashboardRoute.GET(authReq("http://localhost/api/lecturer/dashboard")),
      lecturerClassesRoute.GET(authReq("http://localhost/api/lecturer/classes")),
      lecturerClassDetailRoute.GET(
        authReq(`http://localhost/api/lecturer/classes/${KELAS_A_ID}`),
        { params: Promise.resolve({ kelasId: KELAS_A_ID }) }
      ),
      lecturerActivitiesRoute.GET(
        authReq("http://localhost/api/lecturer/activities")
      ),
      lecturerActivityDetailRoute.GET(
        authReq(`http://localhost/api/lecturer/activities/${EX_ATT_ID}`),
        { params: Promise.resolve({ attemptId: EX_ATT_ID }) }
      ),
      lecturerEvaluationsRoute.GET(
        authReq("http://localhost/api/lecturer/evaluations")
      ),
      lecturerEvaluationDetailRoute.GET(
        authReq(`http://localhost/api/lecturer/evaluations/${MHS_1_ID}`),
        { params: Promise.resolve({ mahasiswaId: MHS_1_ID }) }
      ),
      lecturerEvaluationsExportRoute.GET(
        authReq(
          `http://localhost/api/lecturer/evaluations/export?kelas_id=${KELAS_A_ID}`
        )
      ),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("forbidden");
    }
  });

  it("menolak akses kelas/attempt/mahasiswa dosen lain dengan 404 not_found (SEC-02/SEC-07)", async () => {
    const classRes = await lecturerClassDetailRoute.GET(
      authReq(`http://localhost/api/lecturer/classes/${OTHER_KELAS_ID}`),
      { params: Promise.resolve({ kelasId: OTHER_KELAS_ID }) }
    );
    expect(classRes.status).toBe(404);

    const dashOtherRes = await lecturerDashboardRoute.GET(
      authReq(
        `http://localhost/api/lecturer/dashboard?kelas_id=${OTHER_KELAS_ID}`
      )
    );
    expect(dashOtherRes.status).toBe(404);

    const attemptRes = await lecturerActivityDetailRoute.GET(
      authReq(`http://localhost/api/lecturer/activities/${OTHER_EX_ATT_ID}`),
      { params: Promise.resolve({ attemptId: OTHER_EX_ATT_ID }) }
    );
    expect(attemptRes.status).toBe(404);

    const evalRes = await lecturerEvaluationDetailRoute.GET(
      authReq(`http://localhost/api/lecturer/evaluations/${OTHER_MHS_ID}`),
      { params: Promise.resolve({ mahasiswaId: OTHER_MHS_ID }) }
    );
    expect(evalRes.status).toBe(404);

    const exportRes = await lecturerEvaluationsExportRoute.GET(
      authReq(
        `http://localhost/api/lecturer/evaluations/export?kelas_id=${OTHER_KELAS_ID}`
      )
    );
    expect(exportRes.status).toBe(404);
  });

  it("GET /api/lecturer/dashboard mengecualikan kelas_id NULL (WEB-BR-002) dan tidak menganggap IN_PROGRESS sebagai skor 0 (WEB-BR-009)", async () => {
    const res = await lecturerDashboardRoute.GET(
      authReq("http://localhost/api/lecturer/dashboard")
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.kpi.total_students).toBe(2);
    expect(body.test_comparison.paired_avg_delta).toBe(15);
    expect(body.recent_activities[0].score).toBe(80);
    expect(body.recent_activities[1].status).toBe("IN_PROGRESS");
    expect(body.recent_activities[1].score).toBeNull();

    const scopedQueries = capturedQueries.filter(
      (q) =>
        q.sql.includes("FROM public.exercise_attempt") ||
        q.sql.includes("FROM public.mahasiswa")
    );
    expect(scopedQueries.length).toBeGreaterThan(0);
    for (const q of scopedQueries) {
      expect(q.sql).toContain("kelas_id IS NOT NULL");
    }
  });

  it("GET /api/lecturer/activities/[attemptId] memproyeksikan kunci jawaban Read-Only (P13) & metode FIB Levenshtein >= 70%", async () => {
    const res = await lecturerActivityDetailRoute.GET(
      authReq(`http://localhost/api/lecturer/activities/${EX_ATT_ID}`),
      { params: Promise.resolve({ attemptId: EX_ATT_ID }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.fib_evaluation_method).toBe(
      "Case-insensitive + Trim + Levenshtein Similarity >= 70%"
    );
    expect(body.correct_count).toBe(2);
    expect(body.items[0].student_answer_display).toBe("*");
    expect(body.items[0].correct_answer_display).toBe("*");
    expect(body.items[0].correct_option_id).toBeUndefined();
    expect(body.items[1].correct_answer_display).toBe("Benar, 32-bit/64-bit");
  });

  it("GET /api/lecturer/evaluations & [mahasiswaId] menjaga NULL bukan 0 (WEB-BR-009) & delta hanya pada pasangan SUBMITTED (WEB-BR-010)", async () => {
    const listRes = await lecturerEvaluationsRoute.GET(
      authReq("http://localhost/api/lecturer/evaluations")
    );
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();

    expect(listBody.items[0].pre_score).toBe(80);
    expect(listBody.items[0].post_score).toBe(75);
    expect(listBody.items[0].delta_score).toBe(-5);

    expect(listBody.items[1].pre_score).toBeNull();
    expect(listBody.items[1].post_status).toBe("IN_PROGRESS");
    expect(listBody.items[1].post_score).toBeNull();
    expect(listBody.items[1].delta_score).toBeNull();

    expect(listBody.summary.paired_count).toBe(1);
    expect(listBody.summary.paired_avg_delta).toBe(-5);

    const detailRes = await lecturerEvaluationDetailRoute.GET(
      authReq(`http://localhost/api/lecturer/evaluations/${MHS_1_ID}`),
      { params: Promise.resolve({ mahasiswaId: MHS_1_ID }) }
    );
    expect(detailRes.status).toBe(200);
    const detailBody = await detailRes.json();

    expect(detailBody.summary.pre_score).toBe(80);
    expect(detailBody.summary.post_status).toBe("IN_PROGRESS");
    expect(detailBody.summary.post_score).toBeNull();
    expect(detailBody.summary.delta_score).toBeNull();
    expect(detailBody.pre_attempt.items[0].student_answer_display).toBe(
      "Benar (true)"
    );
    expect(detailBody.pre_attempt.items[0].correct_answer_display).toBe(
      "Benar (true)"
    );
  });

  it("GET /api/lecturer/evaluations/export memvalidasi kelas_id dan menetralkan CSV formula injection (=,+,-,@)", async () => {
    const missingKelasRes = await lecturerEvaluationsExportRoute.GET(
      authReq("http://localhost/api/lecturer/evaluations/export")
    );
    expect(missingKelasRes.status).toBe(400);
    const errBody = await missingKelasRes.json();
    expect(errBody.error.code).toBe("validation_error");

    const okRes = await lecturerEvaluationsExportRoute.GET(
      authReq(
        `http://localhost/api/lecturer/evaluations/export?kelas_id=${KELAS_A_ID}`
      )
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(okRes.headers.get("content-disposition")).toBe(
      'attachment; filename="evaluasi-TI-2A-2026.csv"'
    );

    const csvText = await okRes.text();
    const lines = csvText.trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("'=CMD('calc')");
    expect(lines[1]).toContain("'+TI-2A");
    expect(lines[1]).toContain(",80.00,SUBMITTED,75.00,-5.00");
    expect(lines[2]).toContain("'-2415051002,'@Sari");
    expect(lines[2]).toContain(",NOT_STARTED,,IN_PROGRESS,,");
  });

  it("sanitizeCsvCell & buildEvaluationsCsv menjaga nilai negatif numerik dan mengamankan karakter kontrol/formula", () => {
    expect(sanitizeCsvCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCsvCell("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
    expect(sanitizeCsvCell("-payload")).toBe("'-payload");
    expect(sanitizeCsvCell("@IMPORTXML")).toBe("'@IMPORTXML");
    expect(sanitizeCsvCell("\tcmd")).toBe("'\tcmd");
    expect(sanitizeCsvCell(null)).toBe("");
    expect(sanitizeCsvCell(-12.5, { numeric: true })).toBe("-12.50");
    expect(sanitizeCsvCell(null, { numeric: true })).toBe("");

    const sampleCsv = buildEvaluationsCsv([
      {
        nim: "2415051001",
        nama: "Budi, S.Kom",
        kelas_kode: "TI-2A",
        kelas_nama: "Kelas A",
        pre_status: "SUBMITTED",
        pre_score: 60,
        post_status: "SUBMITTED",
        post_score: 55,
        delta_score: -5,
      },
    ]);
    expect(sampleCsv).toContain('"Budi, S.Kom",TI-2A,Kelas A,SUBMITTED,60.00,SUBMITTED,55.00,-5.00');
  });

  it("UI Web Dosen bebas dari karakter terlarang DESIGN.md v1.1 (em-dash U+2014, WIB, Regex Evaluator)", () => {
    const roots = [
      path.resolve(process.cwd(), "src/app"),
      path.resolve(process.cwd(), "src/components"),
      path.resolve(process.cwd(), "src/lib/services/lecturer-analytics.ts"),
    ];

    const files: string[] = [];
    const walk = (target: string) => {
      if (!fs.existsSync(target)) return;
      const stat = fs.statSync(target);
      if (stat.isFile()) {
        if (/\.(ts|tsx|css)$/.test(target)) {
          files.push(target);
        }
        return;
      }
      for (const entry of fs.readdirSync(target)) {
        walk(path.join(target, entry));
      }
    };

    for (const root of roots) {
      walk(root);
    }

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      expect(content, `Dilarang em-dash (U+2014) di ${file}`).not.toContain(
        "\u2014"
      );
      expect(content, `Gunakan WITA, bukan WIB di ${file}`).not.toMatch(
        /\bWIB\b/
      );
      expect(
        content,
        `Dilarang label 'Regex Evaluator' di ${file}`
      ).not.toContain("Regex Evaluator");
    }
  });

  it("POST/PATCH/DELETE /api/lecturer/classes dan DELETE student menguji CRUD kelas dosen & error mapping", async () => {
    const newClassId = "30000000-0000-4000-8000-000000000055";

    activeDbHandler = (sql, params) => {
      if (sql.includes("FROM public.dosen") && sql.includes("WHERE auth_user_id")) {
        return {
          rows: [
            {
              dosen_id: DOSEN_ID,
              nidn: "0011223344",
              nama: "Dr. Putu Dosen",
              email: "dosen@undiksha.ac.id",
            },
          ],
        };
      }
      if (sql.includes("fn_lecturer_create_class")) {
        if (params?.[1] === "TI-DUP-2026") {
          throw Object.assign(new Error("duplicate key value violates unique constraint \"kelas_kode_key\""), {
            code: "23505",
            constraint: "kelas_kode_key",
          });
        }
        return {
          rows: [
            {
              kelas_id: newClassId,
              nama: params?.[0],
              kode: params?.[1],
              tahun_akademik: params?.[2],
              semester: params?.[3],
            },
          ],
        };
      }
      if (sql.includes("fn_lecturer_update_class")) {
        if (params?.[0] === OTHER_KELAS_ID) {
          throw Object.assign(new Error("kelas tidak ditemukan"), { code: "P0002" });
        }
        return {
          rows: [
            {
              kelas_id: params?.[0],
              nama: params?.[1],
              kode: params?.[2],
              tahun_akademik: params?.[3],
              semester: params?.[4],
            },
          ],
        };
      }
      if (sql.includes("COUNT(mahasiswa_id)::int AS student_count")) {
        return { rows: [{ student_count: 14 }] };
      }
      if (sql.includes("fn_lecturer_delete_class")) {
        return { rows: [{ kelas_id: params?.[0] }] };
      }
      if (sql.includes("fn_lecturer_remove_student_from_class")) {
        if (params?.[1] === OTHER_MHS_ID) {
          throw Object.assign(new Error("mahasiswa tidak terdaftar di kelas ini"), {
            code: "P0002",
          });
        }
        return { rows: [{ mahasiswa_id: params?.[1] }] };
      }
      return defaultLecturerHandler(sql, params);
    };

    // 1. POST /api/lecturer/classes valid -> 201 + uppercase kode
    const createRes = await lecturerClassesRoute.POST(
      new Request("http://localhost/api/lecturer/classes", {
        method: "POST",
        headers: {
          authorization: "Bearer dev-lecturer-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          nama: "Pemrograman TypeScript C",
          kode: "ti-2c-2026",
          tahun_akademik: "2026/2027",
          semester: "Ganjil",
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const createdJson = await createRes.json();
    expect(createdJson.kode).toBe("TI-2C-2026");
    expect(createdJson.student_count).toBe(0);

    // 2. POST duplicate kode -> 409 class_code_conflict
    const dupRes = await lecturerClassesRoute.POST(
      new Request("http://localhost/api/lecturer/classes", {
        method: "POST",
        headers: {
          authorization: "Bearer dev-lecturer-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          nama: "Kelas Duplikat",
          kode: "TI-DUP-2026",
          tahun_akademik: "2026/2027",
          semester: "Genap",
        }),
      })
    );
    expect(dupRes.status).toBe(409);
    expect((await dupRes.json()).error.code).toBe("class_code_conflict");

    // 3. POST format tahun_akademik tidak valid -> 400 validation_error
    const invalidRes = await lecturerClassesRoute.POST(
      new Request("http://localhost/api/lecturer/classes", {
        method: "POST",
        headers: {
          authorization: "Bearer dev-lecturer-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          nama: "Kelas Invalid",
          kode: "TI-INV",
          tahun_akademik: "2026",
          semester: "Pendek",
        }),
      })
    );
    expect(invalidRes.status).toBe(400);
    expect((await invalidRes.json()).error.code).toBe("validation_error");

    // 4. PATCH kelas sendiri -> 200; kelas dosen lain -> 404
    const patchOk = await lecturerClassDetailRoute.PATCH(
      new Request(`http://localhost/api/lecturer/classes/${KELAS_A_ID}`, {
        method: "PATCH",
        headers: {
          authorization: "Bearer dev-lecturer-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          nama: "TypeScript A Revisi",
          kode: "TI-2A-2026",
          tahun_akademik: "2026/2027",
          semester: "Genap",
        }),
      }),
      { params: Promise.resolve({ kelasId: KELAS_A_ID }) }
    );
    expect(patchOk.status).toBe(200);
    const patchJson = await patchOk.json();
    expect(patchJson.student_count).toBe(14);
    expect(patchJson.semester).toBe("Genap");

    const patchForbidden = await lecturerClassDetailRoute.PATCH(
      new Request(`http://localhost/api/lecturer/classes/${OTHER_KELAS_ID}`, {
        method: "PATCH",
        headers: {
          authorization: "Bearer dev-lecturer-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          nama: "Bajak Kelas",
          kode: "TI-99",
          tahun_akademik: "2026/2027",
          semester: "Ganjil",
        }),
      }),
      { params: Promise.resolve({ kelasId: OTHER_KELAS_ID }) }
    );
    expect(patchForbidden.status).toBe(404);

    // 5. DELETE mahasiswa dari kelas -> 200; bukan di kelas -> 404
    const removeOk = await lecturerClassStudentRoute.DELETE(
      new Request(
        `http://localhost/api/lecturer/classes/${KELAS_A_ID}/students/${MHS_1_ID}`,
        {
          method: "DELETE",
          headers: { authorization: "Bearer dev-lecturer-token" },
        }
      ),
      { params: Promise.resolve({ kelasId: KELAS_A_ID, mahasiswaId: MHS_1_ID }) }
    );
    expect(removeOk.status).toBe(200);
    expect(await removeOk.json()).toEqual({
      removed_mahasiswa_id: MHS_1_ID,
      kelas_id: KELAS_A_ID,
    });

    const removeMissing = await lecturerClassStudentRoute.DELETE(
      new Request(
        `http://localhost/api/lecturer/classes/${KELAS_A_ID}/students/${OTHER_MHS_ID}`,
        {
          method: "DELETE",
          headers: { authorization: "Bearer dev-lecturer-token" },
        }
      ),
      {
        params: Promise.resolve({
          kelasId: KELAS_A_ID,
          mahasiswaId: OTHER_MHS_ID,
        }),
      }
    );
    expect(removeMissing.status).toBe(404);

    // 6. DELETE kelas -> 200
    const deleteClassRes = await lecturerClassDetailRoute.DELETE(
      new Request(`http://localhost/api/lecturer/classes/${KELAS_A_ID}`, {
        method: "DELETE",
        headers: { authorization: "Bearer dev-lecturer-token" },
      }),
      { params: Promise.resolve({ kelasId: KELAS_A_ID }) }
    );
    expect(deleteClassRes.status).toBe(200);
    expect(await deleteClassRes.json()).toEqual({
      deleted_kelas_id: KELAS_A_ID,
    });
  });

  it("halaman publik OAuth Verification (/ , /privacy, /terms) & alur GIS signInWithIdToken di /login memenuhi kontrak", () => {
    const homePagePath = path.resolve(process.cwd(), "src/app/page.tsx");
    const privacyPagePath = path.resolve(process.cwd(), "src/app/privacy/page.tsx");
    const termsPagePath = path.resolve(process.cwd(), "src/app/terms/page.tsx");
    const loginPagePath = path.resolve(process.cwd(), "src/app/login/page.tsx");
    const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
    const envExamplePath = path.resolve(process.cwd(), ".env.example");

    expect(fs.existsSync(homePagePath)).toBe(true);
    expect(fs.existsSync(privacyPagePath)).toBe(true);
    expect(fs.existsSync(termsPagePath)).toBe(true);

    const homeSrc = fs.readFileSync(homePagePath, "utf8");
    expect(homeSrc).not.toContain('redirect("/login")');
    expect(homeSrc).toContain("PLAS");
    expect(homeSrc).toContain("PlasAppLogo");
    expect(homeSrc).toContain('href="/login"');
    expect(homeSrc).toContain('href="/privacy"');
    expect(homeSrc).toContain('href="/terms"');
    expect(homeSrc).toContain(
      "https://github.com/zulvanavito/plasmobile/releases/latest/download/PLAS-TypeScript.apk"
    );
    expect(homeSrc).toContain("https://github.com/zulvanavito/plasmobile/releases");
    expect(homeSrc).toContain('rel="noopener noreferrer"');
    expect(homeSrc).toContain("00:00 WITA");

    const privacySrc = fs.readFileSync(privacyPagePath, "utf8");
    expect(privacySrc).toContain("PLAS");
    expect(privacySrc).toContain("Supabase");
    expect(privacySrc).toContain("openid");
    expect(privacySrc).toContain("email");
    expect(privacySrc).toContain("profile");
    expect(privacySrc).toContain("zavitoanwari@gmail.com");
    expect(privacySrc).toContain('href="/"');
    expect(privacySrc).toContain('href="/login"');

    const termsSrc = fs.readFileSync(termsPagePath, "utf8");
    expect(termsSrc).toContain("PLAS");
    expect(termsSrc).toContain("zavitoanwari@gmail.com");
    expect(termsSrc).toContain('href="/"');
    expect(termsSrc).toContain('href="/login"');

    const loginSrc = fs.readFileSync(loginPagePath, "utf8");
    expect(loginSrc).toContain("https://accounts.google.com/gsi/client");
    expect(loginSrc).toContain("signInWithIdToken");
    expect(loginSrc).not.toContain("signInWithOAuth");
    expect(loginSrc).toContain("SHA-256");
    expect(loginSrc).toContain("NEXT_PUBLIC_GOOGLE_CLIENT_ID");
    expect(loginSrc).toContain('href="/"');
    expect(loginSrc).toContain('href="/privacy"');
    expect(loginSrc).toContain('href="/terms"');

    const layoutSrc = fs.readFileSync(layoutPath, "utf8");
    expect(layoutSrc).toContain("PLAS");

    const envExampleSrc = fs.readFileSync(envExamplePath, "utf8");
    expect(envExampleSrc).toContain("NEXT_PUBLIC_GOOGLE_CLIENT_ID=");
  });
});
