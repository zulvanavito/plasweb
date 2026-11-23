import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { getSubMaterialDetail } from "@/lib/services/student-materials";

export async function GET(
  request: Request,
  context: { params: Promise<{ submaterialId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { submaterialId } = await context.params;
    const detail = await getSubMaterialDetail(
      db,
      auth,
      requireUuidParam(submaterialId)
    );
    return NextResponse.json(detail, { status: 200 });
  });
}
