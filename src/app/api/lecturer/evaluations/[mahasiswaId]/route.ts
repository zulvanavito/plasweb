import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { getLecturerEvaluationDetail } from "@/lib/services/lecturer-analytics";

export async function GET(
  request: Request,
  context: { params: Promise<{ mahasiswaId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { mahasiswaId } = await context.params;
    const data = await getLecturerEvaluationDetail(
      db,
      auth,
      requireUuidParam(mahasiswaId)
    );
    return NextResponse.json(data, { status: 200 });
  });
}
