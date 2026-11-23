import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { getLecturerActivityDetail } from "@/lib/services/lecturer-analytics";

export async function GET(
  request: Request,
  context: { params: Promise<{ attemptId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { attemptId } = await context.params;
    const data = await getLecturerActivityDetail(
      db,
      auth,
      requireUuidParam(attemptId)
    );
    return NextResponse.json(data, { status: 200 });
  });
}
