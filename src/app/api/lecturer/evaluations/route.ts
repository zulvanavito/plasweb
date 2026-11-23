import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { listLecturerEvaluations } from "@/lib/services/lecturer-analytics";
import { parseOptionalUuidQuery } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { searchParams } = new URL(request.url);
    const data = await listLecturerEvaluations(db, auth, {
      kelasId: parseOptionalUuidQuery(searchParams.get("kelas_id")),
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json(data, { status: 200 });
  });
}
