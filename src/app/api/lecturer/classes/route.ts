import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import {
  createLecturerClass,
  listLecturerClasses,
} from "@/lib/services/lecturer-analytics";
import {
  lecturerClassPayloadSchema,
  parseJsonPayload,
} from "@/lib/validation/schemas";

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

export async function POST(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const body = await parseJsonPayload(request, lecturerClassPayloadSchema);
    const created = await createLecturerClass(db, auth, body);
    return NextResponse.json(created, { status: 201 });
  });
}
