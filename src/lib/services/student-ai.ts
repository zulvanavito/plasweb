import { evaluateAiGuardrail, type GuardrailTarget } from "@/lib/ai/guardrail";
import { getAiProvider, type AiProvider } from "@/lib/ai/provider";
import {
  buildGuardrailCorrectionPrompt,
  buildSocraticSystemInstruction,
  buildSocraticUserPrompt,
  type SocraticPromptContext,
} from "@/lib/ai/socratic-prompt";
import type { AuthContext } from "@/lib/auth/verify-token";
import { withUserTransaction, type DbClient } from "@/lib/db/pool";
import type {
  AiAskResponseDto,
  AiQuotaDto,
  QuestionType,
} from "@/lib/dto/student-mappers";
import { ApiError } from "@/lib/http/errors";
import { computePayloadHash } from "@/lib/http/idempotency";
import type { AiAskInput } from "@/lib/validation/schemas";

export async function getAiQuota(
  db: DbClient,
  auth: AuthContext
): Promise<AiQuotaDto> {
  const res = await db.query<{
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
           WHERE u.mahasiswa_id = m.mahasiswa_id
             AND u.usage_date = timezone('Asia/Makassar', statement_timestamp())::date
             AND u.status IN ('PENDING', 'SUCCESS')
         )
       )::int AS remaining_quota
     FROM public.mahasiswa m
     WHERE m.auth_user_id = $1`,
    [auth.userId]
  );

  const row = res.rows[0];
  if (!row) {
    throw new ApiError(404, "profile_not_found");
  }

  return {
    remaining_quota: Number(row.remaining_quota),
    daily_limit: 10,
    usage_date: row.usage_date,
  };
}

interface ReservationResult {
  reservationStatus: "reserved" | "already_processed";
  remainingQuota: number;
  promptContext: SocraticPromptContext;
  guardrailTarget?: GuardrailTarget;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

async function loadQuestionContextWithoutLeakingKeys(
  db: DbClient,
  input: AiAskInput
): Promise<{
  promptContext: SocraticPromptContext;
  guardrailTarget?: GuardrailTarget;
}> {
  const promptContext: SocraticPromptContext = {};
  let guardrailTarget: GuardrailTarget | undefined;

  if (input.submaterial_id) {
    const subRes = await db.query<{ title: string; content: string }>(
      `SELECT title, content FROM public.sub_material WHERE submaterial_id = $1`,
      [input.submaterial_id]
    );
    const sub = subRes.rows[0];
    if (!sub) {
      throw new ApiError(404, "not_found");
    }
    promptContext.submaterialTitle = sub.title;
    promptContext.submaterialContent = sub.content;
  }

  if (input.exercise_question_id) {
    const qRes = await db.query<{
      question_text: string;
      question_type: QuestionType;
      correct_option_id: string | null;
      correct_boolean: boolean | null;
      correct_text: string | null;
    }>(
      `SELECT
         question_text,
         question_type,
         correct_option_id,
         correct_boolean,
         correct_text
       FROM public.exercise_question
       WHERE exercise_question_id = $1`,
      [input.exercise_question_id]
    );
    const q = qRes.rows[0];
    if (!q) {
      throw new ApiError(404, "not_found");
    }

    promptContext.questionText = q.question_text;
    promptContext.questionType = q.question_type;

    let correctOptionText: string | null = null;
    let correctOptionLetter: string | null = null;

    if (q.question_type === "MC") {
      const optsRes = await db.query<{
        exercise_question_option_id: string;
        option_text: string;
      }>(
        `SELECT exercise_question_option_id, option_text
         FROM public.exercise_question_option
         WHERE exercise_question_id = $1
         ORDER BY sequence ASC`,
        [input.exercise_question_id]
      );
      promptContext.options = optsRes.rows.map((opt, idx) => {
        const label = OPTION_LETTERS[idx] ?? String(idx + 1);
        if (opt.exercise_question_option_id === q.correct_option_id) {
          correctOptionText = opt.option_text;
          correctOptionLetter = label;
        }
        return { label, text: opt.option_text };
      });
    }

    guardrailTarget = {
      questionType: q.question_type,
      questionText: q.question_text,
      correctOptionText,
      correctOptionLetter,
      correctBoolean: q.correct_boolean,
      correctText: q.correct_text,
    };
  }

  return { promptContext, guardrailTarget };
}

export interface AskAiDeps {
  runTx?: <T>(
    auth: AuthContext,
    fn: (db: DbClient) => Promise<T>
  ) => Promise<T>;
  provider?: AiProvider;
  staleMinutes?: number;
}

export async function askAiOrchestrator(
  auth: AuthContext,
  input: AiAskInput,
  requestId: string,
  deps?: AskAiDeps
): Promise<AiAskResponseDto> {
  const runTx = deps?.runTx ?? withUserTransaction;
  const provider = deps?.provider ?? getAiProvider();
  const rawStale =
    deps?.staleMinutes ?? Number(process.env.AI_PENDING_TIMEOUT_MINUTES ?? 5);
  const staleMinutes =
    Number.isFinite(rawStale) && rawStale >= 1 ? Math.floor(rawStale) : 5;

  const payloadHash = computePayloadHash({
    question: input.question,
    submaterial_id: input.submaterial_id ?? null,
    exercise_question_id: input.exercise_question_id ?? null,
    hint_level: input.hint_level,
  });

  // Transaksi 1: Validasi konteks & reservasi atomik slot kuota AI (COMMIT sebelum LLM)
  const reservation = await runTx<ReservationResult>(auth, async (db) => {
    const { promptContext, guardrailTarget } =
      await loadQuestionContextWithoutLeakingKeys(db, input);

    const resv = await db.query<{
      reservation_status: "reserved" | "already_processed";
      remaining_quota: number | string;
    }>(`SELECT * FROM public.fn_reserve_ai_usage($1, $2, $3)`, [
      requestId,
      payloadHash,
      staleMinutes,
    ]);

    const row = resv.rows[0];
    if (!row) {
      throw new ApiError(500, "server_error");
    }

    return {
      reservationStatus: row.reservation_status,
      remainingQuota: Number(row.remaining_quota),
      promptContext,
      guardrailTarget,
    };
  });

  if (reservation.reservationStatus === "already_processed") {
    return {
      status: "already_processed",
      answer: null,
      hint_level: null,
      remaining_quota: reservation.remainingQuota,
    };
  }

  // Tahap LLM & Output Guardrail berjalan di luar transaksi DB
  const systemInstruction = buildSocraticSystemInstruction(input.hint_level);
  const userPrompt = buildSocraticUserPrompt(
    input.question,
    reservation.promptContext
  );

  let answer: string;
  try {
    const draft1 = await provider.generate({
      systemInstruction,
      userPrompt,
    });
    const check1 = evaluateAiGuardrail(draft1, reservation.guardrailTarget);

    if (check1.ok) {
      answer = draft1.trim();
    } else {
      const draft2 = await provider.generate({
        systemInstruction,
        userPrompt: buildGuardrailCorrectionPrompt(
          userPrompt,
          draft1,
          check1.reason ?? "policy_violation"
        ),
      });
      const check2 = evaluateAiGuardrail(draft2, reservation.guardrailTarget);
      if (!check2.ok) {
        throw new ApiError(502, "ai_service_error");
      }
      answer = draft2.trim();
    }
  } catch (err) {
    try {
      await runTx(auth, async (db) => {
        await db.query(`SELECT * FROM public.fn_finalize_ai_usage($1, 'FAILED')`, [
          requestId,
        ]);
      });
    } catch {
      // Tetap kembalikan error layanan AI asli; stale PENDING akan dibersihkan rekonsiler.
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, "ai_service_error");
  }

  // Transaksi 2: Finalisasi SUCCESS
  const finalRes = await runTx<{ remaining_quota: number }>(auth, async (db) => {
    const res = await db.query<{ remaining_quota: number | string }>(
      `SELECT * FROM public.fn_finalize_ai_usage($1, 'SUCCESS')`,
      [requestId]
    );
    return {
      remaining_quota: Number(
        res.rows[0]?.remaining_quota ?? reservation.remainingQuota
      ),
    };
  });

  return {
    status: "success",
    answer,
    hint_level: input.hint_level,
    remaining_quota: finalRes.remaining_quota,
  };
}
