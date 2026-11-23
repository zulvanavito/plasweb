import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "quota_exceeded"
  | "not_found"
  | "profile_not_found"
  | "idempotency_conflict"
  | "nim_conflict"
  | "profile_conflict"
  | "class_locked"
  | "prerequisite_not_met"
  | "attempt_exists"
  | "attempt_limit_reached"
  | "attempt_submitted"
  | "already_answered"
  | "already_submitted"
  | "wrong_sequence"
  | "incomplete_answers"
  | "invalid_state_transition"
  | "request_in_progress"
  | "invalid_answer"
  | "invalid_option"
  | "type_mismatch"
  | "option_not_mc"
  | "test_empty"
  | "ai_service_error"
  | "ai_timeout"
  | "server_error";

export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  validation_error: "Data yang dikirim tidak valid. Periksa kembali isian Anda.",
  unauthorized: "Sesi login Anda telah berakhir. Silakan masuk kembali.",
  forbidden: "Akun Anda tidak memiliki izin untuk mengakses fitur ini.",
  quota_exceeded:
    "Kuota harian 10 permintaan AI telah habis (0/10). Kuota direset otomatis pukul 00:00 WITA.",
  not_found: "Data yang diminta tidak ditemukan.",
  profile_not_found: "Profil mahasiswa belum dilengkapi.",
  idempotency_conflict:
    "Permintaan gagal diproses karena konflik kunci idempotensi dengan data berbeda.",
  nim_conflict:
    "NIM tersebut telah terdaftar pada akun mahasiswa lain. Periksa kembali NIM Anda.",
  profile_conflict:
    "Akun ini sudah terdaftar dengan peran lain dan tidak dapat digunakan sebagai akun mahasiswa.",
  class_locked:
    "Kelas tidak dapat diubah karena Pre-test Anda telah dikumpulkan (SUBMITTED).",
  prerequisite_not_met:
    "Post-test belum dapat dimulai. Selesaikan seluruh latihan wajib pada 7 materi terlebih dahulu.",
  attempt_exists: "Anda sudah memiliki sesi pengerjaan untuk tes ini.",
  attempt_limit_reached:
    "Batas maksimal 3/3 percobaan latihan pada SubMateri ini telah tercapai. Anda tetap dapat meninjau riwayat attempt sebelumnya.",
  attempt_submitted:
    "Sesi ini sudah dikumpulkan sebelumnya dan tidak dapat diubah lagi.",
  already_answered: "Soal ini sudah dijawab sebelumnya.",
  already_submitted: "Percobaan ini sudah dikumpulkan sebelumnya.",
  wrong_sequence: "Soal harus dikerjakan secara berurutan sesuai sesi tes.",
  incomplete_answers:
    "Masih ada soal yang belum dijawab. Lengkapi semua soal sebelum mengumpulkan.",
  invalid_state_transition:
    "Perubahan status sesi tidak valid. Muat ulang halaman untuk sinkronisasi.",
  request_in_progress:
    "Permintaan sebelumnya masih diproses. Tunggu sebentar sebelum mencoba lagi.",
  invalid_answer:
    "Format jawaban tidak sesuai ketentuan atau melebihi batas 255 karakter.",
  invalid_option: "Pilihan jawaban tidak ditemukan pada soal ini.",
  type_mismatch: "Tipe soal dan format jawaban tidak sesuai.",
  option_not_mc: "Opsi jawaban hanya berlaku untuk soal pilihan ganda.",
  test_empty: "Instrumen tes belum memiliki daftar soal yang tersedia.",
  ai_service_error:
    "Layanan AI sedang tidak dapat dijangkau. Kuota harian Anda tidak dikurangi; silakan coba lagi.",
  ai_timeout:
    "Layanan AI sedang tidak dapat dijangkau. Kuota harian Anda tidak dikurangi; silakan coba lagi.",
  server_error: "Terjadi gangguan pada server. Silakan coba beberapa saat lagi.",
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface MapErrorOptions {
  st001Code?: "already_submitted" | "attempt_submitted";
  notFoundCode?: "not_found" | "profile_not_found";
}

interface PgErrorShape {
  code: string;
  message?: string;
  constraint?: string;
}

const SQLSTATE_MAP: Record<string, { status: number; code: ApiErrorCode }> = {
  DBR03: { status: 422, code: "type_mismatch" },
  DBR04: { status: 422, code: "option_not_mc" },
  DBR05: { status: 409, code: "attempt_limit_reached" },
  DBR06: { status: 409, code: "already_answered" },
  DBR07: { status: 409, code: "attempt_exists" },
  DBR08: { status: 409, code: "wrong_sequence" },
  DBR10: { status: 409, code: "attempt_submitted" },
  DBR11: { status: 403, code: "quota_exceeded" },
  DBR13: { status: 409, code: "profile_conflict" },
  DBR14: { status: 409, code: "class_locked" },
  DBR15: { status: 409, code: "prerequisite_not_met" },
  ID001: { status: 409, code: "idempotency_conflict" },
  AN001: { status: 422, code: "invalid_answer" },
  OP001: { status: 422, code: "invalid_option" },
  AU001: { status: 403, code: "forbidden" },
  ST001: { status: 409, code: "already_submitted" },
  ST002: { status: 409, code: "incomplete_answers" },
  ST003: { status: 409, code: "already_answered" },
  ST004: { status: 409, code: "invalid_state_transition" },
  ST005: { status: 409, code: "request_in_progress" },
  TE001: { status: 422, code: "test_empty" },
};

function isPgError(err: unknown): err is PgErrorShape {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}

export function mapDatabaseError(
  err: unknown,
  opts?: MapErrorOptions
): ApiError | null {
  if (!isPgError(err)) return null;

  if (err.code === "ST001") {
    const code = opts?.st001Code ?? "already_submitted";
    return new ApiError(409, code);
  }

  const mapped = SQLSTATE_MAP[err.code];
  if (mapped) {
    return new ApiError(mapped.status, mapped.code);
  }

  if (err.code === "23505") {
    if (
      err.constraint === "mahasiswa_nim_key" ||
      err.message?.includes("mahasiswa_nim_key")
    ) {
      return new ApiError(409, "nim_conflict");
    }
    if (
      err.constraint === "mahasiswa_auth_user_id_key" ||
      err.message?.includes("mahasiswa_auth_user_id_key")
    ) {
      return new ApiError(409, "profile_conflict");
    }
    return new ApiError(409, "invalid_state_transition");
  }

  if (err.code === "P0002") {
    const isProfile =
      opts?.notFoundCode === "profile_not_found" ||
      err.message?.toLowerCase().includes("profil mahasiswa");
    return new ApiError(404, isProfile ? "profile_not_found" : "not_found");
  }

  if (err.code === "23503") {
    return new ApiError(404, "not_found");
  }

  if (err.code === "22P02" || err.code === "23502" || err.code === "23514") {
    return new ApiError(400, "validation_error");
  }

  return null;
}

export function mapErrorToResponse(
  err: unknown,
  opts?: MapErrorOptions
): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status }
    );
  }

  const dbMapped = mapDatabaseError(err, opts);
  if (dbMapped) {
    return NextResponse.json(
      { error: { code: dbMapped.code, message: dbMapped.message } },
      { status: dbMapped.status }
    );
  }

  return NextResponse.json(
    { error: { code: "server_error", message: ERROR_MESSAGES.server_error } },
    { status: 500 }
  );
}
