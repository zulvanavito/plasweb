import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import {
  toNumberOrNull,
  type ClassInfoDto,
  type StudentProfileDto,
} from "@/lib/dto/student-mappers";
import { ApiError } from "@/lib/http/errors";

interface ProfileQueryRow {
  mahasiswa_id: string;
  nama: string;
  nim: string;
  kelas_id: string | null;
  kelas_nama: string | null;
  kelas_kode: string | null;
  tahun_akademik: string | null;
  semester: string | null;
  dosen_nama: string | null;
  pre_test_submitted: boolean;
  remaining_ai_quota: number | string;
}

interface ClassQueryRow {
  kelas_id: string;
  nama: string;
  kode: string;
  tahun_akademik: string;
  semester: string;
  dosen_nama: string | null;
}

function mapProfileRow(row: ProfileQueryRow): StudentProfileDto {
  const kelas: ClassInfoDto | null = row.kelas_id
    ? {
        kelas_id: row.kelas_id,
        nama: row.kelas_nama ?? "",
        kode: row.kelas_kode ?? "",
        tahun_akademik: row.tahun_akademik ?? "",
        semester: row.semester ?? "",
        dosen_nama: row.dosen_nama ?? null,
      }
    : null;

  return {
    mahasiswa_id: row.mahasiswa_id,
    nama: row.nama,
    nim: row.nim,
    kelas,
    pre_test_submitted: Boolean(row.pre_test_submitted),
    remaining_ai_quota: toNumberOrNull(row.remaining_ai_quota) ?? 0,
  };
}

export async function getStudentProfile(
  db: DbClient,
  auth: AuthContext
): Promise<StudentProfileDto> {
  const res = await db.query<ProfileQueryRow>(
    `SELECT
       m.mahasiswa_id,
       m.nama,
       m.nim,
       k.kelas_id,
       k.nama AS kelas_nama,
       k.kode AS kelas_kode,
       k.tahun_akademik,
       k.semester,
       d.nama AS dosen_nama,
       (
         m.kelas_id IS NOT NULL AND EXISTS (
           SELECT 1
           FROM public.test_attempt ta
           JOIN public.test t ON t.test_id = ta.test_id
           WHERE ta.mahasiswa_id = m.mahasiswa_id
             AND t.test_type = 'PRE'
             AND ta.status = 'SUBMITTED'
         )
       ) AS pre_test_submitted,
       GREATEST(
         0,
         10 - (
           SELECT count(*)::int
           FROM public.ai_usage u
           WHERE u.mahasiswa_id = m.mahasiswa_id
             AND u.usage_date = timezone('Asia/Makassar', statement_timestamp())::date
             AND u.status IN ('PENDING', 'SUCCESS')
         )
       )::int AS remaining_ai_quota
     FROM public.mahasiswa m
     LEFT JOIN public.kelas k ON k.kelas_id = m.kelas_id
     LEFT JOIN public.dosen d ON d.dosen_id = k.dosen_id
     WHERE m.auth_user_id = $1`,
    [auth.userId]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(404, "profile_not_found");
  }
  return mapProfileRow(row);
}

export async function createStudentProfile(
  db: DbClient,
  auth: AuthContext,
  input: { nama: string; nim: string; kelas_id?: string | null }
): Promise<{ profile: StudentProfileDto; created: boolean }> {
  const existing = await db.query<{ nim: string }>(
    `SELECT nim FROM public.mahasiswa WHERE auth_user_id = $1`,
    [auth.userId]
  );

  const existingRow = existing.rows[0];
  if (existingRow) {
    if (existingRow.nim !== input.nim) {
      throw new ApiError(409, "nim_conflict");
    }
    return {
      profile: await getStudentProfile(db, auth),
      created: false,
    };
  }

  await db.query(
    `SELECT * FROM public.fn_upsert_student_profile($1, $2, $3)`,
    [input.nama, input.nim, input.kelas_id ?? null]
  );

  return {
    profile: await getStudentProfile(db, auth),
    created: true,
  };
}

export async function listClasses(db: DbClient): Promise<ClassInfoDto[]> {
  const res = await db.query<ClassQueryRow>(
    `SELECT
       k.kelas_id,
       k.nama,
       k.kode,
       k.tahun_akademik,
       k.semester,
       d.nama AS dosen_nama
     FROM public.kelas k
     JOIN public.dosen d ON d.dosen_id = k.dosen_id
     ORDER BY k.tahun_akademik DESC, k.kode ASC`
  );

  return res.rows.map((row) => ({
    kelas_id: row.kelas_id,
    nama: row.nama,
    kode: row.kode,
    tahun_akademik: row.tahun_akademik,
    semester: row.semester,
    dosen_nama: row.dosen_nama ?? null,
  }));
}

export async function updateStudentClass(
  db: DbClient,
  auth: AuthContext,
  kelasId: string | null
): Promise<StudentProfileDto> {
  await db.query(`SELECT * FROM public.fn_update_student_class($1)`, [kelasId]);
  return getStudentProfile(db, auth);
}
