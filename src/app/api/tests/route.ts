import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { getTestsOverview } from "@/lib/services/student-tests";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const overview = await getTestsOverview(db, auth);
    return NextResponse.json(overview, { status: 200 });
  });
}
