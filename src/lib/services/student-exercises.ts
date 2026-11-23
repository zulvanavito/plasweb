import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import {
  mapQuestionOption,
  toIsoOrNull,
  toIsoString,
  toNumberOrNull,
  type AttemptStatus,
  type ExerciseAnswerResponseDto,
  type ExerciseAttemptDetailDto,
  type ExerciseAttemptDto,
  type ExerciseReviewItemDto,
  type QuestionType,
} from "@/lib/dto/student-mappers";
import { ApiError } from "@/lib/http/errors";
import { computePayloadHash } from "@/lib/http/idempotency";
import { loadSafeExerciseQuestions } from "@/lib/services/student-materials";
import type {
  CanonicalStudentAnswer,
  SubmitExerciseAnswerBody,
} from "@/lib/validation/schemas";

interface ExerciseAttemptRow {
  attempt_id: string;
  exercise_id: string;
  attempt_number: number | string;
  status: AttemptStatus;
  score: string | number | null;
  started_at: Date | string;
  submitted_at: Date | string | null;
  is_replay?: boolean;
}

function mapAttemptRow(
  row: ExerciseAttemptRow,
  questions: ExerciseAttemptDto["questions"] = []
): ExerciseAttemptDto {
  return {
    attempt_id: row.attempt_id,
    exercise_id: row.exercise_id,
    attempt_number: Number(row.attempt_number),
    status: row.status,
    score: toNumberOrNull(row.score),
    started_at: toIsoString(row.started_at),
    submitted_at: toIsoOrNull(row.submitted_at),
    questions,
  };
}

export async function createExerciseAttempt(
  db: DbClient,
  exerciseId: string,
  creationRequestId: string
): Promise<{ dto: ExerciseAttemptDto; status: 200 | 201 }> {
  const payloadHash = computePayloadHash({ exercise_id: exerciseId });
  const res = await db.query<ExerciseAttemptRow>(
    `SELECT * FROM public.fn_create_exercise_attempt($1, $2, $3)`,
    [exerciseId, creationRequestId, payloadHash]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }

  const questions = await loadSafeExerciseQuestions(db, row.exercise_id);
  return {
    dto: mapAttemptRow(row, questions),
    status: row.is_replay ? 200 : 201,
  };
}

export async function listExerciseAttempts(
  db: DbClient,
  auth: AuthContext,
  exerciseId: string
): Promise<ExerciseAttemptDto[]> {
  const exRes = await db.query<{ exists: number }>(
    `SELECT 1 AS exists FROM public.exercise WHERE exercise_id = $1`,
    [exerciseId]
  );
  if (exRes.rows.length === 0) {
    throw new ApiError(404, "not_found");
  }

  const res = await db.query<ExerciseAttemptRow>(
    `SELECT
       ea.exercise_attempt_id AS attempt_id,
       ea.exercise_id,
       ea.attempt_no AS attempt_number,
       ea.status,
       ea.score,
       ea.started_at,
       ea.submitted_at
     FROM public.exercise_attempt ea
     JOIN public.mahasiswa st ON st.mahasiswa_id = ea.mahasiswa_id
     WHERE ea.exercise_id = $1
       AND st.auth_user_id = $2
     ORDER BY ea.attempt_no ASC`,
    [exerciseId, auth.userId]
  );

  return res.rows.map((row) => mapAttemptRow(row));
}

export async function submitExerciseAnswer(
  db: DbClient,
  attemptId: string,
  body: SubmitExerciseAnswerBody,
  submissionRequestId: string
): Promise<ExerciseAnswerResponseDto> {
  const payloadHash = computePayloadHash({
    attempt_id: attemptId,
    question_id: body.question_id,
    answer: body.answer,
    time_spent_seconds: body.time_spent_seconds,
  });

  const res = await db.query<{
    attempt_id: string;
    question_id: string;
    is_correct: boolean;
    explanation: string | null;
    hint: string | null;
    answered_at: Date | string;
  }>(
    `SELECT * FROM public.fn_submit_exercise_answer($1, $2, $3::jsonb, $4, $5, $6)`,
    [
      attemptId,
      body.question_id,
      JSON.stringify(body.answer),
      body.time_spent_seconds,
      submissionRequestId,
      payloadHash,
    ]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }

  return {
    attempt_id: row.attempt_id,
    question_id: row.question_id,
    is_correct: Boolean(row.is_correct),
    explanation: row.explanation ?? null,
    hint: row.hint ?? null,
    answered_at: toIsoString(row.answered_at),
  };
}

export async function finalizeExerciseAttempt(
  db: DbClient,
  attemptId: string,
  idempotencyKey: string | null
): Promise<ExerciseAttemptDto> {
  const res = await db.query<ExerciseAttemptRow>(
    `SELECT * FROM public.fn_finalize_exercise_attempt($1, $2)`,
    [attemptId, idempotencyKey]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }
  return mapAttemptRow(row);
}

export async function getExerciseAttemptDetail(
  db: DbClient,
  auth: AuthContext,
  attemptId: string
): Promise<ExerciseAttemptDetailDto> {
  const attRes = await db.query<{
    attempt_id: string;
    exercise_id: string;
    exercise_title: string;
    attempt_number: number | string;
    status: AttemptStatus;
    score: string | number | null;
    started_at: Date | string;
    submitted_at: Date | string | null;
  }>(
    `SELECT
       ea.exercise_attempt_id AS attempt_id,
       ea.exercise_id,
       e.title AS exercise_title,
       ea.attempt_no AS attempt_number,
       ea.status,
       ea.score,
       ea.started_at,
       ea.submitted_at
     FROM public.exercise_attempt ea
     JOIN public.exercise e ON e.exercise_id = ea.exercise_id
     JOIN public.mahasiswa st ON st.mahasiswa_id = ea.mahasiswa_id
     WHERE ea.exercise_attempt_id = $1
       AND st.auth_user_id = $2`,
    [attemptId, auth.userId]
  );

  const attempt = attRes.rows[0];
  if (!attempt) {
    throw new ApiError(404, "not_found");
  }

  const itemsRes = await db.query<{
    question_id: string;
    sequence: number | string;
    question_text: string;
    question_type: QuestionType;
    options: Array<{
      option_id: string;
      text: string;
      sequence: number | string;
    }> | null;
    student_answer: CanonicalStudentAnswer | null;
    is_correct: boolean | null;
    explanation: string | null;
    hint: string | null;
    time_spent_seconds: number | string;
  }>(
    `SELECT
       q.exercise_question_id AS question_id,
       q.sequence,
       COALESCE(ans.question_snapshot, q.question_text) AS question_text,
       COALESCE(ans.question_type_snapshot, q.question_type) AS question_type,
       COALESCE(
         ans.options_snapshot,
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
       ) AS options,
       ans.student_answer,
       ans.is_correct,
       CASE WHEN $2 = 'SUBMITTED' THEN q.explanation ELSE NULL END AS explanation,
       q.hint,
       COALESCE(ans.time_spent_seconds, 0)::int AS time_spent_seconds
     FROM public.exercise_question q
     LEFT JOIN public.exercise_answer ans
       ON ans.exercise_question_id = q.exercise_question_id
      AND ans.exercise_attempt_id = $1
     WHERE q.exercise_id = $3
     ORDER BY q.sequence ASC`,
    [attempt.attempt_id, attempt.status, attempt.exercise_id]
  );

  const items: ExerciseReviewItemDto[] = itemsRes.rows.map((item) => ({
    question_id: item.question_id,
    sequence: Number(item.sequence),
    question_text: item.question_text,
    question_type: item.question_type,
    options: (item.options ?? []).map(mapQuestionOption),
    student_answer: item.student_answer ?? null,
    is_correct: item.is_correct ?? null,
    explanation: attempt.status === "SUBMITTED" ? (item.explanation ?? null) : null,
    hint: item.hint ?? null,
    time_spent_seconds: Number(item.time_spent_seconds),
  }));

  return {
    attempt_id: attempt.attempt_id,
    exercise_id: attempt.exercise_id,
    exercise_title: attempt.exercise_title,
    attempt_number: Number(attempt.attempt_number),
    status: attempt.status,
    score: toNumberOrNull(attempt.score),
    started_at: toIsoString(attempt.started_at),
    submitted_at: toIsoOrNull(attempt.submitted_at),
    items,
  };
}
