import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import {
  mapExerciseQuestionSafe,
  toNumberOrNull,
  type AttemptStatus,
  type ExerciseDetailDto,
  type ExerciseQuestionDto,
  type MaterialDetailDto,
  type MaterialSummaryDto,
  type QuestionType,
  type SubMaterialDetailDto,
} from "@/lib/dto/student-mappers";
import { ApiError } from "@/lib/http/errors";

interface SafeQuestionRow {
  question_id: string;
  sequence: number | string;
  question_text: string;
  question_type: QuestionType;
  hint: string | null;
  options: Array<{
    option_id: string;
    text: string;
    sequence: number | string;
  }> | null;
}

export async function loadSafeExerciseQuestions(
  db: DbClient,
  exerciseId: string
): Promise<ExerciseQuestionDto[]> {
  const res = await db.query<SafeQuestionRow>(
    `SELECT
       q.exercise_question_id AS question_id,
       q.sequence,
       q.question_text,
       q.question_type,
       q.hint,
       COALESCE(
         (
           SELECT jsonb_agg(
             jsonb_build_object(
               'option_id', o.exercise_question_option_id::text,
               'text', o.option_text,
               'sequence', o.sequence
             ) ORDER BY o.sequence ASC
           )
           FROM public.exercise_question_option o
           WHERE o.exercise_question_id = q.exercise_question_id
         ),
         '[]'::jsonb
       ) AS options
     FROM public.exercise_question q
     WHERE q.exercise_id = $1
     ORDER BY q.sequence ASC`,
    [exerciseId]
  );

  return res.rows.map(mapExerciseQuestionSafe);
}

export async function listMaterials(
  db: DbClient,
  auth: AuthContext
): Promise<MaterialSummaryDto[]> {
  const res = await db.query<{
    material_id: string;
    sequence: number | string;
    title: string;
    description: string;
    submaterial_count: number | string;
    completed_exercises: number | string;
  }>(
    `SELECT
       m.material_id,
       m.sequence,
       m.title,
       COALESCE(m.description, '') AS description,
       COUNT(DISTINCT sm.submaterial_id)::int AS submaterial_count,
       COUNT(DISTINCT CASE WHEN ea.status = 'SUBMITTED' THEN e.exercise_id END)::int AS completed_exercises
     FROM public.material m
     LEFT JOIN public.sub_material sm ON sm.material_id = m.material_id
     LEFT JOIN public.exercise e ON e.submaterial_id = sm.submaterial_id
     LEFT JOIN public.mahasiswa st ON st.auth_user_id = $1
     LEFT JOIN public.exercise_attempt ea
       ON ea.exercise_id = e.exercise_id
      AND ea.mahasiswa_id = st.mahasiswa_id
     GROUP BY m.material_id, m.sequence, m.title, m.description
     ORDER BY m.sequence ASC`,
    [auth.userId]
  );

  return res.rows.map((row) => ({
    material_id: row.material_id,
    sequence: Number(row.sequence),
    title: row.title,
    description: row.description,
    submaterial_count: Number(row.submaterial_count),
    completed_exercises: Number(row.completed_exercises),
  }));
}

export async function getMaterialDetail(
  db: DbClient,
  auth: AuthContext,
  materialId: string
): Promise<MaterialDetailDto> {
  const matRes = await db.query<{
    material_id: string;
    sequence: number | string;
    title: string;
    description: string;
  }>(
    `SELECT
       material_id,
       sequence,
       title,
       COALESCE(description, '') AS description
     FROM public.material
     WHERE material_id = $1`,
    [materialId]
  );

  const material = matRes.rows[0];
  if (!material) {
    throw new ApiError(404, "not_found");
  }

  const subRes = await db.query<{
    submaterial_id: string;
    sequence: number | string;
    title: string;
    has_submitted_exercise: boolean;
    attempts_used: number | string;
  }>(
    `SELECT
       sm.submaterial_id,
       sm.sequence,
       sm.title,
       COALESCE(BOOL_OR(ea.status = 'SUBMITTED'), FALSE) AS has_submitted_exercise,
       COUNT(ea.exercise_attempt_id)::int AS attempts_used
     FROM public.sub_material sm
     LEFT JOIN public.exercise e ON e.submaterial_id = sm.submaterial_id
     LEFT JOIN public.mahasiswa st ON st.auth_user_id = $2
     LEFT JOIN public.exercise_attempt ea
       ON ea.exercise_id = e.exercise_id
      AND ea.mahasiswa_id = st.mahasiswa_id
     WHERE sm.material_id = $1
     GROUP BY sm.submaterial_id, sm.sequence, sm.title
     ORDER BY sm.sequence ASC`,
    [materialId, auth.userId]
  );

  return {
    material_id: material.material_id,
    sequence: Number(material.sequence),
    title: material.title,
    description: material.description,
    submaterials: subRes.rows.map((sub) => ({
      submaterial_id: sub.submaterial_id,
      sequence: Number(sub.sequence),
      title: sub.title,
      has_submitted_exercise: Boolean(sub.has_submitted_exercise),
      attempts_used: Number(sub.attempts_used),
      max_attempts: 3,
    })),
  };
}

export async function getSubMaterialDetail(
  db: DbClient,
  auth: AuthContext,
  submaterialId: string
): Promise<SubMaterialDetailDto> {
  const res = await db.query<{
    submaterial_id: string;
    material_id: string;
    sequence: number | string;
    title: string;
    content_markdown: string;
    exercise_id: string;
    exercise_title: string;
    question_type: QuestionType;
    latest_attempt_status: AttemptStatus | null;
    attempts_used: number | string;
    best_score: string | number | null;
  }>(
    `SELECT
       sm.submaterial_id,
       sm.material_id,
       sm.sequence,
       sm.title,
       sm.content AS content_markdown,
       e.exercise_id,
       e.title AS exercise_title,
       e.question_type,
       (
         SELECT ea2.status
         FROM public.exercise_attempt ea2
         JOIN public.mahasiswa st2 ON st2.mahasiswa_id = ea2.mahasiswa_id
         WHERE ea2.exercise_id = e.exercise_id
           AND st2.auth_user_id = $2
         ORDER BY ea2.attempt_no DESC
         LIMIT 1
       ) AS latest_attempt_status,
       COUNT(ea.exercise_attempt_id)::int AS attempts_used,
       MAX(CASE WHEN ea.status = 'SUBMITTED' THEN ea.score END) AS best_score
     FROM public.sub_material sm
     JOIN public.exercise e ON e.submaterial_id = sm.submaterial_id
     LEFT JOIN public.mahasiswa st ON st.auth_user_id = $2
     LEFT JOIN public.exercise_attempt ea
       ON ea.exercise_id = e.exercise_id
      AND ea.mahasiswa_id = st.mahasiswa_id
     WHERE sm.submaterial_id = $1
     GROUP BY sm.submaterial_id, sm.material_id, sm.sequence, sm.title, sm.content,
              e.exercise_id, e.title, e.question_type`,
    [submaterialId, auth.userId]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(404, "not_found");
  }

  const attemptsUsed = Number(row.attempts_used);
  const maxAttempts = 3;

  return {
    submaterial_id: row.submaterial_id,
    material_id: row.material_id,
    sequence: Number(row.sequence),
    title: row.title,
    content_markdown: row.content_markdown,
    exercise: {
      exercise_id: row.exercise_id,
      title: row.exercise_title,
      question_type: row.question_type,
      latest_attempt_status: row.latest_attempt_status ?? null,
      attempts_used: attemptsUsed,
      remaining_attempts: Math.max(0, maxAttempts - attemptsUsed),
      max_attempts: maxAttempts,
      best_score: toNumberOrNull(row.best_score),
    },
  };
}

export async function getExerciseDetail(
  db: DbClient,
  submaterialId: string
): Promise<ExerciseDetailDto> {
  const res = await db.query<{
    exercise_id: string;
    submaterial_id: string;
    title: string;
    question_type: QuestionType;
  }>(
    `SELECT exercise_id, submaterial_id, title, question_type
     FROM public.exercise
     WHERE submaterial_id = $1`,
    [submaterialId]
  );

  const ex = res.rows[0];
  if (!ex) {
    throw new ApiError(404, "not_found");
  }

  const questions = await loadSafeExerciseQuestions(db, ex.exercise_id);
  return {
    exercise_id: ex.exercise_id,
    submaterial_id: ex.submaterial_id,
    title: ex.title,
    question_type: ex.question_type,
    questions,
  };
}
