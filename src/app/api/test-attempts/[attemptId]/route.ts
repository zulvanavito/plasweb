import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { getTestAttemptResult } from "@/lib/services/student-tests";

export async function GET(
  request: Request,
  context: { params: Promise<{ attemptId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { attemptId } = await context.params;
    const result = await getTestAttemptResult(
      db,
      auth,
      requireUuidParam(attemptId)
    );
    return NextResponse.json(result, { status: 200 });
  });
}
