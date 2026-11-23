import { NextResponse } from "next/server";
import { requireIdempotencyKey } from "@/lib/http/idempotency";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { createTestAttempt } from "@/lib/services/student-tests";

export async function POST(
  request: Request,
  context: { params: Promise<{ testId: string }> }
) {
  return withAuthRoute(request, async ({ db }) => {
    const { testId } = await context.params;
    const creationRequestId = requireIdempotencyKey(request);
    const result = await createTestAttempt(
      db,
      requireUuidParam(testId),
      creationRequestId
    );
    return NextResponse.json(result.dto, { status: result.status });
  });
}
