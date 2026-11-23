import { NextResponse } from "next/server";
import { getOptionalIdempotencyKey } from "@/lib/http/idempotency";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { finalizeTestAttempt } from "@/lib/services/student-tests";

export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string }> }
) {
  return withAuthRoute(
    request,
    async ({ db }) => {
      const { attemptId } = await context.params;
      const idempotencyKey = getOptionalIdempotencyKey(request);
      const result = await finalizeTestAttempt(
        db,
        requireUuidParam(attemptId),
        idempotencyKey
      );
      return NextResponse.json(result, { status: 200 });
    },
    { st001Code: "already_submitted" }
  );
}
