import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { getExerciseAttemptDetail } from "@/lib/services/student-exercises";

export async function GET(
  request: Request,
  context: { params: Promise<{ attemptId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { attemptId } = await context.params;
    const detail = await getExerciseAttemptDetail(
      db,
      auth,
      requireUuidParam(attemptId)
    );
    return NextResponse.json(detail, { status: 200 });
  });
}
