import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { getLecturerDashboard } from "@/lib/services/lecturer-analytics";
import {
  parseOptionalDateQuery,
  parseOptionalUuidQuery,
} from "@/lib/validation/schemas";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { searchParams } = new URL(request.url);
    const data = await getLecturerDashboard(db, auth, {
      kelasId: parseOptionalUuidQuery(searchParams.get("kelas_id")),
      from: parseOptionalDateQuery(searchParams.get("from")),
      to: parseOptionalDateQuery(searchParams.get("to")),
    });
    return NextResponse.json(data, { status: 200 });
  });
}
