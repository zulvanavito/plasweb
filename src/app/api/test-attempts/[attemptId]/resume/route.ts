import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { resumeTestAttempt } from "@/lib/services/student-tests";

export async function GET(
  request: Request,
  context: { params: Promise<{ attemptId: string }> }
) {
  return withAuthRoute(
    request,
    async ({ db }) => {
      const { attemptId } = await context.params;
      const activeQuestion = await resumeTestAttempt(
        db,
        requireUuidParam(attemptId)
      );
      return NextResponse.json(activeQuestion, { status: 200 });
    },
    { st001Code: "attempt_submitted" }
  );
}
