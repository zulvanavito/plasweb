import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { getMaterialDetail } from "@/lib/services/student-materials";

export async function GET(
  request: Request,
  context: { params: Promise<{ materialId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { materialId } = await context.params;
    const detail = await getMaterialDetail(
      db,
      auth,
      requireUuidParam(materialId)
    );
    return NextResponse.json(detail, { status: 200 });
  });
}
