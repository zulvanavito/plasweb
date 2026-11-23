import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import type { PoolClient } from "pg";
import { describe, expect, it } from "vitest";
import {
  extractBearerToken,
  verifyAccessToken,
} from "@/lib/auth/verify-token";
import { runWithUserTransaction } from "@/lib/db/pool";
import {
  ApiError,
  mapErrorToResponse,
} from "@/lib/http/errors";
import {
  canonicalJson,
  computePayloadHash,
  requireIdempotencyKey,
} from "@/lib/http/idempotency";
import {
  createProfileSchema,
  parseCanonicalAnswer,
  parseExerciseAnswerBody,
  parseJsonPayload,
} from "@/lib/validation/schemas";

const VALID_UID = "11111111-1111-4111-8111-111111111111";

describe("Tahap 2 — Core Auth, DB Transaction, Error Mapper, Idempotency & Validation", () => {
  it("memverifikasi JWT ECC P-256 (ES256) via JWKS dan HS256 fallback, serta menolak token invalid", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "dev-es256-1";
    jwk.alg = "ES256";
    const localJwks = createLocalJWKSet({ keys: [jwk] });

    const es256Token = await new SignJWT({
      role: "authenticated",
      email: "mhs@undiksha.ac.id",
    })
      .setProtectedHeader({ alg: "ES256", kid: "dev-es256-1" })
      .setSubject(VALID_UID)
      .setIssuer("https://demo.supabase.co/auth/v1")
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey);

    const verifiedEs256 = await verifyAccessToken(es256Token, {
      supabaseUrl: "https://demo.supabase.co/",
      getKey: localJwks,
    });
    expect(verifiedEs256).toEqual({
      userId: VALID_UID,
      role: "authenticated",
      email: "mhs@undiksha.ac.id",
    });

    // Fallback HS256
    const secret = "super-secret-dev-hs256-key-at-least-32-chars";
    const hs256Token = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(VALID_UID)
      .setIssuer("https://demo.supabase.co/auth/v1")
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(new TextEncoder().encode(secret));

    const verifiedHs256 = await verifyAccessToken(hs256Token, {
      supabaseUrl: "https://demo.supabase.co",
      jwtSecret: secret,
    });
    expect(verifiedHs256.userId).toBe(VALID_UID);

    // Sub bukan UUID harus ditolak 401
    const badSubToken = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "dev-es256-1" })
      .setSubject("not-a-uuid")
      .setIssuer("https://demo.supabase.co/auth/v1")
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey);

    await expect(
      verifyAccessToken(badSubToken, {
        supabaseUrl: "https://demo.supabase.co",
        getKey: localJwks,
      })
    ).rejects.toMatchObject({ status: 401, code: "unauthorized" });

    expect(() => extractBearerToken(null)).toThrowError(ApiError);
    expect(() => extractBearerToken("Basic abc")).toThrowError(ApiError);
  });

  it("runWithUserTransaction membungkus BEGIN + SET LOCAL ROLE plas_api + jwt.claims dan ROLLBACK saat error", async () => {
    const executed: Array<{ sql: string; params?: unknown[] }> = [];
    const fakeClient = {
      query: async (sql: string, params?: unknown[]) => {
        executed.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
    } as unknown as PoolClient;

    const ok = await runWithUserTransaction(
      fakeClient,
      { userId: VALID_UID, role: "authenticated" },
      async (db) => {
        await db.query("SELECT 1");
        return 42;
      }
    );

    expect(ok).toBe(42);
    expect(executed.map((e) => e.sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE plas_api",
      "SELECT set_config('request.jwt.claims', $1, true)",
      "SELECT 1",
      "COMMIT",
    ]);
    expect(executed[2]?.params?.[0]).toBe(
      JSON.stringify({ sub: VALID_UID, role: "authenticated" })
    );

    executed.length = 0;
    await expect(
      runWithUserTransaction(
        fakeClient,
        { userId: VALID_UID, role: "authenticated" },
        async () => {
          throw new Error("boom");
        }
      )
    ).rejects.toThrow("boom");

    expect(executed.map((e) => e.sql)).toEqual([
      "BEGIN",
      "SET LOCAL ROLE plas_api",
      "SELECT set_config('request.jwt.claims', $1, true)",
      "ROLLBACK",
    ]);
  });

  it("mapErrorToResponse memetakan seluruh 21 SQLSTATE, nim_conflict, dan menyembunyikan detail error internal", async () => {
    const cases: Array<[string, number, string]> = [
      ["DBR03", 422, "type_mismatch"],
      ["DBR04", 422, "option_not_mc"],
      ["DBR05", 409, "attempt_limit_reached"],
      ["DBR06", 409, "already_answered"],
      ["DBR07", 409, "attempt_exists"],
      ["DBR08", 409, "wrong_sequence"],
      ["DBR10", 409, "attempt_submitted"],
      ["DBR11", 403, "quota_exceeded"],
      ["DBR13", 409, "profile_conflict"],
      ["DBR14", 409, "class_locked"],
      ["DBR15", 409, "prerequisite_not_met"],
      ["ID001", 409, "idempotency_conflict"],
      ["AN001", 422, "invalid_answer"],
      ["OP001", 422, "invalid_option"],
      ["AU001", 403, "forbidden"],
      ["ST001", 409, "already_submitted"],
      ["ST002", 409, "incomplete_answers"],
      ["ST003", 409, "already_answered"],
      ["ST004", 409, "invalid_state_transition"],
      ["ST005", 409, "request_in_progress"],
      ["TE001", 422, "test_empty"],
    ];

    for (const [sqlState, expectedStatus, expectedCode] of cases) {
      const res = mapErrorToResponse({ code: sqlState });
      expect(res.status).toBe(expectedStatus);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe(expectedCode);
      expect(body.error.message.length).toBeGreaterThan(0);
    }

    // Override ST001 untuk resume test
    const st001Resume = mapErrorToResponse(
      { code: "ST001" },
      { st001Code: "attempt_submitted" }
    );
    expect(((await st001Resume.json()) as { error: { code: string } }).error.code).toBe(
      "attempt_submitted"
    );

    // 23505 pada NIM -> 409 nim_conflict
    const nimRes = mapErrorToResponse({
      code: "23505",
      constraint: "mahasiswa_nim_key",
    });
    expect(nimRes.status).toBe(409);
    expect(((await nimRes.json()) as { error: { code: string } }).error.code).toBe(
      "nim_conflict"
    );

    // P0002 profil vs entitas biasa
    const profRes = mapErrorToResponse({
      code: "P0002",
      message: "profil mahasiswa belum ditemukan",
    });
    expect(profRes.status).toBe(404);
    expect(((await profRes.json()) as { error: { code: string } }).error.code).toBe(
      "profile_not_found"
    );

    // Error tak dikenal -> 500 tanpa bocor pesan asli
    const unknownRes = mapErrorToResponse(
      new Error("SENSITIVE_DB_HOST_LEAK")
    );
    expect(unknownRes.status).toBe(500);
    const unknownBody = (await unknownRes.json()) as {
      error: { code: string; message: string };
    };
    expect(unknownBody.error.code).toBe("server_error");
    expect(unknownBody.error.message).not.toContain("SENSITIVE_DB_HOST_LEAK");
  });

  it("canonicalJson, computePayloadHash, dan requireIdempotencyKey bekerja deterministik", () => {
    const a = { b: 2, a: 1, nested: { y: true, x: "hi" }, skip: undefined };
    const b = { nested: { x: "hi", y: true }, a: 1, b: 2 };
    expect(canonicalJson(a)).toBe('{"a":1,"b":2,"nested":{"x":"hi","y":true}}');
    expect(computePayloadHash(a)).toBe(computePayloadHash(b));
    expect(computePayloadHash({ exercise_id: "1" })).not.toBe(
      computePayloadHash({ exercise_id: "2" })
    );

    const validReq = new Request("http://localhost/api/test", {
      headers: { "Idempotency-Key": VALID_UID },
    });
    expect(requireIdempotencyKey(validReq)).toBe(VALID_UID);

    const badReq = new Request("http://localhost/api/test", {
      headers: { "Idempotency-Key": "invalid-key" },
    });
    expect(() => requireIdempotencyKey(badReq)).toThrowError(ApiError);
  });

  it("validasi Zod dan parseCanonicalAnswer menolak extra key, UUID salah, dan FIB > 255 karakter", async () => {
    expect(parseCanonicalAnswer({ option_id: VALID_UID })).toEqual({
      option_id: VALID_UID,
    });
    expect(parseCanonicalAnswer({ value: true })).toEqual({ value: true });
    expect(parseCanonicalAnswer({ value: "-" })).toEqual({ value: "-" });

    expect(() =>
      parseCanonicalAnswer({ type: "MC", option_id: VALID_UID })
    ).toThrowError(expect.objectContaining({ status: 422, code: "invalid_answer" }));

    expect(() =>
      parseCanonicalAnswer({ option_id: "not-uuid" })
    ).toThrowError(expect.objectContaining({ status: 422, code: "invalid_answer" }));

    expect(() =>
      parseCanonicalAnswer({ value: "a".repeat(256) })
    ).toThrowError(expect.objectContaining({ status: 422, code: "invalid_answer" }));

    const okAnsReq = new Request("http://localhost/api/x", {
      method: "POST",
      body: JSON.stringify({
        question_id: VALID_UID,
        answer: { value: "-" },
        time_spent_seconds: 8,
      }),
    });
    expect(await parseExerciseAnswerBody(okAnsReq)).toEqual({
      question_id: VALID_UID,
      answer: { value: "-" },
      time_spent_seconds: 8,
    });

    const badProfileReq = new Request("http://localhost/api/me", {
      method: "POST",
      body: JSON.stringify({ nama: "   ", nim: "123", extra: true }),
    });
    await expect(
      parseJsonPayload(badProfileReq, createProfileSchema)
    ).rejects.toMatchObject({ status: 400, code: "validation_error" });
  });
});
