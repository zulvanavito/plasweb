import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { getLecturerClassDetail } from "@/lib/services/lecturer-analytics";

export async function GET(
  request: Request,
  context: { params: Promise<{ kelasId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { kelasId } = await context.params;
    const data = await getLecturerClassDetail(
      db,
      auth,
      requireUuidParam(kelasId)
    );
    return NextResponse.json(data, { status: 200 });
  });
}
