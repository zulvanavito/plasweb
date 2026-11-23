import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { listActivities } from "@/lib/services/student-progress";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const items = await listActivities(db, auth);
    return NextResponse.json(items, { status: 200 });
  });
}
