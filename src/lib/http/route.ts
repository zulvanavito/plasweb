import type { NextResponse } from "next/server";
import { authenticateRequest, type AuthContext } from "@/lib/auth/verify-token";
import { withUserTransaction, type DbClient } from "@/lib/db/pool";
import {
  ApiError,
  mapErrorToResponse,
  type MapErrorOptions,
} from "@/lib/http/errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuidParam(value: string): string {
  const trimmed = value.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new ApiError(400, "validation_error");
  }
  return trimmed;
}

export async function withAuthRoute(
  request: Request,
  handler: (ctx: {
    auth: AuthContext;
    db: DbClient;
    request: Request;
  }) => Promise<NextResponse>,
  errorOpts?: MapErrorOptions
): Promise<NextResponse> {
  try {
    const auth = await authenticateRequest(request);
    return await withUserTransaction(auth, (db) =>
      handler({ auth, db, request })
    );
  } catch (err) {
    return mapErrorToResponse(err, errorOpts);
  }
}
