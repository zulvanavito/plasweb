import { NextResponse } from "next/server";
import { requireIdempotencyKey } from "@/lib/http/idempotency";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { submitTestAnswer } from "@/lib/services/student-tests";
import {
  parsePositiveSequenceParam,
  parseTestAnswerBody,
} from "@/lib/validation/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string; sequence: string }> }
) {
  return withAuthRoute(
    request,
    async ({ db }) => {
      const { attemptId, sequence } = await context.params;
      const submissionRequestId = requireIdempotencyKey(request);
      const answer = await parseTestAnswerBody(request);
      const ack = await submitTestAnswer(
        db,
        requireUuidParam(attemptId),
        parsePositiveSequenceParam(sequence),
        answer,
        submissionRequestId
      );
      return NextResponse.json(ack, { status: 200 });
    },
    { st001Code: "attempt_submitted" }
  );
}
