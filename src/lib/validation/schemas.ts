import { z } from "zod";
import { ApiError } from "@/lib/http/errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z
  .string()
  .regex(UUID_REGEX, "Harus berupa UUID valid.");

export type CanonicalStudentAnswer =
  | { option_id: string }
  | { value: boolean }
  | { value: string };

export const createProfileSchema = z
  .object({
    nama: z.string().trim().min(1).max(255),
    nim: z.string().trim().min(1).max(30),
    kelas_id: uuidSchema.nullable().optional(),
  })
  .strict();

export const updateClassSchema = z
  .object({
    kelas_id: uuidSchema.nullable(),
  })
  .strict();

export const lecturerClassPayloadSchema = z
  .object({
    nama: z.string().trim().min(1).max(255),
    kode: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .transform((v) => v.toUpperCase()),
    tahun_akademik: z
      .string()
      .trim()
      .regex(/^\d{4}\/\d{4}$/, "Tahun akademik harus berformat YYYY/YYYY."),
    semester: z.enum(["Ganjil", "Genap"]),
  })
  .strict();

export type LecturerClassPayload = z.infer<typeof lecturerClassPayloadSchema>;

export function parseCanonicalAnswer(raw: unknown): CanonicalStudentAnswer {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ApiError(422, "invalid_answer");
  }

  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length !== 1) {
    throw new ApiError(422, "invalid_answer");
  }

  const [key, val] = entries[0]!;
  if (key === "option_id") {
    if (typeof val !== "string" || !UUID_REGEX.test(val)) {
      throw new ApiError(422, "invalid_answer");
    }
    return { option_id: val };
  }

  if (key === "value") {
    if (typeof val === "boolean") {
      return { value: val };
    }
    if (typeof val === "string" && val.length <= 255) {
      return { value: val };
    }
    throw new ApiError(422, "invalid_answer");
  }

  throw new ApiError(422, "invalid_answer");
}

const rawExerciseAnswerBodySchema = z
  .object({
    question_id: uuidSchema,
    answer: z.unknown(),
    time_spent_seconds: z.number().int().min(0),
  })
  .strict();

export interface SubmitExerciseAnswerBody {
  question_id: string;
  answer: CanonicalStudentAnswer;
  time_spent_seconds: number;
}

export async function parseJsonPayload<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "validation_error");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "validation_error");
  }
  return parsed.data;
}

export async function parseExerciseAnswerBody(
  request: Request
): Promise<SubmitExerciseAnswerBody> {
  const raw = await parseJsonPayload(request, rawExerciseAnswerBodySchema);
  const answer = parseCanonicalAnswer(raw.answer);
  return {
    question_id: raw.question_id,
    answer,
    time_spent_seconds: raw.time_spent_seconds,
  };
}

const rawTestAnswerBodySchema = z
  .object({
    answer: z.unknown(),
  })
  .strict();

export async function parseTestAnswerBody(
  request: Request
): Promise<CanonicalStudentAnswer> {
  const raw = await parseJsonPayload(request, rawTestAnswerBodySchema);
  return parseCanonicalAnswer(raw.answer);
}

export function parsePositiveSequenceParam(raw: string): number {
  const trimmed = raw.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new ApiError(400, "validation_error");
  }
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num > 32767) {
    throw new ApiError(400, "validation_error");
  }
  return num;
}

export const aiAskSchema = z
  .object({
    question: z.string().trim().min(1).max(1000),
    submaterial_id: uuidSchema.nullable().optional(),
    exercise_question_id: uuidSchema.nullable().optional(),
    hint_level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  })
  .strict();

export type AiAskInput = z.infer<typeof aiAskSchema>;

export function parseOptionalUuidQuery(raw: string | null): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (!UUID_REGEX.test(trimmed)) {
    throw new ApiError(400, "validation_error");
  }
  return trimmed;
}

export function parseOptionalDateQuery(raw: string | null): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new ApiError(400, "validation_error");
  }
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new ApiError(400, "validation_error");
  }
  return trimmed;
}

export function parseOptionalEnumQuery<const T extends readonly string[]>(
  raw: string | null,
  allowed: T
): T[number] | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (!allowed.includes(trimmed)) {
    throw new ApiError(400, "validation_error");
  }
  return trimmed as T[number];
}
