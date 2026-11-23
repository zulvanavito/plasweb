import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { getExerciseDetail } from "@/lib/services/student-materials";

export async function GET(
  request: Request,
  context: { params: Promise<{ submaterialId: string }> }
) {
  return withAuthRoute(request, async ({ db }) => {
    const { submaterialId } = await context.params;
    const exercise = await getExerciseDetail(
      db,
      requireUuidParam(submaterialId)
    );
    return NextResponse.json(exercise, { status: 200 });
  });
}
