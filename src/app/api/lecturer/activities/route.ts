import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { listLecturerActivities } from "@/lib/services/lecturer-analytics";
import {
  parseOptionalEnumQuery,
  parseOptionalUuidQuery,
} from "@/lib/validation/schemas";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { searchParams } = new URL(request.url);
    const data = await listLecturerActivities(db, auth, {
      kelasId: parseOptionalUuidQuery(searchParams.get("kelas_id")),
      materialId: parseOptionalUuidQuery(searchParams.get("material_id")),
      questionType: parseOptionalEnumQuery(searchParams.get("question_type"), [
        "MC",
        "TF",
        "FIB",
      ] as const),
      status: parseOptionalEnumQuery(searchParams.get("status"), [
        "IN_PROGRESS",
        "SUBMITTED",
      ] as const),
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json(data, { status: 200 });
  });
}
