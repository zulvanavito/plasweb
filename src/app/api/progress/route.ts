import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { getProgressSummary } from "@/lib/services/student-progress";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const summary = await getProgressSummary(db, auth);
    return NextResponse.json(summary, { status: 200 });
  });
}
