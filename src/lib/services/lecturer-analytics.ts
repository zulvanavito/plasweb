import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import type {
  LecturerActivitiesResponseDto,
  LecturerActivityDetailDto,
  LecturerClassDetailDto,
  LecturerClassesResponseDto,
  LecturerClassSummaryDto,
  LecturerDashboardDto,
  LecturerEvaluationDetailDto,
  LecturerEvaluationsResponseDto,
  LecturerIdentityDto,
  LecturerTestAttemptBreakdownDto,
} from "@/lib/dto/lecturer-mappers";
import {
  mapQuestionOption,
  toIsoOrNull,
  toIsoString,
  toNumberOrNull,
  type AttemptStatus,
  type QuestionOptionDto,
  type QuestionType,
  type TestOverviewStatus,
  type TestType,
} from "@/lib/dto/student-mappers";
import { ApiError } from "@/lib/http/errors";
import { buildEvaluationsCsv } from "@/lib/services/lecturer-csv";
import type {
  CanonicalStudentAnswer,
  LecturerClassPayload,
} from "@/lib/validation/schemas";

const FIB_EVALUATION_LABEL =
  "Case-insensitive + Trim + Levenshtein Similarity >= 70%";

export async function requireLecturer(
  db: DbClient,
  auth: AuthContext
): Promise<LecturerIdentityDto> {
  const res = await db.query<LecturerIdentityDto>(
    `SELECT dosen_id, nidn, nama, email
     FROM public.dosen
     WHERE auth_user_id = $1`,
    [auth.userId]
  );

  const dosen = res.rows[0];
  if (!dosen) {
    throw new ApiError(403, "forbidden");
  }
  return dosen;
}

async function assertLecturerClass(
  db: DbClient,
  dosenId: string,
  kelasId: string
): Promise<void> {
  const res = await db.query<{ exists: number }>(
    `SELECT 1 AS exists
     FROM public.kelas
     WHERE kelas_id = $1
       AND dosen_id = $2`,
    [kelasId, dosenId]
  );
  if (res.rows.length === 0) {
    throw new ApiError(404, "not_found");
  }
}

function formatBooleanLabel(value: boolean): string {
  return value ? "Benar (true)" : "Salah (false)";
}

export function formatAnswerDisplay(
  questionType: QuestionType,
  answerJson: CanonicalStudentAnswer | null | undefined,
  options: QuestionOptionDto[]
): string | null {
  if (!answerJson) return null;

  if (questionType === "MC" && "option_id" in answerJson) {
    const matched = options.find((opt) => opt.option_id === answerJson.option_id);
    return matched ? matched.text : answerJson.option_id;
  }

  if (questionType === "TF" && "value" in answerJson && typeof answerJson.value === "boolean") {
    return formatBooleanLabel(answerJson.value);
  }

  if (questionType === "FIB" && "value" in answerJson) {
    return String(answerJson.value);
  }

  return null;
}

function roundTwo(value: number): number {
  return Number(value.toFixed(2));
}

export async function getLecturerDashboard(
  db: DbClient,
  auth: AuthContext,
  filters: { kelasId?: string; from?: string; to?: string }
): Promise<LecturerDashboardDto> {
  const lecturer = await requireLecturer(db, auth);
  if (filters.kelasId) {
    await assertLecturerClass(db, lecturer.dosen_id, filters.kelasId);
  }

  const classesRes = await db.query<{
    kelas_id: string;
    nama: string;
    kode: string;
  }>(
    `SELECT kelas_id, nama, kode
     FROM public.kelas
     WHERE dosen_id = $1
     ORDER BY tahun_akademik DESC, kode ASC`,
    [lecturer.dosen_id]
  );

  const studentKpiRes = await db.query<{
    total_students: number | string;
    total_classes: number | string;
  }>(
    `SELECT
       COUNT(DISTINCT m.mahasiswa_id) FILTER (WHERE m.kelas_id IS NOT NULL)::int AS total_students,
       COUNT(DISTINCT k.kelas_id)::int AS total_classes
     FROM public.kelas k
     LEFT JOIN public.mahasiswa m
       ON m.kelas_id = k.kelas_id
     WHERE k.dosen_id = $1
       AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)`,
    [lecturer.dosen_id, filters.kelasId ?? null]
  );

  const exStatsRes = await db.query<{
    total_exercise_attempts: number | string;
    submitted_count: number | string;
    in_progress_count: number | string;
  }>(
    `SELECT
       COUNT(ea.exercise_attempt_id)::int AS total_exercise_attempts,
       COUNT(ea.exercise_attempt_id) FILTER (WHERE ea.status = 'SUBMITTED')::int AS submitted_count,
       COUNT(ea.exercise_attempt_id) FILTER (WHERE ea.status = 'IN_PROGRESS')::int AS in_progress_count
     FROM public.exercise_attempt ea
     JOIN public.mahasiswa m ON m.mahasiswa_id = ea.mahasiswa_id
     JOIN public.kelas k ON k.kelas_id = m.kelas_id
     WHERE k.dosen_id = $1
       AND m.kelas_id IS NOT NULL
       AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
       AND ($3::date IS NULL OR timezone('Asia/Makassar', ea.started_at)::date >= $3::date)
       AND ($4::date IS NULL OR timezone('Asia/Makassar', ea.started_at)::date <= $4::date)`,
    [
      lecturer.dosen_id,
      filters.kelasId ?? null,
      filters.from ?? null,
      filters.to ?? null,
    ]
  );

  const testStatsRes = await db.query<{
    total_test_attempts: number | string;
    pre_submitted_count: number | string;
    post_submitted_count: number | string;
    avg_pre_score: string | number | null;
    avg_post_score: string | number | null;
    paired_count: number | string;
    paired_avg_pre_score: string | number | null;
    paired_avg_post_score: string | number | null;
  }>(
    `WITH scoped_students AS (
       SELECT m.mahasiswa_id
       FROM public.mahasiswa m
       JOIN public.kelas k ON k.kelas_id = m.kelas_id
       WHERE k.dosen_id = $1
         AND m.kelas_id IS NOT NULL
         AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
     ),
     scoped_attempts AS (
       SELECT
         ta.test_attempt_id,
         ta.mahasiswa_id,
         t.test_type,
         ta.status,
         ta.score
       FROM public.test_attempt ta
       JOIN public.test t ON t.test_id = ta.test_id
       JOIN scoped_students ss ON ss.mahasiswa_id = ta.mahasiswa_id
       WHERE ($3::date IS NULL OR timezone('Asia/Makassar', ta.started_at)::date >= $3::date)
         AND ($4::date IS NULL OR timezone('Asia/Makassar', ta.started_at)::date <= $4::date)
     ),
     per_student AS (
       SELECT
         mahasiswa_id,
         MAX(CASE WHEN test_type = 'PRE' AND status = 'SUBMITTED' THEN score END) AS pre_score,
         MAX(CASE WHEN test_type = 'POST' AND status = 'SUBMITTED' THEN score END) AS post_score
       FROM scoped_attempts
       GROUP BY mahasiswa_id
     )
     SELECT
       (SELECT count(*)::int FROM scoped_attempts) AS total_test_attempts,
       COUNT(pre_score)::int AS pre_submitted_count,
       COUNT(post_score)::int AS post_submitted_count,
       ROUND(AVG(pre_score), 2) AS avg_pre_score,
       ROUND(AVG(post_score), 2) AS avg_post_score,
       COUNT(*) FILTER (WHERE pre_score IS NOT NULL AND post_score IS NOT NULL)::int AS paired_count,
       ROUND(AVG(pre_score) FILTER (WHERE pre_score IS NOT NULL AND post_score IS NOT NULL), 2) AS paired_avg_pre_score,
       ROUND(AVG(post_score) FILTER (WHERE pre_score IS NOT NULL AND post_score IS NOT NULL), 2) AS paired_avg_post_score
     FROM per_student`,
    [
      lecturer.dosen_id,
      filters.kelasId ?? null,
      filters.from ?? null,
      filters.to ?? null,
    ]
  );

  const trendRes = await db.query<{
    date: string;
    exercise_attempts: number | string;
    test_attempts: number | string;
  }>(
    `WITH combined AS (
       SELECT
         to_char(timezone('Asia/Makassar', ea.started_at)::date, 'YYYY-MM-DD') AS day,
         1 AS ex_cnt,
         0 AS test_cnt
       FROM public.exercise_attempt ea
       JOIN public.mahasiswa m ON m.mahasiswa_id = ea.mahasiswa_id
       JOIN public.kelas k ON k.kelas_id = m.kelas_id
       WHERE k.dosen_id = $1
         AND m.kelas_id IS NOT NULL
         AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
         AND ($3::date IS NULL OR timezone('Asia/Makassar', ea.started_at)::date >= $3::date)
         AND ($4::date IS NULL OR timezone('Asia/Makassar', ea.started_at)::date <= $4::date)
       UNION ALL
       SELECT
         to_char(timezone('Asia/Makassar', ta.started_at)::date, 'YYYY-MM-DD') AS day,
         0 AS ex_cnt,
         1 AS test_cnt
       FROM public.test_attempt ta
       JOIN public.mahasiswa m ON m.mahasiswa_id = ta.mahasiswa_id
       JOIN public.kelas k ON k.kelas_id = m.kelas_id
       WHERE k.dosen_id = $1
         AND m.kelas_id IS NOT NULL
         AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
         AND ($3::date IS NULL OR timezone('Asia/Makassar', ta.started_at)::date >= $3::date)
         AND ($4::date IS NULL OR timezone('Asia/Makassar', ta.started_at)::date <= $4::date)
     )
     SELECT
       day AS date,
       SUM(ex_cnt)::int AS exercise_attempts,
       SUM(test_cnt)::int AS test_attempts
     FROM combined
     GROUP BY day
     ORDER BY day ASC`,
    [
      lecturer.dosen_id,
      filters.kelasId ?? null,
      filters.from ?? null,
      filters.to ?? null,
    ]
  );

  const recentRes = await db.query<{
    id: string;
    kind: "EXERCISE" | "TEST";
    student_name: string;
    student_nim: string;
    kelas_kode: string;
    title: string;
    status: AttemptStatus;
    score: string | number | null;
    timestamp: Date | string;
  }>(
    `SELECT * FROM (
       SELECT
         ea.exercise_attempt_id AS id,
         'EXERCISE'::text AS kind,
         m.nama AS student_name,
         m.nim AS student_nim,
         k.kode AS kelas_kode,
         e.title AS title,
         ea.status,
         ea.score,
         COALESCE(ea.submitted_at, ea.started_at) AS timestamp
       FROM public.exercise_attempt ea
       JOIN public.exercise e ON e.exercise_id = ea.exercise_id
       JOIN public.mahasiswa m ON m.mahasiswa_id = ea.mahasiswa_id
       JOIN public.kelas k ON k.kelas_id = m.kelas_id
       WHERE k.dosen_id = $1
         AND m.kelas_id IS NOT NULL
         AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
         AND ($3::date IS NULL OR timezone('Asia/Makassar', ea.started_at)::date >= $3::date)
         AND ($4::date IS NULL OR timezone('Asia/Makassar', ea.started_at)::date <= $4::date)
       UNION ALL
       SELECT
         ta.test_attempt_id AS id,
         'TEST'::text AS kind,
         m.nama AS student_name,
         m.nim AS student_nim,
         k.kode AS kelas_kode,
         t.title AS title,
         ta.status,
         ta.score,
         COALESCE(ta.submitted_at, ta.started_at) AS timestamp
       FROM public.test_attempt ta
       JOIN public.test t ON t.test_id = ta.test_id
       JOIN public.mahasiswa m ON m.mahasiswa_id = ta.mahasiswa_id
       JOIN public.kelas k ON k.kelas_id = m.kelas_id
       WHERE k.dosen_id = $1
         AND m.kelas_id IS NOT NULL
         AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
         AND ($3::date IS NULL OR timezone('Asia/Makassar', ta.started_at)::date >= $3::date)
         AND ($4::date IS NULL OR timezone('Asia/Makassar', ta.started_at)::date <= $4::date)
     ) recent
     ORDER BY recent.timestamp DESC
     LIMIT 8`,
    [
      lecturer.dosen_id,
      filters.kelasId ?? null,
      filters.from ?? null,
      filters.to ?? null,
    ]
  );

  const studentKpi = studentKpiRes.rows[0] ?? {
    total_students: 0,
    total_classes: 0,
  };
  const exStats = exStatsRes.rows[0] ?? {
    total_exercise_attempts: 0,
    submitted_count: 0,
    in_progress_count: 0,
  };
  const testStats = testStatsRes.rows[0] ?? {
    total_test_attempts: 0,
    pre_submitted_count: 0,
    post_submitted_count: 0,
    avg_pre_score: null,
    avg_post_score: null,
    paired_count: 0,
    paired_avg_pre_score: null,
    paired_avg_post_score: null,
  };

  const pairedPre = toNumberOrNull(testStats.paired_avg_pre_score);
  const pairedPost = toNumberOrNull(testStats.paired_avg_post_score);
  const pairedDelta =
    pairedPre !== null && pairedPost !== null
      ? roundTwo(pairedPost - pairedPre)
      : null;

  return {
    lecturer,
    classes: classesRes.rows,
    kpi: {
      total_students: Number(studentKpi.total_students),
      total_classes: Number(studentKpi.total_classes),
      total_exercise_attempts: Number(exStats.total_exercise_attempts),
      total_test_attempts: Number(testStats.total_test_attempts),
    },
    exercise_status_distribution: {
      submitted: Number(exStats.submitted_count),
      in_progress: Number(exStats.in_progress_count),
    },
    test_comparison: {
      avg_pre_score: toNumberOrNull(testStats.avg_pre_score),
      avg_post_score: toNumberOrNull(testStats.avg_post_score),
      paired_avg_pre_score: pairedPre,
      paired_avg_post_score: pairedPost,
      paired_avg_delta: pairedDelta,
      pre_submitted_count: Number(testStats.pre_submitted_count),
      post_submitted_count: Number(testStats.post_submitted_count),
      paired_count: Number(testStats.paired_count),
    },
    activity_trend: trendRes.rows.map((row) => ({
      date: row.date,
      exercise_attempts: Number(row.exercise_attempts),
      test_attempts: Number(row.test_attempts),
    })),
    recent_activities: recentRes.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      student_name: row.student_name,
      student_nim: row.student_nim,
      kelas_kode: row.kelas_kode,
      title: row.title,
      status: row.status,
      score: row.status === "SUBMITTED" ? toNumberOrNull(row.score) : null,
      timestamp: toIsoString(row.timestamp),
    })),
  };
}

export async function listLecturerClasses(
  db: DbClient,
  auth: AuthContext,
  filters: { search?: string; tahunAkademik?: string; semester?: string }
): Promise<LecturerClassesResponseDto> {
  const lecturer = await requireLecturer(db, auth);
  const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;

  const res = await db.query<{
    kelas_id: string;
    nama: string;
    kode: string;
    tahun_akademik: string;
    semester: string;
    dosen_nama: string;
    student_count: number | string;
  }>(
    `SELECT
       k.kelas_id,
       k.nama,
       k.kode,
       k.tahun_akademik,
       k.semester,
       d.nama AS dosen_nama,
       COUNT(m.mahasiswa_id) FILTER (WHERE m.kelas_id IS NOT NULL)::int AS student_count
     FROM public.kelas k
     JOIN public.dosen d ON d.dosen_id = k.dosen_id
     LEFT JOIN public.mahasiswa m ON m.kelas_id = k.kelas_id
     WHERE k.dosen_id = $1
       AND ($2::text IS NULL OR k.nama ILIKE $2 OR k.kode ILIKE $2)
       AND ($3::text IS NULL OR k.tahun_akademik = $3)
       AND ($4::text IS NULL OR k.semester = $4)
     GROUP BY k.kelas_id, k.nama, k.kode, k.tahun_akademik, k.semester, d.nama
     ORDER BY k.tahun_akademik DESC, k.kode ASC`,
    [
      lecturer.dosen_id,
      search,
      filters.tahunAkademik?.trim() || null,
      filters.semester?.trim() || null,
    ]
  );

  const optsRes = await db.query<{
    tahun_akademik: string;
    semester: string;
  }>(
    `SELECT DISTINCT tahun_akademik, semester
     FROM public.kelas
     WHERE dosen_id = $1
     ORDER BY tahun_akademik DESC, semester ASC`,
    [lecturer.dosen_id]
  );

  const items: LecturerClassSummaryDto[] = res.rows.map((row) => ({
    kelas_id: row.kelas_id,
    nama: row.nama,
    kode: row.kode,
    tahun_akademik: row.tahun_akademik,
    semester: row.semester,
    dosen_nama: row.dosen_nama,
    student_count: Number(row.student_count),
  }));

  const totalClasses = items.length;
  const totalStudents = items.reduce((sum, item) => sum + item.student_count, 0);
  const avgStudents =
    totalClasses > 0 ? roundTwo(totalStudents / totalClasses) : 0;

  return {
    kpi: {
      total_classes: totalClasses,
      total_students: totalStudents,
      avg_students_per_class: avgStudents,
    },
    filter_options: {
      tahun_akademik: Array.from(
        new Set(optsRes.rows.map((r) => r.tahun_akademik))
      ),
      semester: Array.from(new Set(optsRes.rows.map((r) => r.semester))),
    },
    items,
  };
}

export async function getLecturerClassDetail(
  db: DbClient,
  auth: AuthContext,
  kelasId: string
): Promise<LecturerClassDetailDto> {
  const lecturer = await requireLecturer(db, auth);

  const classRes = await db.query<{
    kelas_id: string;
    nama: string;
    kode: string;
    tahun_akademik: string;
    semester: string;
    dosen_nama: string;
    student_count: number | string;
  }>(
    `SELECT
       k.kelas_id,
       k.nama,
       k.kode,
       k.tahun_akademik,
       k.semester,
       d.nama AS dosen_nama,
       COUNT(m.mahasiswa_id) FILTER (WHERE m.kelas_id IS NOT NULL)::int AS student_count
     FROM public.kelas k
     JOIN public.dosen d ON d.dosen_id = k.dosen_id
     LEFT JOIN public.mahasiswa m ON m.kelas_id = k.kelas_id
     WHERE k.kelas_id = $1
       AND k.dosen_id = $2
     GROUP BY k.kelas_id, k.nama, k.kode, k.tahun_akademik, k.semester, d.nama`,
    [kelasId, lecturer.dosen_id]
  );

  const kelasRow = classRes.rows[0];
  if (!kelasRow) {
    throw new ApiError(404, "not_found");
  }

  const studentsRes = await db.query<{
    mahasiswa_id: string;
    nama: string;
    nim: string;
    exercise_attempts_count: number | string;
    submitted_exercises_count: number | string;
    avg_exercise_score: string | number | null;
    pre_test_status: TestOverviewStatus;
    pre_test_score: string | number | null;
    post_test_status: TestOverviewStatus;
    post_test_score: string | number | null;
  }>(
    `SELECT
       m.mahasiswa_id,
       m.nama,
       m.nim,
       COUNT(ea.exercise_attempt_id)::int AS exercise_attempts_count,
       COUNT(DISTINCT CASE WHEN ea.status = 'SUBMITTED' THEN ea.exercise_id END)::int AS submitted_exercises_count,
       ROUND(AVG(ea.score) FILTER (WHERE ea.status = 'SUBMITTED'), 2) AS avg_exercise_score,
       COALESCE(MAX(CASE WHEN t.test_type = 'PRE' THEN ta.status END), 'NOT_STARTED') AS pre_test_status,
       MAX(CASE WHEN t.test_type = 'PRE' AND ta.status = 'SUBMITTED' THEN ta.score END) AS pre_test_score,
       COALESCE(MAX(CASE WHEN t.test_type = 'POST' THEN ta.status END), 'NOT_STARTED') AS post_test_status,
       MAX(CASE WHEN t.test_type = 'POST' AND ta.status = 'SUBMITTED' THEN ta.score END) AS post_test_score
     FROM public.mahasiswa m
     LEFT JOIN public.exercise_attempt ea ON ea.mahasiswa_id = m.mahasiswa_id
     LEFT JOIN public.test_attempt ta ON ta.mahasiswa_id = m.mahasiswa_id
     LEFT JOIN public.test t ON t.test_id = ta.test_id
     WHERE m.kelas_id = $1
     GROUP BY m.mahasiswa_id, m.nama, m.nim
     ORDER BY m.nim ASC, m.nama ASC`,
    [kelasId]
  );

  return {
    kelas: {
      kelas_id: kelasRow.kelas_id,
      nama: kelasRow.nama,
      kode: kelasRow.kode,
      tahun_akademik: kelasRow.tahun_akademik,
      semester: kelasRow.semester,
      dosen_nama: kelasRow.dosen_nama,
      student_count: Number(kelasRow.student_count),
    },
    students: studentsRes.rows.map((row) => ({
      mahasiswa_id: row.mahasiswa_id,
      nama: row.nama,
      nim: row.nim,
      exercise_attempts_count: Number(row.exercise_attempts_count),
      submitted_exercises_count: Number(row.submitted_exercises_count),
      avg_exercise_score: toNumberOrNull(row.avg_exercise_score),
      pre_test_status: row.pre_test_status,
      pre_test_score:
        row.pre_test_status === "SUBMITTED"
          ? toNumberOrNull(row.pre_test_score)
          : null,
      post_test_status: row.post_test_status,
      post_test_score:
        row.post_test_status === "SUBMITTED"
          ? toNumberOrNull(row.post_test_score)
          : null,
    })),
  };
}

export async function listLecturerActivities(
  db: DbClient,
  auth: AuthContext,
  filters: {
    kelasId?: string;
    materialId?: string;
    questionType?: QuestionType;
    status?: AttemptStatus;
    search?: string;
  }
): Promise<LecturerActivitiesResponseDto> {
  const lecturer = await requireLecturer(db, auth);
  if (filters.kelasId) {
    await assertLecturerClass(db, lecturer.dosen_id, filters.kelasId);
  }

  const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;

  const classesRes = await db.query<{
    kelas_id: string;
    nama: string;
    kode: string;
  }>(
    `SELECT kelas_id, nama, kode
     FROM public.kelas
     WHERE dosen_id = $1
     ORDER BY tahun_akademik DESC, kode ASC`,
    [lecturer.dosen_id]
  );

  const materialsRes = await db.query<{
    material_id: string;
    sequence: number | string;
    title: string;
  }>(`SELECT material_id, sequence, title FROM public.material ORDER BY sequence ASC`);

  const distRes = await db.query<{
    material_id: string;
    sequence: number | string;
    title: string;
    attempt_count: number | string;
    submitted_count: number | string;
  }>(
    `SELECT
       mat.material_id,
       mat.sequence,
       mat.title,
       COUNT(ea.exercise_attempt_id)::int AS attempt_count,
       COUNT(ea.exercise_attempt_id) FILTER (WHERE ea.status = 'SUBMITTED')::int AS submitted_count
     FROM public.material mat
     LEFT JOIN public.sub_material sm ON sm.material_id = mat.material_id
     LEFT JOIN public.exercise e ON e.submaterial_id = sm.submaterial_id
     LEFT JOIN public.exercise_attempt ea ON ea.exercise_id = e.exercise_id
     LEFT JOIN public.mahasiswa m ON m.mahasiswa_id = ea.mahasiswa_id
     LEFT JOIN public.kelas k ON k.kelas_id = m.kelas_id
     WHERE (
       ea.exercise_attempt_id IS NULL
       OR (
         k.dosen_id = $1
         AND m.kelas_id IS NOT NULL
         AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
       )
     )
     GROUP BY mat.material_id, mat.sequence, mat.title
     ORDER BY mat.sequence ASC`,
    [lecturer.dosen_id, filters.kelasId ?? null]
  );

  const itemsRes = await db.query<{
    attempt_id: string;
    mahasiswa_id: string;
    student_name: string;
    student_nim: string;
    kelas_id: string;
    kelas_kode: string;
    material_id: string;
    material_sequence: number | string;
    material_title: string;
    submaterial_title: string;
    exercise_title: string;
    question_type: QuestionType;
    attempt_number: number | string;
    status: AttemptStatus;
    score: string | number | null;
    started_at: Date | string;
    submitted_at: Date | string | null;
  }>(
    `SELECT
       ea.exercise_attempt_id AS attempt_id,
       m.mahasiswa_id,
       m.nama AS student_name,
       m.nim AS student_nim,
       k.kelas_id,
       k.kode AS kelas_kode,
       mat.material_id,
       mat.sequence AS material_sequence,
       mat.title AS material_title,
       sm.title AS submaterial_title,
       e.title AS exercise_title,
       e.question_type,
       ea.attempt_no AS attempt_number,
       ea.status,
       ea.score,
       ea.started_at,
       ea.submitted_at
     FROM public.exercise_attempt ea
     JOIN public.mahasiswa m ON m.mahasiswa_id = ea.mahasiswa_id
     JOIN public.kelas k ON k.kelas_id = m.kelas_id
     JOIN public.exercise e ON e.exercise_id = ea.exercise_id
     JOIN public.sub_material sm ON sm.submaterial_id = e.submaterial_id
     JOIN public.material mat ON mat.material_id = sm.material_id
     WHERE k.dosen_id = $1
       AND m.kelas_id IS NOT NULL
       AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
       AND ($3::uuid IS NULL OR mat.material_id = $3::uuid)
       AND ($4::text IS NULL OR e.question_type = $4)
       AND ($5::text IS NULL OR ea.status = $5)
       AND ($6::text IS NULL OR m.nama ILIKE $6 OR m.nim ILIKE $6)
     ORDER BY ea.started_at DESC, ea.exercise_attempt_id DESC`,
    [
      lecturer.dosen_id,
      filters.kelasId ?? null,
      filters.materialId ?? null,
      filters.questionType ?? null,
      filters.status ?? null,
      search,
    ]
  );

  return {
    classes: classesRes.rows,
    materials: materialsRes.rows.map((m) => ({
      material_id: m.material_id,
      sequence: Number(m.sequence),
      title: m.title,
    })),
    material_distribution: distRes.rows.map((d) => ({
      material_id: d.material_id,
      sequence: Number(d.sequence),
      title: d.title,
      attempt_count: Number(d.attempt_count),
      submitted_count: Number(d.submitted_count),
    })),
    items: itemsRes.rows.map((row) => ({
      attempt_id: row.attempt_id,
      mahasiswa_id: row.mahasiswa_id,
      student_name: row.student_name,
      student_nim: row.student_nim,
      kelas_id: row.kelas_id,
      kelas_kode: row.kelas_kode,
      material_id: row.material_id,
      material_sequence: Number(row.material_sequence),
      material_title: row.material_title,
      submaterial_title: row.submaterial_title,
      exercise_title: row.exercise_title,
      question_type: row.question_type,
      attempt_number: Number(row.attempt_number),
      status: row.status,
      score: row.status === "SUBMITTED" ? toNumberOrNull(row.score) : null,
      started_at: toIsoString(row.started_at),
      submitted_at: toIsoOrNull(row.submitted_at),
    })),
  };
}

export async function getLecturerActivityDetail(
  db: DbClient,
  auth: AuthContext,
  attemptId: string
): Promise<LecturerActivityDetailDto> {
  const lecturer = await requireLecturer(db, auth);

  const headerRes = await db.query<{
    attempt_id: string;
    exercise_id: string;
    student_name: string;
    student_nim: string;
    kelas_nama: string;
    kelas_kode: string;
    material_title: string;
    submaterial_title: string;
    exercise_title: string;
    question_type: QuestionType;
    attempt_number: number | string;
    status: AttemptStatus;
    score: string | number | null;
    started_at: Date | string;
    submitted_at: Date | string | null;
  }>(
    `SELECT
       ea.exercise_attempt_id AS attempt_id,
       ea.exercise_id,
       m.nama AS student_name,
       m.nim AS student_nim,
       k.nama AS kelas_nama,
       k.kode AS kelas_kode,
       mat.title AS material_title,
       sm.title AS submaterial_title,
       e.title AS exercise_title,
       e.question_type,
       ea.attempt_no AS attempt_number,
       ea.status,
       ea.score,
       ea.started_at,
       ea.submitted_at
     FROM public.exercise_attempt ea
     JOIN public.mahasiswa m ON m.mahasiswa_id = ea.mahasiswa_id
     JOIN public.kelas k ON k.kelas_id = m.kelas_id
     JOIN public.exercise e ON e.exercise_id = ea.exercise_id
     JOIN public.sub_material sm ON sm.submaterial_id = e.submaterial_id
     JOIN public.material mat ON mat.material_id = sm.material_id
     WHERE ea.exercise_attempt_id = $1
       AND k.dosen_id = $2
       AND m.kelas_id IS NOT NULL`,
    [attemptId, lecturer.dosen_id]
  );

  const header = headerRes.rows[0];
  if (!header) {
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
    correct_answer_snapshot: CanonicalStudentAnswer | null;
    correct_option_id: string | null;
    correct_boolean: boolean | null;
    correct_text: string | null;
    is_correct: boolean | null;
    explanation: string | null;
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
       ans.correct_answer_snapshot,
       q.correct_option_id,
       q.correct_boolean,
       q.correct_text,
       ans.is_correct,
       q.explanation,
       COALESCE(ans.time_spent_seconds, 0)::int AS time_spent_seconds
     FROM public.exercise_question q
     LEFT JOIN public.exercise_answer ans
       ON ans.exercise_question_id = q.exercise_question_id
      AND ans.exercise_attempt_id = $1
     WHERE q.exercise_id = $2
     ORDER BY q.sequence ASC`,
    [header.attempt_id, header.exercise_id]
  );

  const items = itemsRes.rows.map((row) => {
    const options = (row.options ?? []).map(mapQuestionOption);
    const keyCanonical: CanonicalStudentAnswer | null =
      row.correct_answer_snapshot ??
      (row.question_type === "MC" && row.correct_option_id
        ? { option_id: row.correct_option_id }
        : row.question_type === "TF" && row.correct_boolean !== null
          ? { value: row.correct_boolean }
          : row.question_type === "FIB" && row.correct_text !== null
            ? { value: row.correct_text }
            : null);

    return {
      question_id: row.question_id,
      sequence: Number(row.sequence),
      question_text: row.question_text,
      question_type: row.question_type,
      options,
      student_answer_display: formatAnswerDisplay(
        row.question_type,
        row.student_answer,
        options
      ),
      correct_answer_display:
        formatAnswerDisplay(row.question_type, keyCanonical, options) ?? "-",
      is_correct: row.is_correct ?? null,
      explanation: row.explanation ?? null,
      time_spent_seconds: Number(row.time_spent_seconds),
    };
  });

  const startedAtIso = toIsoString(header.started_at);
  const submittedAtIso = toIsoOrNull(header.submitted_at);
  const totalDurationSeconds = submittedAtIso
    ? Math.max(
        0,
        Math.floor(
          (new Date(submittedAtIso).getTime() - new Date(startedAtIso).getTime()) /
            1000
        )
      )
    : items.reduce((sum, item) => sum + item.time_spent_seconds, 0);

  return {
    attempt_id: header.attempt_id,
    student_name: header.student_name,
    student_nim: header.student_nim,
    kelas_nama: header.kelas_nama,
    kelas_kode: header.kelas_kode,
    material_title: header.material_title,
    submaterial_title: header.submaterial_title,
    exercise_title: header.exercise_title,
    question_type: header.question_type,
    fib_evaluation_method: FIB_EVALUATION_LABEL,
    attempt_number: Number(header.attempt_number),
    status: header.status,
    score: header.status === "SUBMITTED" ? toNumberOrNull(header.score) : null,
    started_at: startedAtIso,
    submitted_at: submittedAtIso,
    total_duration_seconds: totalDurationSeconds,
    correct_count: items.filter((item) => item.is_correct === true).length,
    incorrect_count: items.filter((item) => item.is_correct === false).length,
    items,
  };
}

export async function listLecturerEvaluations(
  db: DbClient,
  auth: AuthContext,
  filters: { kelasId?: string; search?: string }
): Promise<LecturerEvaluationsResponseDto> {
  const lecturer = await requireLecturer(db, auth);
  if (filters.kelasId) {
    await assertLecturerClass(db, lecturer.dosen_id, filters.kelasId);
  }

  const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;

  const classesRes = await db.query<{
    kelas_id: string;
    nama: string;
    kode: string;
  }>(
    `SELECT kelas_id, nama, kode
     FROM public.kelas
     WHERE dosen_id = $1
     ORDER BY tahun_akademik DESC, kode ASC`,
    [lecturer.dosen_id]
  );

  const rowsRes = await db.query<{
    mahasiswa_id: string;
    nama: string;
    nim: string;
    kelas_id: string;
    kelas_kode: string;
    kelas_nama: string;
    pre_status: TestOverviewStatus;
    pre_score: string | number | null;
    post_status: TestOverviewStatus;
    post_score: string | number | null;
  }>(
    `SELECT
       m.mahasiswa_id,
       m.nama,
       m.nim,
       k.kelas_id,
       k.kode AS kelas_kode,
       k.nama AS kelas_nama,
       COALESCE(MAX(CASE WHEN t.test_type = 'PRE' THEN ta.status END), 'NOT_STARTED') AS pre_status,
       MAX(CASE WHEN t.test_type = 'PRE' AND ta.status = 'SUBMITTED' THEN ta.score END) AS pre_score,
       COALESCE(MAX(CASE WHEN t.test_type = 'POST' THEN ta.status END), 'NOT_STARTED') AS post_status,
       MAX(CASE WHEN t.test_type = 'POST' AND ta.status = 'SUBMITTED' THEN ta.score END) AS post_score
     FROM public.mahasiswa m
     JOIN public.kelas k ON k.kelas_id = m.kelas_id
     LEFT JOIN public.test_attempt ta ON ta.mahasiswa_id = m.mahasiswa_id
     LEFT JOIN public.test t ON t.test_id = ta.test_id
     WHERE k.dosen_id = $1
       AND m.kelas_id IS NOT NULL
       AND ($2::uuid IS NULL OR k.kelas_id = $2::uuid)
       AND ($3::text IS NULL OR m.nama ILIKE $3 OR m.nim ILIKE $3)
     GROUP BY m.mahasiswa_id, m.nama, m.nim, k.kelas_id, k.kode, k.nama
     ORDER BY k.kode ASC, m.nim ASC, m.nama ASC`,
    [lecturer.dosen_id, filters.kelasId ?? null, search]
  );

  const items = rowsRes.rows.map((row) => {
    const preScore =
      row.pre_status === "SUBMITTED" ? toNumberOrNull(row.pre_score) : null;
    const postScore =
      row.post_status === "SUBMITTED" ? toNumberOrNull(row.post_score) : null;
    const deltaScore =
      preScore !== null && postScore !== null
        ? roundTwo(postScore - preScore)
        : null;

    return {
      mahasiswa_id: row.mahasiswa_id,
      nama: row.nama,
      nim: row.nim,
      kelas_id: row.kelas_id,
      kelas_kode: row.kelas_kode,
      kelas_nama: row.kelas_nama,
      pre_status: row.pre_status,
      pre_score: preScore,
      post_status: row.post_status,
      post_score: postScore,
      delta_score: deltaScore,
    };
  });

  const preScores = items
    .map((i) => i.pre_score)
    .filter((s): s is number => s !== null);
  const postScores = items
    .map((i) => i.post_score)
    .filter((s): s is number => s !== null);
  const pairedDeltas = items
    .map((i) => i.delta_score)
    .filter((d): d is number => d !== null);

  return {
    classes: classesRes.rows,
    summary: {
      avg_pre_score:
        preScores.length > 0
          ? roundTwo(preScores.reduce((a, b) => a + b, 0) / preScores.length)
          : null,
      avg_post_score:
        postScores.length > 0
          ? roundTwo(postScores.reduce((a, b) => a + b, 0) / postScores.length)
          : null,
      paired_avg_delta:
        pairedDeltas.length > 0
          ? roundTwo(
              pairedDeltas.reduce((a, b) => a + b, 0) / pairedDeltas.length
            )
          : null,
      pre_submitted_count: preScores.length,
      post_submitted_count: postScores.length,
      paired_count: pairedDeltas.length,
      total_students: items.length,
    },
    items,
  };
}

export async function getLecturerEvaluationDetail(
  db: DbClient,
  auth: AuthContext,
  mahasiswaId: string
): Promise<LecturerEvaluationDetailDto> {
  const lecturer = await requireLecturer(db, auth);

  const studentRes = await db.query<{
    mahasiswa_id: string;
    nama: string;
    nim: string;
    kelas_id: string;
    kelas_kode: string;
    kelas_nama: string;
  }>(
    `SELECT
       m.mahasiswa_id,
       m.nama,
       m.nim,
       k.kelas_id,
       k.kode AS kelas_kode,
       k.nama AS kelas_nama
     FROM public.mahasiswa m
     JOIN public.kelas k ON k.kelas_id = m.kelas_id
     WHERE m.mahasiswa_id = $1
       AND k.dosen_id = $2
       AND m.kelas_id IS NOT NULL`,
    [mahasiswaId, lecturer.dosen_id]
  );

  const student = studentRes.rows[0];
  if (!student) {
    throw new ApiError(404, "not_found");
  }

  const attemptsRes = await db.query<{
    attempt_id: string;
    test_type: TestType;
    status: AttemptStatus;
    score: string | number | null;
    started_at: Date | string;
    submitted_at: Date | string | null;
  }>(
    `SELECT
       ta.test_attempt_id AS attempt_id,
       t.test_type,
       ta.status,
       ta.score,
       ta.started_at,
       ta.submitted_at
     FROM public.test_attempt ta
     JOIN public.test t ON t.test_id = ta.test_id
     WHERE ta.mahasiswa_id = $1`,
    [student.mahasiswa_id]
  );

  const loadBreakdown = async (
    row: (typeof attemptsRes.rows)[number] | undefined
  ): Promise<LecturerTestAttemptBreakdownDto | null> => {
    if (!row) return null;

    const ansRes = await db.query<{
      sequence: number | string;
      question_text: string;
      question_type: QuestionType;
      options: Array<{
        option_id: string;
        text: string;
        sequence: number | string;
      }> | null;
      correct_answer_snapshot: CanonicalStudentAnswer;
      selected_option_id: string | null;
      student_boolean: boolean | null;
      student_text: string | null;
      is_correct: boolean | null;
      answered_at: Date | string | null;
      time_spent_seconds: number | string | null;
    }>(
      `SELECT
         ans.question_sequence AS sequence,
         ans.question_snapshot AS question_text,
         ans.question_type_snapshot AS question_type,
         COALESCE(ans.options_snapshot, '[]'::jsonb) AS options,
         ans.correct_answer_snapshot,
         ans.selected_option_id,
         ans.student_boolean,
         ans.student_text,
         ans.is_correct,
         ans.answered_at,
         COALESCE(ans.time_spent_seconds, 0)::int AS time_spent_seconds
       FROM public.test_answer ans
       WHERE ans.test_attempt_id = $1
       ORDER BY ans.question_sequence ASC`,
      [row.attempt_id]
    );

    const items = ansRes.rows.map((item) => {
      const options = (item.options ?? []).map(mapQuestionOption);
      const studentCanonical: CanonicalStudentAnswer | null =
        item.answered_at === null
          ? null
          : item.question_type === "MC" && item.selected_option_id
            ? { option_id: item.selected_option_id }
            : item.question_type === "TF" && item.student_boolean !== null
              ? { value: item.student_boolean }
              : item.question_type === "FIB" && item.student_text !== null
                ? { value: item.student_text }
                : null;

      return {
        sequence: Number(item.sequence),
        question_text: item.question_text,
        question_type: item.question_type,
        options,
        student_answer_display: formatAnswerDisplay(
          item.question_type,
          studentCanonical,
          options
        ),
        correct_answer_display:
          formatAnswerDisplay(
            item.question_type,
            item.correct_answer_snapshot,
            options
          ) ?? "-",
        is_correct: item.is_correct ?? null,
        time_spent_seconds: Number(item.time_spent_seconds ?? 0),
      };
    });

    return {
      attempt_id: row.attempt_id,
      test_type: row.test_type,
      status: row.status,
      score: row.status === "SUBMITTED" ? toNumberOrNull(row.score) : null,
      started_at: toIsoString(row.started_at),
      submitted_at: toIsoOrNull(row.submitted_at),
      items,
    };
  };

  const preAttempt = await loadBreakdown(
    attemptsRes.rows.find((r) => r.test_type === "PRE")
  );
  const postAttempt = await loadBreakdown(
    attemptsRes.rows.find((r) => r.test_type === "POST")
  );

  const preScore = preAttempt?.status === "SUBMITTED" ? preAttempt.score : null;
  const postScore =
    postAttempt?.status === "SUBMITTED" ? postAttempt.score : null;
  const deltaScore =
    preScore !== null && postScore !== null
      ? roundTwo(postScore - preScore)
      : null;

  return {
    student,
    summary: {
      pre_status: preAttempt?.status ?? "NOT_STARTED",
      pre_score: preScore,
      post_status: postAttempt?.status ?? "NOT_STARTED",
      post_score: postScore,
      delta_score: deltaScore,
    },
    pre_attempt: preAttempt,
    post_attempt: postAttempt,
  };
}

export async function exportLecturerEvaluationsCsv(
  db: DbClient,
  auth: AuthContext,
  kelasId: string
): Promise<{ filename: string; csv: string }> {
  const lecturer = await requireLecturer(db, auth);
  const classRes = await db.query<{ kode: string }>(
    `SELECT kode FROM public.kelas WHERE kelas_id = $1 AND dosen_id = $2`,
    [kelasId, lecturer.dosen_id]
  );
  const kelas = classRes.rows[0];
  if (!kelas) {
    throw new ApiError(404, "not_found");
  }

  const data = await listLecturerEvaluations(db, auth, { kelasId });
  const csv = buildEvaluationsCsv(data.items);
  const safeCode = kelas.kode.replace(/[^a-zA-Z0-9_-]/g, "_");
  return {
    filename: `evaluasi-${safeCode}.csv`,
    csv,
  };
}

export async function createLecturerClass(
  db: DbClient,
  auth: AuthContext,
  input: LecturerClassPayload
): Promise<LecturerClassSummaryDto> {
  const lecturer = await requireLecturer(db, auth);
  const res = await db.query<{
    kelas_id: string;
    nama: string;
    kode: string;
    tahun_akademik: string;
    semester: string;
  }>(
    `SELECT kelas_id, nama, kode, tahun_akademik, semester
     FROM public.fn_lecturer_create_class($1, $2, $3, $4)`,
    [input.nama, input.kode, input.tahun_akademik, input.semester]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(500, "server_error");
  }

  return {
    kelas_id: row.kelas_id,
    nama: row.nama,
    kode: row.kode,
    tahun_akademik: row.tahun_akademik,
    semester: row.semester,
    dosen_nama: lecturer.nama,
    student_count: 0,
  };
}

export async function updateLecturerClass(
  db: DbClient,
  auth: AuthContext,
  kelasId: string,
  input: LecturerClassPayload
): Promise<LecturerClassSummaryDto> {
  const lecturer = await requireLecturer(db, auth);
  const res = await db.query<{
    kelas_id: string;
    nama: string;
    kode: string;
    tahun_akademik: string;
    semester: string;
  }>(
    `SELECT kelas_id, nama, kode, tahun_akademik, semester
     FROM public.fn_lecturer_update_class($1, $2, $3, $4, $5)`,
    [kelasId, input.nama, input.kode, input.tahun_akademik, input.semester]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(404, "not_found");
  }

  const countRes = await db.query<{ student_count: number | string }>(
    `SELECT COUNT(mahasiswa_id)::int AS student_count
     FROM public.mahasiswa
     WHERE kelas_id = $1`,
    [kelasId]
  );

  return {
    kelas_id: row.kelas_id,
    nama: row.nama,
    kode: row.kode,
    tahun_akademik: row.tahun_akademik,
    semester: row.semester,
    dosen_nama: lecturer.nama,
    student_count: Number(countRes.rows[0]?.student_count ?? 0),
  };
}

export async function deleteLecturerClass(
  db: DbClient,
  auth: AuthContext,
  kelasId: string
): Promise<{ deleted_kelas_id: string }> {
  await requireLecturer(db, auth);
  const res = await db.query<{ kelas_id: string }>(
    `SELECT public.fn_lecturer_delete_class($1) AS kelas_id`,
    [kelasId]
  );
  const row = res.rows[0];
  if (!row) {
    throw new ApiError(404, "not_found");
  }
  return { deleted_kelas_id: row.kelas_id };
}

export async function removeStudentFromLecturerClass(
  db: DbClient,
  auth: AuthContext,
  kelasId: string,
  mahasiswaId: string
): Promise<{ removed_mahasiswa_id: string; kelas_id: string }> {
  await requireLecturer(db, auth);
  const res = await db.query<{ mahasiswa_id: string }>(
    `SELECT public.fn_lecturer_remove_student_from_class($1, $2) AS mahasiswa_id`,
    [kelasId, mahasiswaId]
  );
  const row = res.rows[0];
  if (!row) {
    throw new ApiError(404, "not_found");
  }
  return {
    removed_mahasiswa_id: row.mahasiswa_id,
    kelas_id: kelasId,
  };
}
