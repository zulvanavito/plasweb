import crypto from "node:crypto";
import { ApiError } from "@/lib/http/errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!UUID_REGEX.test(key)) {
    throw new ApiError(
      400,
      "validation_error",
      "Header Idempotency-Key wajib diisi dengan UUID valid."
    );
  }
  return key;
}

export function getOptionalIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get("idempotency-key")?.trim();
  if (!raw) return null;
  if (!UUID_REGEX.test(raw)) {
    throw new ApiError(
      400,
      "validation_error",
      "Header Idempotency-Key harus berupa UUID valid."
    );
  }
  return raw;
}

function normalizeCanonical(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeCanonical);
  }
  const sorted: Record<string, unknown> = {};
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record).sort()) {
    const val = record[key];
    if (val !== undefined) {
      sorted[key] = normalizeCanonical(val);
    }
  }
  return sorted;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeCanonical(value));
}

export function computePayloadHash(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonicalJson(payload))
    .digest("hex");
}
