import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GeminiAiProvider,
  GroqAiProvider,
  MockSocraticAiProvider,
  getAiProvider,
  type AiProvider,
} from "@/lib/ai/provider";
import type { AuthContext } from "@/lib/auth/verify-token";
import type { DbClient } from "@/lib/db/pool";
import { ApiError } from "@/lib/http/errors";
import { askAiOrchestrator } from "@/lib/services/student-ai";

const AUTH_STUDENT: AuthContext = {
  userId: "10000000-0000-4000-8000-000000000001",
  role: "authenticated",
};

const MHS_ID = "20000000-0000-4000-8000-000000000001";
const PRE_TEST_ID = "30000000-0000-4000-8000-000000000001";
const POST_TEST_ID = "30000000-0000-4000-8000-000000000002";
const TEST_ATT_ID = "40000000-0000-4000-8000-000000000001";
const SUB_ID = "50000000-0000-4000-8000-000000000001";
const EX_Q_ID = "60000000-0000-4000-8000-000000000001";
const OPT_A_ID = "70000000-0000-4000-8000-000000000001";
const OPT_B_ID = "70000000-0000-4000-8000-000000000002";
const REQ_KEY = "a0000000-0000-4000-8000-000000000001";

let activeDbHandler: (sql: string, params?: unknown[]) => { rows: unknown[] };

vi.mock("@/lib/auth/verify-token", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/verify-token")>(
    "@/lib/auth/verify-token"
  );
  return {
    ...actual,
    authenticateRequest: vi.fn(async (req: Request) => {
      if (!req.headers.get("authorization")) {
        throw new ApiError(401, "unauthorized");
      }
      return AUTH_STUDENT;
    }),
  };
});

vi.mock("@/lib/db/pool", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/pool")>(
    "@/lib/db/pool"
  );
  return {
    ...actual,
    withUserTransaction: vi.fn(
      async <T>(_auth: AuthContext, fn: (db: DbClient) => Promise<T>) => {
        const fakeDb: DbClient = {
          query: async (sql: string, params?: unknown[]) =>
            activeDbHandler(sql, params) as never,
        };
        return fn(fakeDb);
      }
    ),
  };
});

import * as aiAskRoute from "@/app/api/ai/ask/route";
import * as aiQuotaRoute from "@/app/api/ai/quota/route";
import * as testAttemptAnswerRoute from "@/app/api/test-attempts/[attemptId]/questions/[sequence]/answers/route";
import * as testAttemptStartQRoute from "@/app/api/test-attempts/[attemptId]/questions/[sequence]/start/route";
import * as testAttemptResumeRoute from "@/app/api/test-attempts/[attemptId]/resume/route";
import * as testAttemptDetailRoute from "@/app/api/test-attempts/[attemptId]/route";
import * as testAttemptSubmitRoute from "@/app/api/test-attempts/[attemptId]/submit/route";
import * as testsAttemptsRoute from "@/app/api/tests/[testId]/attempts/route";
import * as testsRoute from "@/app/api/tests/route";

const FORBIDDEN_KEYS = new Set([
  "correct_option_id",
  "correct_boolean",
  "correct_text",
  "correct_answer",
  "correct_answer_snapshot",
  "explanation",
  "payload_hash",
]);

function assertNoTestSecrets(node: unknown, ctx: string): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) assertNoTestSecrets(item, ctx);
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    expect(FORBIDDEN_KEYS.has(k), `Forbidden key ${k} in ${ctx}`).toBe(false);
    assertNoTestSecrets(v, ctx);
  }
}

function authReq(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: {
      Authorization: "Bearer mock-jwt",
      ...(init.headers ?? {}),
    },
  });
}

describe("Tahap 3 — 7 Endpoint Tes Linear (§4.4) & 2 Endpoint AI Socratic (§4.5)", () => {
  beforeEach(() => {
    activeDbHandler = () => ({ rows: [] });
  });

  it("4.4 GET /api/tests dan POST /api/tests/[testId]/attempts (DBR-15, replay 200 vs baru 201)", async () => {
    let completedEx = 10;
    activeDbHandler = (sql) => {
      if (sql.includes("SELECT mahasiswa_id FROM public.mahasiswa")) {
        return { rows: [{ mahasiswa_id: MHS_ID }] };
      }
      if (sql.includes("AS completed_exercises")) {
        return {
          rows: [{ total_exercises: 20, completed_exercises: completedEx }],
        };
      }
      return {
        rows: [
          {
            test_id: PRE_TEST_ID,
            test_type: "PRE",
            title: "Pre-Test PLAS-TypeScript",
            question_count: 20,
            attempt_id: null,
            attempt_status: null,
            attempt_score: null,
          },
          {
            test_id: POST_TEST_ID,
            test_type: "POST",
            title: "Post-Test PLAS-TypeScript",
            question_count: 20,
            attempt_id: null,
            attempt_status: null,
            attempt_score: null,
          },
        ],
      };
    };

    const overviewBlocked = await testsRoute.GET(
      authReq("http://localhost/api/tests")
    );
    expect(overviewBlocked.status).toBe(200);
    const blockedJson = (await overviewBlocked.json()) as {
      pre_test: { is_eligible: boolean };
      post_test: { is_eligible: boolean; completed_exercises: number };
    };
    expect(blockedJson.pre_test.is_eligible).toBe(true);
    expect(blockedJson.post_test.is_eligible).toBe(false);
    expect(blockedJson.post_test.completed_exercises).toBe(10);

    completedEx = 20;
    const overviewEligible = await testsRoute.GET(
      authReq("http://localhost/api/tests")
    );
    expect(
      ((await overviewEligible.json()) as { post_test: { is_eligible: boolean } })
        .post_test.is_eligible
    ).toBe(true);

    // POST /api/tests/[testId]/attempts DBR15 -> 409 prerequisite_not_met
    activeDbHandler = () => {
      throw { code: "DBR15" };
    };
    const dbr15Res = await testsAttemptsRoute.POST(
      authReq(`http://localhost/api/tests/${POST_TEST_ID}/attempts`, {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
      }),
      { params: Promise.resolve({ testId: POST_TEST_ID }) }
    );
    expect(dbr15Res.status).toBe(409);
    expect(((await dbr15Res.json()) as { error: { code: string } }).error.code).toBe(
      "prerequisite_not_met"
    );

    // POST /api/tests/[testId]/attempts baru (201) & replay (200)
    let isReplay = false;
    activeDbHandler = () => ({
      rows: [
        {
          attempt_id: TEST_ATT_ID,
          test_id: PRE_TEST_ID,
          test_type: "PRE",
          status: "IN_PROGRESS",
          total_questions: 20,
          current_sequence: 1,
          started_at: "2026-11-22T02:00:00Z",
          is_replay: isReplay,
        },
      ],
    });
    const startNewRes = await testsAttemptsRoute.POST(
      authReq(`http://localhost/api/tests/${PRE_TEST_ID}/attempts`, {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
      }),
      { params: Promise.resolve({ testId: PRE_TEST_ID }) }
    );
    expect(startNewRes.status).toBe(201);
    const startJson = await startNewRes.json();
    assertNoTestSecrets(startJson, "POST /api/tests/[id]/attempts");
    expect(startJson.first_question).toBeNull();
    expect(startJson.total_questions).toBe(20);

    isReplay = true;
    const replayRes = await testsAttemptsRoute.POST(
      authReq(`http://localhost/api/tests/${PRE_TEST_ID}/attempts`, {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
      }),
      { params: Promise.resolve({ testId: PRE_TEST_ID }) }
    );
    expect(replayRes.status).toBe(200);
  });

  it("4.4 start, answer, resume, submit, & result tes linear tanpa bocor kunci & explanation", async () => {
    const activeQRow = {
      sequence: 1,
      total_questions: 20,
      question_text: "Pertanyaan 1",
      question_type: "MC",
      options: [
        { option_id: OPT_B_ID, text: "Opsi 1", sequence: 1 },
        { option_id: OPT_A_ID, text: "Opsi 2", sequence: 2 },
      ],
      question_started_at: "2026-11-22T02:01:00Z",
    };

    // POST .../questions/1/start
    activeDbHandler = () => ({ rows: [activeQRow] });
    const startQRes = await testAttemptStartQRoute.POST(
      authReq(
        `http://localhost/api/test-attempts/${TEST_ATT_ID}/questions/1/start`,
        { method: "POST" }
      ),
      { params: Promise.resolve({ attemptId: TEST_ATT_ID, sequence: "1" }) }
    );
    expect(startQRes.status).toBe(200);
    const startQJson = await startQRes.json();
    assertNoTestSecrets(startQJson, "POST .../start");
    expect(startQJson.sequence).toBe(1);
    expect(startQJson.options).toHaveLength(2);

    // Sequence 0 atau non-numerik -> 400 validation_error
    const badSeqRes = await testAttemptStartQRoute.POST(
      authReq(
        `http://localhost/api/test-attempts/${TEST_ATT_ID}/questions/0/start`,
        { method: "POST" }
      ),
      { params: Promise.resolve({ attemptId: TEST_ATT_ID, sequence: "0" }) }
    );
    expect(badSeqRes.status).toBe(400);

    // POST .../questions/1/answers
    activeDbHandler = () => ({
      rows: [
        {
          attempt_id: TEST_ATT_ID,
          sequence: 1,
          is_recorded: true,
          answered_at: "2026-11-22T02:01:20Z",
          next_sequence: 2,
        },
      ],
    });
    const ansRes = await testAttemptAnswerRoute.POST(
      authReq(
        `http://localhost/api/test-attempts/${TEST_ATT_ID}/questions/1/answers`,
        {
          method: "POST",
          headers: { "Idempotency-Key": REQ_KEY },
          body: JSON.stringify({ answer: { option_id: OPT_A_ID } }),
        }
      ),
      { params: Promise.resolve({ attemptId: TEST_ATT_ID, sequence: "1" }) }
    );
    expect(ansRes.status).toBe(200);
    expect(await ansRes.json()).toEqual({
      attempt_id: TEST_ATT_ID,
      sequence: 1,
      is_recorded: true,
      answered_at: "2026-11-22T02:01:20.000Z",
      next_sequence: 2,
    });

    // GET .../resume saat SUBMITTED (ST001) -> 409 attempt_submitted
    activeDbHandler = () => {
      throw { code: "ST001" };
    };
    const resumeSubmittedRes = await testAttemptResumeRoute.GET(
      authReq(`http://localhost/api/test-attempts/${TEST_ATT_ID}/resume`),
      { params: Promise.resolve({ attemptId: TEST_ATT_ID }) }
    );
    expect(resumeSubmittedRes.status).toBe(409);
    expect(
      ((await resumeSubmittedRes.json()) as { error: { code: string } }).error
        .code
    ).toBe("attempt_submitted");

    // GET .../resume saat IN_PROGRESS
    activeDbHandler = () => ({
      rows: [{ ...activeQRow, sequence: 2 }],
    });
    const resumeOkRes = await testAttemptResumeRoute.GET(
      authReq(`http://localhost/api/test-attempts/${TEST_ATT_ID}/resume`),
      { params: Promise.resolve({ attemptId: TEST_ATT_ID }) }
    );
    expect(resumeOkRes.status).toBe(200);
    expect(((await resumeOkRes.json()) as { sequence: number }).sequence).toBe(2);

    // POST .../submit -> TestAttemptResultDto
    const itemsRows = [
      {
        sequence: 1,
        question_text: "Pertanyaan 1",
        question_type: "MC",
        is_correct: true,
        time_spent_seconds: 20,
      },
    ];
    activeDbHandler = (sql) => {
      if (sql.includes("fn_finalize_test_attempt")) {
        return {
          rows: [
            {
              attempt_id: TEST_ATT_ID,
              test_id: PRE_TEST_ID,
              test_type: "PRE",
              status: "SUBMITTED",
              score: "95.00",
              total_duration_seconds: 300,
              started_at: "2026-11-22T02:00:00Z",
              submitted_at: "2026-11-22T02:05:00Z",
            },
          ],
        };
      }
      return { rows: itemsRows };
    };
    const submitRes = await testAttemptSubmitRoute.POST(
      authReq(`http://localhost/api/test-attempts/${TEST_ATT_ID}/submit`, {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
      }),
      { params: Promise.resolve({ attemptId: TEST_ATT_ID }) }
    );
    expect(submitRes.status).toBe(200);
    const submitJson = await submitRes.json();
    assertNoTestSecrets(submitJson, "POST /api/test-attempts/[id]/submit");
    expect(submitJson.score).toBe(95);
    expect(submitJson.items).toHaveLength(1);

    // GET /api/test-attempts/[attemptId]
    activeDbHandler = (sql) => {
      if (sql.includes("FROM public.test_attempt ta")) {
        return {
          rows: [
            {
              attempt_id: TEST_ATT_ID,
              test_id: PRE_TEST_ID,
              test_type: "PRE",
              status: "SUBMITTED",
              score: "95.00",
              started_at: "2026-11-22T02:00:00Z",
              submitted_at: "2026-11-22T02:05:00Z",
            },
          ],
        };
      }
      return { rows: itemsRows };
    };
    const getResultRes = await testAttemptDetailRoute.GET(
      authReq(`http://localhost/api/test-attempts/${TEST_ATT_ID}`),
      { params: Promise.resolve({ attemptId: TEST_ATT_ID }) }
    );
    expect(getResultRes.status).toBe(200);
    const resultJson = await getResultRes.json();
    assertNoTestSecrets(resultJson, "GET /api/test-attempts/[id]");
    expect(resultJson.total_duration_seconds).toBe(300);
  });

  it("4.5 GET /api/ai/quota dan pipeline 2-transaksi POST /api/ai/ask (prompt bebas kunci, guardrail retry, dan rollback slot FAILED)", async () => {
    activeDbHandler = () => ({
      rows: [{ usage_date: "2026-11-22", remaining_quota: 7 }],
    });
    const quotaRes = await aiQuotaRoute.GET(
      authReq("http://localhost/api/ai/quota")
    );
    expect(quotaRes.status).toBe(200);
    expect(await quotaRes.json()).toEqual({
      remaining_quota: 7,
      daily_limit: 10,
      usage_date: "2026-11-22",
    });

    // Uji askAiOrchestrator memastikan:
    // (1) Transaksi 1 COMMIT sebelum LLM dipanggil
    // (2) Kunci jawaban tidak pernah masuk prompt LLM
    // (3) Draft pertama bocor kunci MC -> retry 1x -> draft kedua lolos -> finalisasi SUCCESS
    const txSequence: string[] = [];
    const capturedPrompts: string[] = [];

    const mockRunTx: NonNullable<Parameters<typeof askAiOrchestrator>[3]>["runTx"] =
      async (_auth, fn) => {
        const fakeDb: DbClient = {
          query: async (sql: string) => {
            if (sql.includes("FROM public.sub_material")) {
              return {
                rows: [{ title: "Variabel", content: "Gunakan let dan const." }],
              } as never;
            }
            if (sql.includes("FROM public.exercise_question_option")) {
              return {
                rows: [
                  { exercise_question_option_id: OPT_A_ID, option_text: "`const`" },
                  { exercise_question_option_id: OPT_B_ID, option_text: "`let`" },
                ],
              } as never;
            }
            if (sql.includes("FROM public.exercise_question")) {
              return {
                rows: [
                  {
                    question_text: "Kata kunci untuk nilai tetap adalah...",
                    question_type: "MC",
                    correct_option_id: OPT_A_ID,
                    correct_boolean: null,
                    correct_text: null,
                  },
                ],
              } as never;
            }
            if (sql.includes("fn_reserve_ai_usage")) {
              txSequence.push("tx1_reserve");
              return {
                rows: [{ reservation_status: "reserved", remaining_quota: 6 }],
              } as never;
            }
            if (sql.includes("fn_finalize_ai_usage")) {
              txSequence.push(
                sql.includes("'SUCCESS'") ? "tx2_success" : "tx2_failed"
              );
              return { rows: [{ remaining_quota: 6 }] } as never;
            }
            return { rows: [] } as never;
          },
        };
        const out = await fn(fakeDb);
        txSequence.push("tx_commit");
        return out;
      };

    let llmCalls = 0;
    const retryProvider: AiProvider = {
      generate: async ({ systemInstruction, userPrompt }) => {
        txSequence.push("llm_call");
        capturedPrompts.push(`${systemInstruction}\n${userPrompt}`);
        llmCalls++;
        if (llmCalls === 1) {
          return "Pilih opsi A yaitu const sebagai jawabannya.";
        }
        return "Perhatikan apakah nilai variabel pada soal bersifat tetap atau berubah. Kata kunci mana yang mencegah pengubahan ulang nilai?";
      },
    };

    const okResult = await askAiOrchestrator(
      AUTH_STUDENT,
      {
        question: "Apa bedanya?",
        submaterial_id: SUB_ID,
        exercise_question_id: EX_Q_ID,
        hint_level: 2,
      },
      REQ_KEY,
      { runTx: mockRunTx, provider: retryProvider }
    );

    expect(okResult).toEqual({
      status: "success",
      answer:
        "Perhatikan apakah nilai variabel pada soal bersifat tetap atau berubah. Kata kunci mana yang mencegah pengubahan ulang nilai?",
      hint_level: 2,
      remaining_quota: 6,
    });
    expect(txSequence).toEqual([
      "tx1_reserve",
      "tx_commit",
      "llm_call",
      "llm_call",
      "tx2_success",
      "tx_commit",
    ]);
    expect(capturedPrompts[0]).not.toContain(OPT_A_ID);
    expect(capturedPrompts[0]).not.toContain("*(Benar)*");

    // Uji timeout -> 504 ai_timeout + finalisasi FAILED melepas slot
    txSequence.length = 0;
    const timeoutProvider: AiProvider = {
      generate: async () => {
        throw new ApiError(504, "ai_timeout");
      },
    };
    await expect(
      askAiOrchestrator(
        AUTH_STUDENT,
        { question: "Tolong bantu", hint_level: 1 },
        REQ_KEY,
        { runTx: mockRunTx, provider: timeoutProvider }
      )
    ).rejects.toMatchObject({ status: 504, code: "ai_timeout" });
    expect(txSequence).toContain("tx2_failed");

    // Uji Route POST /api/ai/ask untuk replay already_processed & kuota habis DBR11
    activeDbHandler = (sql) => {
      if (sql.includes("fn_reserve_ai_usage")) {
        return {
          rows: [
            { reservation_status: "already_processed", remaining_quota: 6 },
          ],
        };
      }
      return { rows: [] };
    };
    const replayAiRes = await aiAskRoute.POST(
      authReq("http://localhost/api/ai/ask", {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
        body: JSON.stringify({ question: "Apa bedanya?", hint_level: 1 }),
      })
    );
    expect(replayAiRes.status).toBe(200);
    expect(await replayAiRes.json()).toEqual({
      status: "already_processed",
      answer: null,
      hint_level: null,
      remaining_quota: 6,
    });

    activeDbHandler = () => {
      throw { code: "DBR11" };
    };
    const quotaExceededRes = await aiAskRoute.POST(
      authReq("http://localhost/api/ai/ask", {
        method: "POST",
        headers: { "Idempotency-Key": REQ_KEY },
        body: JSON.stringify({ question: "Apa bedanya?", hint_level: 1 }),
      })
    );
    expect(quotaExceededRes.status).toBe(403);
    expect(
      ((await quotaExceededRes.json()) as { error: { code: string } }).error.code
    ).toBe("quota_exceeded");
  });
});

describe("GroqAiProvider & getAiProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("memanggil Groq chat completions dengan parameter Socratic dan mengembalikan konten bersih", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "Coba cek kembali tipe data variabel tersebut. Apa perbedaan antara string dan number di TypeScript?",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GroqAiProvider("gsk-test-key");
    const out = await provider.generate({
      systemInstruction: "Socratic Level 1",
      userPrompt: "Kenapa kode ini error?",
    });

    expect(out).toBe(
      "Coba cek kembali tipe data variabel tersebut. Apa perbedaan antara string dan number di TypeScript?"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer gsk-test-key"
    );

    const parsedBody = JSON.parse(String(init.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature: number;
      max_tokens: number;
    };
    expect(parsedBody).toEqual({
      model: "qwen/qwen3.8-27b",
      messages: [
        { role: "system", content: "Socratic Level 1" },
        { role: "user", content: "Kenapa kode ini error?" },
      ],
      temperature: 0.4,
      max_tokens: 512,
    });
  });

  it("membersihkan blok <think>...</think> Qwen 3 dan melempar 502 jika hasil bersih kosong", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    "<think>\nAnalisis internal langkah demi langkah...\n</think>\n\nPerhatikan anotasi tipe parameter fungsi. Bagian mana yang belum sesuai?",
                },
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "<think>Hanya reasoning internal tanpa output</think>",
                },
              },
            ],
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GroqAiProvider("gsk-test-key", "qwen/qwen3.8-27b");
    const clean = await provider.generate({
      systemInstruction: "Socratic Level 2",
      userPrompt: "Apa maksud pesan tipe ini?",
    });
    expect(clean).toBe(
      "Perhatikan anotasi tipe parameter fungsi. Bagian mana yang belum sesuai?"
    );

    await expect(
      provider.generate({
        systemInstruction: "Socratic Level 2",
        userPrompt: "Ulangi",
      })
    ).rejects.toMatchObject({ status: 502, code: "ai_service_error" });
  });

  it("melempar 502 ai_service_error saat GROQ_API_KEY kosong atau HTTP non-2xx", async () => {
    const fetchMock = vi.fn(
      async () => new Response("rate limited", { status: 429 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const missingKeyProvider = new GroqAiProvider("   ");
    await expect(
      missingKeyProvider.generate({
        systemInstruction: "Sys",
        userPrompt: "User",
      })
    ).rejects.toMatchObject({ status: 502, code: "ai_service_error" });
    expect(fetchMock).not.toHaveBeenCalled();

    const httpErrProvider = new GroqAiProvider("gsk-test-key");
    await expect(
      httpErrProvider.generate({
        systemInstruction: "Sys",
        userPrompt: "User",
      })
    ).rejects.toMatchObject({ status: 502, code: "ai_service_error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("melempar 504 ai_timeout saat AbortController timeout atau fetch dibatalkan", async () => {
    const abortingFetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        })
    );
    vi.stubGlobal("fetch", abortingFetch);

    const provider = new GroqAiProvider("gsk-test-key");
    await expect(
      provider.generate({
        systemInstruction: "Sys",
        userPrompt: "User",
        timeoutMs: 15,
      })
    ).rejects.toMatchObject({ status: 504, code: "ai_timeout" });

    const rejectedAbortFetch = vi.fn(async () => {
      const err = new Error("Timeout");
      err.name = "TimeoutError";
      throw err;
    });
    vi.stubGlobal("fetch", rejectedAbortFetch);

    await expect(
      provider.generate({
        systemInstruction: "Sys",
        userPrompt: "User",
      })
    ).rejects.toMatchObject({ status: 504, code: "ai_timeout" });
  });

  it("getAiProvider memilih GroqAiProvider, MockSocraticAiProvider, atau GeminiAiProvider sesuai AI_PROVIDER", () => {
    const prev = process.env.AI_PROVIDER;
    try {
      process.env.AI_PROVIDER = "groq";
      expect(getAiProvider()).toBeInstanceOf(GroqAiProvider);

      process.env.AI_PROVIDER = "mock";
      expect(getAiProvider()).toBeInstanceOf(MockSocraticAiProvider);

      process.env.AI_PROVIDER = "gemini";
      expect(getAiProvider()).toBeInstanceOf(GeminiAiProvider);

      delete process.env.AI_PROVIDER;
      expect(getAiProvider()).toBeInstanceOf(GeminiAiProvider);
    } finally {
      if (prev === undefined) {
        delete process.env.AI_PROVIDER;
      } else {
        process.env.AI_PROVIDER = prev;
      }
    }
  });
});
