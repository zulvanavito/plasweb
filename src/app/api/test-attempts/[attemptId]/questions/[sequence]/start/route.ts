import { NextResponse } from "next/server";
import { getOptionalIdempotencyKey } from "@/lib/http/idempotency";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { startTestQuestion } from "@/lib/services/student-tests";
import { parsePositiveSequenceParam } from "@/lib/validation/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string; sequence: string }> }
) {
  return withAuthRoute(
    request,
    async ({ db }) => {
      const { attemptId, sequence } = await context.params;
      getOptionalIdempotencyKey(request);
      const question = await startTestQuestion(
        db,
        requireUuidParam(attemptId),
        parsePositiveSequenceParam(sequence)
      );
      return NextResponse.json(question, { status: 200 });
    },
    { st001Code: "attempt_submitted" }
  );
}
