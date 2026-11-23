import type { CanonicalStudentAnswer } from "@/lib/validation/schemas";

export type QuestionType = "MC" | "TF" | "FIB";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED";
export type TestType = "PRE" | "POST";
export type TestOverviewStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";

export interface ClassInfoDto {
  kelas_id: string;
  nama: string;
  kode: string;
  tahun_akademik: string;
  semester: string;
  dosen_nama: string | null;
}

export interface StudentProfileDto {
  mahasiswa_id: string;
  nama: string;
  nim: string;
  kelas: ClassInfoDto | null;
  pre_test_submitted: boolean;
  remaining_ai_quota: number;
}

export interface MaterialSummaryDto {
  material_id: string;
  sequence: number;
  title: string;
  description: string;
  submaterial_count: number;
  completed_exercises: number;
}

export interface SubMaterialSummaryDto {
  submaterial_id: string;
  sequence: number;
  title: string;
  has_submitted_exercise: boolean;
  attempts_used: number;
  max_attempts: number;
}

export interface MaterialDetailDto {
  material_id: string;
  sequence: number;
  title: string;
  description: string;
  submaterials: SubMaterialSummaryDto[];
}

export interface ExerciseOverviewDto {
  exercise_id: string;
  title: string;
  question_type: QuestionType;
  latest_attempt_status: AttemptStatus | null;
  attempts_used: number;
  remaining_attempts: number;
  max_attempts: number;
  best_score: number | null;
}

export interface SubMaterialDetailDto {
  submaterial_id: string;
  material_id: string;
  sequence: number;
  title: string;
  content_markdown: string;
  exercise: ExerciseOverviewDto;
}

export interface QuestionOptionDto {
  option_id: string;
  text: string;
  sequence: number;
}

export interface ExerciseQuestionDto {
  question_id: string;
  sequence: number;
  question_text: string;
  question_type: QuestionType;
  hint: string | null;
  options: QuestionOptionDto[];
}

export interface ExerciseDetailDto {
  exercise_id: string;
  submaterial_id: string;
  title: string;
  question_type: QuestionType;
  questions: ExerciseQuestionDto[];
}

export interface ExerciseAttemptDto {
  attempt_id: string;
  exercise_id: string;
  attempt_number: number;
  status: AttemptStatus;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  questions: ExerciseQuestionDto[];
}

export interface ExerciseAnswerResponseDto {
  attempt_id: string;
  question_id: string;
  is_correct: boolean;
  explanation: string | null;
  hint: string | null;
  answered_at: string;
}

export interface ExerciseReviewItemDto {
  question_id: string;
  sequence: number;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOptionDto[];
  student_answer: CanonicalStudentAnswer | null;
  is_correct: boolean | null;
  explanation: string | null;
  hint: string | null;
  time_spent_seconds: number;
}

export interface ExerciseAttemptDetailDto {
  attempt_id: string;
  exercise_id: string;
  exercise_title: string;
  attempt_number: number;
  status: AttemptStatus;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  items: ExerciseReviewItemDto[];
}

export interface AiQuotaDto {
  remaining_quota: number;
  daily_limit: number;
  usage_date: string;
}

export interface ProgressSummaryDto {
  completed_materials: number;
  total_materials: number;
  completed_exercises: number;
  total_exercises: number;
  pre_test_status: TestOverviewStatus;
  pre_test_score: number | null;
  post_test_status: TestOverviewStatus;
  post_test_score: number | null;
  is_post_test_eligible: boolean;
  ai_quota: AiQuotaDto;
}

export interface ActivityItemDto {
  attempt_id: string;
  exercise_id: string;
  material_title: string;
  submaterial_title: string;
  question_type: QuestionType;
  attempt_number: number;
  status: AttemptStatus;
  score: number | null;
  created_at: string;
  submitted_at: string | null;
}

export interface TestOverviewItemDto {
  test_id: string;
  test_type: TestType;
  title: string;
  question_count: number;
  status: TestOverviewStatus;
  active_attempt_id: string | null;
  score: number | null;
  is_eligible: boolean;
  completed_exercises: number;
  total_exercises: number;
}

export interface TestsOverviewDto {
  pre_test: TestOverviewItemDto;
  post_test: TestOverviewItemDto;
}

export interface TestActiveQuestionDto {
  sequence: number;
  total_questions: number;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOptionDto[];
  question_started_at: string;
}

export interface TestAttemptStartDto {
  attempt_id: string;
  test_id: string;
  test_type: TestType;
  status: AttemptStatus;
  total_questions: number;
  current_sequence: number;
  started_at: string;
  first_question: TestActiveQuestionDto | null;
}

export interface TestAnswerAckDto {
  attempt_id: string;
  sequence: number;
  is_recorded: boolean;
  answered_at: string;
  next_sequence: number | null;
}

export interface TestResultItemDto {
  sequence: number;
  question_text: string;
  question_type: QuestionType;
  is_correct: boolean;
  time_spent_seconds: number;
}

export interface TestAttemptResultDto {
  attempt_id: string;
  test_id: string;
  test_type: TestType;
  status: AttemptStatus;
  score: number;
  total_duration_seconds: number;
  started_at: string;
  submitted_at: string;
  items: TestResultItemDto[];
}

export type AiAskStatus = "success" | "already_processed";
export type AiHintLevel = 1 | 2 | 3;

export interface AiAskResponseDto {
  status: AiAskStatus;
  answer: string | null;
  hint_level: AiHintLevel | null;
  remaining_quota: number;
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return toIsoString(value);
}

export function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapQuestionOption(row: {
  option_id: string;
  text: string;
  sequence: number | string;
}): QuestionOptionDto {
  return {
    option_id: row.option_id,
    text: row.text,
    sequence: Number(row.sequence),
  };
}

export function mapExerciseQuestionSafe(row: {
  question_id: string;
  sequence: number | string;
  question_text: string;
  question_type: QuestionType;
  hint: string | null;
  options?: Array<{
    option_id: string;
    text: string;
    sequence: number | string;
  }> | null;
}): ExerciseQuestionDto {
  return {
    question_id: row.question_id,
    sequence: Number(row.sequence),
    question_text: row.question_text,
    question_type: row.question_type,
    hint: row.hint ?? null,
    options: (row.options ?? []).map(mapQuestionOption),
  };
}
