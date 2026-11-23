import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import {
  mapQuestionOption,
  toIsoString,
  toNumberOrNull,
  type AttemptStatus,
  type QuestionOptionDto,
  type QuestionType,
  type TestActiveQuestionDto,
  type TestAnswerAckDto,
  type TestAttemptResultDto,
  type TestAttemptStartDto,
  type TestOverviewItemDto,
  type TestOverviewStatus,
  type TestResultItemDto,
  type TestsOverviewDto,
  type TestType,
} from "@/lib/dto/student-mappers";
import { ApiError } from "@/lib/http/errors";
import { computePayloadHash } from "@/lib/http/idempotency";
import type { CanonicalStudentAnswer } from "@/lib/validation/schemas";

interface TestOverviewQueryRow {
  test_id: string;
  test_type: TestType;
  title: string;
  question_count: number | string;
  attempt_id: string | null;
  attempt_status: AttemptStatus | null;
  attempt_score: string | number | null;
}

interface RawActiveQuestionRow {
  sequence: number | string;
  total_questions: number | string;
  question_text: string;
  question_type: QuestionType;
  options: Array<{
    option_id: string;
    text: string;
    sequence: number | string;
  }> | null;
  question_started_at: Date | string;
}

function mapActiveQuestionRow(row: RawActiveQuestionRow): TestActiveQuestionDto {
  const options: QuestionOptionDto[] = (row.options ?? []).map(mapQuestionOption);
  return {
    sequence: Number(row.sequence),
    total_questions: Number(row.total_questions),
    question_text: row.question_text,
    question_type: row.question_type,
    options,
    question_started_at: toIsoString(row.question_started_at),
  };
}

async function loadSafeTestResultItems(
  db: DbClient,
  attemptId: string
): Promise<TestResultItemDto[]> {
  const res = await db.query<{
    sequence: number | string;
    question_text: string;
    question_type: QuestionType;
    is_correct: boolean;
    time_spent_seconds: number | string;
  }>(
    `SELECT
       ans.question_sequence AS sequence,
       ans.question_snapshot AS question_text,
       ans.question_type_snapshot AS question_type,
       ans.is_correct,
       COALESCE(ans.time_spent_seconds, 0)::int AS time_spent_seconds
     FROM public.test_answer ans
     WHERE ans.test_attempt_id = $1
     ORDER BY ans.question_sequence ASC`,
    [attemptId]
  );

  return res.rows.map((row) => ({
    sequence: Number(row.sequence),
    question_text: row.question_text,
    question_type: row.question_type,
    is_correct: Boolean(row.is_correct),
    time_spent_seconds: Number(row.time_spent_seconds),
  }));
}

export async function getTestsOverview(
  db: DbClient,
  auth: AuthContext
): Promise<TestsOverviewDto> {
  const studentRes = await db.query<{ mahasiswa_id: string }>(
    `SELECT mahasiswa_id FROM public.mahasiswa WHERE auth_user_id = $1`,
    [auth.userId]
  );
  const student = studentRes.rows[0];
  if (!student) {
    throw new ApiError(404, "profile_not_found");
  }

  const exCountRes = await db.query<{
    total_exercises: number | string;
    completed_exercises: number | string;
  }>(
    `SELECT
       COUNT(e.exercise_id)::int AS total_exercises,
       COUNT(DISTINCT CASE WHEN ea.status = 'SUBMITTED' THEN e.exercise_id END)::int AS completed_exercises
     FROM public.exercise e
     LEFT JOIN public.exercise_attempt ea
       ON ea.exercise_id = e.exercise_id
      AND ea.mahasiswa_id = $1`,
    [student.mahasiswa_id]
  );

  const exCounts = exCountRes.rows[0] ?? {
    total_exercises: 0,
    completed_exercises: 0,
  };
  const totalExercises = Number(exCounts.total_exercises);
  const completedExercises = Number(exCounts.completed_exercises);

  const testsRes = await db.query<TestOverviewQueryRow>(
    `SELECT
       t.test_id,
       t.test_type,
       t.title,
       (
         SELECT count(*)::int
         FROM public.test_question tq
         WHERE tq.test_id = t.test_id
       ) AS question_count,
       ta.test_attempt_id AS attempt_id,
       ta.status AS attempt_status,
       ta.score AS attempt_score
     FROM public.test t
     LEFT JOIN public.test_attempt ta
       ON ta.test_id = t.test_id
      AND ta.mahasiswa_id = $1`,
    [student.mahasiswa_id]
  );

  const mapItem = (row: TestOverviewQueryRow): TestOverviewItemDto => {
    const status: TestOverviewStatus = row.attempt_status ?? "NOT_STARTED";
    return {
      test_id: row.test_id,
      test_type: row.test_type,
      title: row.title,
      question_count: Number(row.question_count),
      status,
      active_attempt_id: row.attempt_id ?? null,
      score:
        status === "SUBMITTED" ? toNumberOrNull(row.attempt_score) : null,
      is_eligible:
        row.test_type === "PRE"
          ? true
          : totalExercises > 0 && completedExercises === totalExercises,
      completed_exercises: completedExercises,
      total_exercises: totalExercises,
    };
  };

  const preRow = testsRes.rows.find((r) => r.test_type === "PRE");
  const postRow = testsRes.rows.find((r) => r.test_type === "POST");
  if (!preRow || !postRow) {
    throw new ApiError(404, "not_found");
  }

  return {
    pre_test: mapItem(preRow),
    post_test: mapItem(postRow),
  };
}

export async function createTestAttempt(
  db: DbClient,
  testId: string,
  creationRequestId: string
): Promise<{ dto: TestAttemptStartDto; status: 200 | 201 }> {
  const payloadHash = computePayloadHash({ test_id: testId });
  const res = await db.query<{
    attempt_id: string;
    test_id: string;
    test_type: TestType;
    status: AttemptStatus;
    total_questions: number | string;
    current_sequence: number | string;
    started_at: Date | string;
    is_replay: boolean;
  }>(
    `SELECT * FROM public.fn_create_test_attempt($1, $2, $3)`,
    [testId, creationRequestId, payloadHash]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }

  return {
    dto: {
      attempt_id: row.attempt_id,
      test_id: row.test_id,
      test_type: row.test_type,
      status: row.status,
      total_questions: Number(row.total_questions),
      current_sequence: Number(row.current_sequence),
      started_at: toIsoString(row.started_at),
      first_question: null,
    },
    status: row.is_replay ? 200 : 201,
  };
}

export async function startTestQuestion(
  db: DbClient,
  attemptId: string,
  sequence: number
): Promise<TestActiveQuestionDto> {
  const res = await db.query<RawActiveQuestionRow>(
    `SELECT * FROM public.fn_start_test_question($1, $2)`,
    [attemptId, sequence]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }
  return mapActiveQuestionRow(row);
}

export async function submitTestAnswer(
  db: DbClient,
  attemptId: string,
  sequence: number,
  answer: CanonicalStudentAnswer,
  submissionRequestId: string
): Promise<TestAnswerAckDto> {
  const payloadHash = computePayloadHash({
    attempt_id: attemptId,
    sequence,
    answer,
  });

  const res = await db.query<{
    attempt_id: string;
    sequence: number | string;
    is_recorded: boolean;
    answered_at: Date | string;
    next_sequence: number | string | null;
  }>(
    `SELECT * FROM public.fn_submit_test_answer($1, $2, $3::jsonb, $4, $5)`,
    [attemptId, sequence, JSON.stringify(answer), submissionRequestId, payloadHash]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }

  return {
    attempt_id: row.attempt_id,
    sequence: Number(row.sequence),
    is_recorded: Boolean(row.is_recorded),
    answered_at: toIsoString(row.answered_at),
    next_sequence:
      row.next_sequence === null || row.next_sequence === undefined
        ? null
        : Number(row.next_sequence),
  };
}

export async function resumeTestAttempt(
  db: DbClient,
  attemptId: string
): Promise<TestActiveQuestionDto> {
  const res = await db.query<RawActiveQuestionRow>(
    `SELECT * FROM public.fn_get_or_resume_test_attempt($1)`,
    [attemptId]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }
  return mapActiveQuestionRow(row);
}

export async function finalizeTestAttempt(
  db: DbClient,
  attemptId: string,
  idempotencyKey: string | null
): Promise<TestAttemptResultDto> {
  const res = await db.query<{
    attempt_id: string;
    test_id: string;
    test_type: TestType;
    status: AttemptStatus;
    score: string | number;
    total_duration_seconds: number | string;
    started_at: Date | string;
    submitted_at: Date | string;
  }>(
    `SELECT * FROM public.fn_finalize_test_attempt($1, $2)`,
    [attemptId, idempotencyKey]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }

  const items = await loadSafeTestResultItems(db, row.attempt_id);
  return {
    attempt_id: row.attempt_id,
    test_id: row.test_id,
    test_type: row.test_type,
    status: row.status,
    score: toNumberOrNull(row.score) ?? 0,
    total_duration_seconds: Number(row.total_duration_seconds),
    started_at: toIsoString(row.started_at),
    submitted_at: toIsoString(row.submitted_at),
    items,
  };
}

export async function getTestAttemptResult(
  db: DbClient,
  auth: AuthContext,
  attemptId: string
): Promise<TestAttemptResultDto> {
  const res = await db.query<{
    attempt_id: string;
    test_id: string;
    test_type: TestType;
    status: AttemptStatus;
    score: string | number | null;
    started_at: Date | string;
    submitted_at: Date | string | null;
  }>(
    `SELECT
       ta.test_attempt_id AS attempt_id,
       ta.test_id,
       t.test_type,
       ta.status,
       ta.score,
       ta.started_at,
       ta.submitted_at
     FROM public.test_attempt ta
     JOIN public.test t ON t.test_id = ta.test_id
     JOIN public.mahasiswa st ON st.mahasiswa_id = ta.mahasiswa_id
     WHERE ta.test_attempt_id = $1
       AND st.auth_user_id = $2`,
    [attemptId, auth.userId]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(404, "not_found");
  }
  if (row.status !== "SUBMITTED" || row.submitted_at === null) {
    throw new ApiError(409, "invalid_state_transition");
  }

  const startedAtIso = toIsoString(row.started_at);
  const submittedAtIso = toIsoString(row.submitted_at);
  const totalDurationSeconds = Math.max(
    0,
    Math.floor(
      (new Date(submittedAtIso).getTime() - new Date(startedAtIso).getTime()) /
        1000
    )
  );
  const items = await loadSafeTestResultItems(db, row.attempt_id);

  return {
    attempt_id: row.attempt_id,
    test_id: row.test_id,
    test_type: row.test_type,
    status: row.status,
    score: toNumberOrNull(row.score) ?? 0,
    total_duration_seconds: totalDurationSeconds,
    started_at: startedAtIso,
    submitted_at: submittedAtIso,
    items,
  };
}
