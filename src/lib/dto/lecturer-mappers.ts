import type {
  AttemptStatus,
  QuestionOptionDto,
  QuestionType,
  TestOverviewStatus,
  TestType,
} from "@/lib/dto/student-mappers";

export interface LecturerIdentityDto {
  dosen_id: string;
  nidn: string;
  nama: string;
  email: string;
}

export interface LecturerClassRefDto {
  kelas_id: string;
  nama: string;
  kode: string;
}

export interface LecturerDashboardDto {
  lecturer: LecturerIdentityDto;
  classes: LecturerClassRefDto[];
  kpi: {
    total_students: number;
    total_classes: number;
    total_exercise_attempts: number;
    total_test_attempts: number;
  };
  exercise_status_distribution: {
    submitted: number;
    in_progress: number;
  };
  test_comparison: {
    avg_pre_score: number | null;
    avg_post_score: number | null;
    paired_avg_pre_score: number | null;
    paired_avg_post_score: number | null;
    paired_avg_delta: number | null;
    pre_submitted_count: number;
    post_submitted_count: number;
    paired_count: number;
  };
  activity_trend: Array<{
    date: string;
    exercise_attempts: number;
    test_attempts: number;
  }>;
  recent_activities: Array<{
    id: string;
    kind: "EXERCISE" | "TEST";
    student_name: string;
    student_nim: string;
    kelas_kode: string;
    title: string;
    status: AttemptStatus;
    score: number | null;
    timestamp: string;
  }>;
}

export interface LecturerClassSummaryDto {
  kelas_id: string;
  nama: string;
  kode: string;
  tahun_akademik: string;
  semester: string;
  dosen_nama: string;
  student_count: number;
}

export interface LecturerClassesResponseDto {
  kpi: {
    total_classes: number;
    total_students: number;
    avg_students_per_class: number;
  };
  filter_options: {
    tahun_akademik: string[];
    semester: string[];
  };
  items: LecturerClassSummaryDto[];
}

export interface LecturerClassStudentRowDto {
  mahasiswa_id: string;
  nama: string;
  nim: string;
  exercise_attempts_count: number;
  submitted_exercises_count: number;
  avg_exercise_score: number | null;
  pre_test_status: TestOverviewStatus;
  pre_test_score: number | null;
  post_test_status: TestOverviewStatus;
  post_test_score: number | null;
}

export interface LecturerClassDetailDto {
  kelas: LecturerClassSummaryDto;
  students: LecturerClassStudentRowDto[];
}

export interface LecturerMaterialDistributionDto {
  material_id: string;
  sequence: number;
  title: string;
  attempt_count: number;
  submitted_count: number;
}

export interface LecturerActivityRowDto {
  attempt_id: string;
  mahasiswa_id: string;
  student_name: string;
  student_nim: string;
  kelas_id: string;
  kelas_kode: string;
  material_id: string;
  material_sequence: number;
  material_title: string;
  submaterial_title: string;
  exercise_title: string;
  question_type: QuestionType;
  attempt_number: number;
  status: AttemptStatus;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
}

export interface LecturerActivitiesResponseDto {
  classes: LecturerClassRefDto[];
  materials: Array<{ material_id: string; sequence: number; title: string }>;
  material_distribution: LecturerMaterialDistributionDto[];
  items: LecturerActivityRowDto[];
}

export interface LecturerActivityQuestionItemDto {
  question_id: string;
  sequence: number;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOptionDto[];
  student_answer_display: string | null;
  correct_answer_display: string;
  is_correct: boolean | null;
  explanation: string | null;
  time_spent_seconds: number;
}

export interface LecturerActivityDetailDto {
  attempt_id: string;
  student_name: string;
  student_nim: string;
  kelas_nama: string;
  kelas_kode: string;
  material_title: string;
  submaterial_title: string;
  exercise_title: string;
  question_type: QuestionType;
  fib_evaluation_method: string;
  attempt_number: number;
  status: AttemptStatus;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  total_duration_seconds: number;
  correct_count: number;
  incorrect_count: number;
  items: LecturerActivityQuestionItemDto[];
}

export interface LecturerEvaluationRowDto {
  mahasiswa_id: string;
  nama: string;
  nim: string;
  kelas_id: string;
  kelas_kode: string;
  kelas_nama: string;
  pre_status: TestOverviewStatus;
  pre_score: number | null;
  post_status: TestOverviewStatus;
  post_score: number | null;
  delta_score: number | null;
}

export interface LecturerEvaluationsResponseDto {
  classes: LecturerClassRefDto[];
  summary: {
    avg_pre_score: number | null;
    avg_post_score: number | null;
    paired_avg_delta: number | null;
    pre_submitted_count: number;
    post_submitted_count: number;
    paired_count: number;
    total_students: number;
  };
  items: LecturerEvaluationRowDto[];
}

export interface LecturerTestAnswerReviewItemDto {
  sequence: number;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOptionDto[];
  student_answer_display: string | null;
  correct_answer_display: string;
  is_correct: boolean | null;
  time_spent_seconds: number;
}

export interface LecturerTestAttemptBreakdownDto {
  attempt_id: string;
  test_type: TestType;
  status: AttemptStatus;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  items: LecturerTestAnswerReviewItemDto[];
}

export interface LecturerEvaluationDetailDto {
  student: {
    mahasiswa_id: string;
    nama: string;
    nim: string;
    kelas_id: string;
    kelas_kode: string;
    kelas_nama: string;
  };
  summary: {
    pre_status: TestOverviewStatus;
    pre_score: number | null;
    post_status: TestOverviewStatus;
    post_score: number | null;
    delta_score: number | null;
  };
  pre_attempt: LecturerTestAttemptBreakdownDto | null;
  post_attempt: LecturerTestAttemptBreakdownDto | null;
}
