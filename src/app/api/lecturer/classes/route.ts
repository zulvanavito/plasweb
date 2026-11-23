import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { listLecturerClasses } from "@/lib/services/lecturer-analytics";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { searchParams } = new URL(request.url);
    const data = await listLecturerClasses(db, auth, {
      search: searchParams.get("search") ?? undefined,
      tahunAkademik: searchParams.get("tahun_akademik") ?? undefined,
      semester: searchParams.get("semester") ?? undefined,
    });
    return NextResponse.json(data, { status: 200 });
  });
}
