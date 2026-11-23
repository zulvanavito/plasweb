import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import {
  toIsoOrNull,
  toIsoString,
  toNumberOrNull,
  type ActivityItemDto,
  type AttemptStatus,
  type ProgressSummaryDto,
  type QuestionType,
  type TestOverviewStatus,
  type TestType,
} from "@/lib/dto/student-mappers";
import { ApiError } from "@/lib/http/errors";

async function requireStudentId(
  db: DbClient,
  auth: AuthContext
): Promise<string> {
  const res = await db.query<{ mahasiswa_id: string }>(
    `SELECT mahasiswa_id FROM public.mahasiswa WHERE auth_user_id = $1`,
    [auth.userId]
  );
  const row = res.rows[0];
  if (!row) {
    throw new ApiError(404, "profile_not_found");
  }
  return row.mahasiswa_id;
}

export async function getProgressSummary(
  db: DbClient,
  auth: AuthContext
): Promise<ProgressSummaryDto> {
  const mahasiswaId = await requireStudentId(db, auth);

  const countsRes = await db.query<{
    total_materials: number | string;
    completed_materials: number | string;
    total_exercises: number | string;
    completed_exercises: number | string;
  }>(
    `WITH mat_status AS (
       SELECT
         m.material_id,
         COUNT(e.exercise_id)::int AS ex_count,
         COUNT(DISTINCT CASE WHEN ea.status = 'SUBMITTED' THEN e.exercise_id END)::int AS done_count
       FROM public.material m
       LEFT JOIN public.sub_material sm ON sm.material_id = m.material_id
       LEFT JOIN public.exercise e ON e.submaterial_id = sm.submaterial_id
       LEFT JOIN public.exercise_attempt ea
         ON ea.exercise_id = e.exercise_id
        AND ea.mahasiswa_id = $1
       GROUP BY m.material_id
     )
     SELECT
       COUNT(*)::int AS total_materials,
       COUNT(*) FILTER (WHERE ex_count > 0 AND done_count = ex_count)::int AS completed_materials,
       COALESCE(SUM(ex_count), 0)::int AS total_exercises,
       COALESCE(SUM(done_count), 0)::int AS completed_exercises
     FROM mat_status`,
    [mahasiswaId]
  );

  const testsRes = await db.query<{
    test_type: TestType;
    test_status: TestOverviewStatus;
    test_score: string | number | null;
  }>(
    `SELECT
       t.test_type,
       COALESCE(ta.status, 'NOT_STARTED') AS test_status,
       CASE WHEN ta.status = 'SUBMITTED' THEN ta.score ELSE NULL END AS test_score
     FROM public.test t
     LEFT JOIN public.test_attempt ta
       ON ta.test_id = t.test_id
      AND ta.mahasiswa_id = $1`,
    [mahasiswaId]
  );

  const quotaRes = await db.query<{
    usage_date: string;
    remaining_quota: number | string;
  }>(
    `SELECT
       to_char(timezone('Asia/Makassar', statement_timestamp())::date, 'YYYY-MM-DD') AS usage_date,
       GREATEST(
         0,
         10 - (
           SELECT count(*)::int
           FROM public.ai_usage u
           WHERE u.mahasiswa_id = $1
             AND u.usage_date = timezone('Asia/Makassar', statement_timestamp())::date
             AND u.status IN ('PENDING', 'SUCCESS')
         )
       )::int AS remaining_quota`,
    [mahasiswaId]
  );

  const counts = countsRes.rows[0] ?? {
    total_materials: 0,
    completed_materials: 0,
    total_exercises: 0,
    completed_exercises: 0,
  };
  const preRow = testsRes.rows.find((r) => r.test_type === "PRE");
  const postRow = testsRes.rows.find((r) => r.test_type === "POST");
  const quotaRow = quotaRes.rows[0] ?? {
    usage_date: "",
    remaining_quota: 10,
  };

  const totalExercises = Number(counts.total_exercises);
  const completedExercises = Number(counts.completed_exercises);

  return {
    completed_materials: Number(counts.completed_materials),
    total_materials: Number(counts.total_materials),
    completed_exercises: completedExercises,
    total_exercises: totalExercises,
    pre_test_status: preRow?.test_status ?? "NOT_STARTED",
    pre_test_score: toNumberOrNull(preRow?.test_score),
    post_test_status: postRow?.test_status ?? "NOT_STARTED",
    post_test_score: toNumberOrNull(postRow?.test_score),
    is_post_test_eligible:
      totalExercises > 0 && completedExercises === totalExercises,
    ai_quota: {
      remaining_quota: Number(quotaRow.remaining_quota),
      daily_limit: 10,
      usage_date: quotaRow.usage_date,
    },
  };
}

export async function listActivities(
  db: DbClient,
  auth: AuthContext
): Promise<ActivityItemDto[]> {
  const mahasiswaId = await requireStudentId(db, auth);

  const res = await db.query<{
    attempt_id: string;
    exercise_id: string;
    material_title: string;
    submaterial_title: string;
    question_type: QuestionType;
    attempt_number: number | string;
    status: AttemptStatus;
    score: string | number | null;
    created_at: Date | string;
    submitted_at: Date | string | null;
  }>(
    `SELECT
       ea.exercise_attempt_id AS attempt_id,
       ea.exercise_id,
       m.title AS material_title,
       sm.title AS submaterial_title,
       e.question_type,
       ea.attempt_no AS attempt_number,
       ea.status,
       ea.score,
       ea.started_at AS created_at,
       ea.submitted_at
     FROM public.exercise_attempt ea
     JOIN public.exercise e ON e.exercise_id = ea.exercise_id
     JOIN public.sub_material sm ON sm.submaterial_id = e.submaterial_id
     JOIN public.material m ON m.material_id = sm.material_id
     WHERE ea.mahasiswa_id = $1
     ORDER BY ea.started_at DESC, ea.exercise_attempt_id DESC`,
    [mahasiswaId]
  );

  return res.rows.map((row) => ({
    attempt_id: row.attempt_id,
    exercise_id: row.exercise_id,
    material_title: row.material_title,
    submaterial_title: row.submaterial_title,
    question_type: row.question_type,
    attempt_number: Number(row.attempt_number),
    status: row.status,
    score: toNumberOrNull(row.score),
    created_at: toIsoString(row.created_at),
    submitted_at: toIsoOrNull(row.submitted_at),
  }));
}
