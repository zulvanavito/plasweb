import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import { exportLecturerEvaluationsCsv } from "@/lib/services/lecturer-analytics";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { searchParams } = new URL(request.url);
    const kelasId = requireUuidParam(searchParams.get("kelas_id") ?? "");
    const { filename, csv } = await exportLecturerEvaluationsCsv(
      db,
      auth,
      kelasId
    );
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
