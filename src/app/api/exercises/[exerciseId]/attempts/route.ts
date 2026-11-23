import { NextResponse } from "next/server";
import { requireIdempotencyKey } from "@/lib/http/idempotency";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import {
  createExerciseAttempt,
  listExerciseAttempts,
} from "@/lib/services/student-exercises";

export async function POST(
  request: Request,
  context: { params: Promise<{ exerciseId: string }> }
) {
  return withAuthRoute(request, async ({ db }) => {
    const { exerciseId } = await context.params;
    const creationRequestId = requireIdempotencyKey(request);
    const result = await createExerciseAttempt(
      db,
      requireUuidParam(exerciseId),
      creationRequestId
    );
    return NextResponse.json(result.dto, { status: result.status });
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ exerciseId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { exerciseId } = await context.params;
    const attempts = await listExerciseAttempts(
      db,
      auth,
      requireUuidParam(exerciseId)
    );
    return NextResponse.json(attempts, { status: 200 });
  });
}
