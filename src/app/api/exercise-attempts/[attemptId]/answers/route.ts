import { NextResponse } from "next/server";
import { requireIdempotencyKey } from "@/lib/http/idempotency";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { submitExerciseAnswer } from "@/lib/services/student-exercises";
import { parseExerciseAnswerBody } from "@/lib/validation/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string }> }
) {
  return withAuthRoute(
    request,
    async ({ db }) => {
      const { attemptId } = await context.params;
      const submissionRequestId = requireIdempotencyKey(request);
      const body = await parseExerciseAnswerBody(request);
      const result = await submitExerciseAnswer(
        db,
        requireUuidParam(attemptId),
        body,
        submissionRequestId
      );
      return NextResponse.json(result, { status: 200 });
    },
    { st001Code: "already_submitted" }
  );
}
