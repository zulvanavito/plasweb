import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { removeStudentFromLecturerClass } from "@/lib/services/lecturer-analytics";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ kelasId: string; mahasiswaId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { kelasId, mahasiswaId } = await context.params;
    const result = await removeStudentFromLecturerClass(
      db,
      auth,
      requireUuidParam(kelasId),
      requireUuidParam(mahasiswaId)
    );
    return NextResponse.json(result, { status: 200 });
  });
}
