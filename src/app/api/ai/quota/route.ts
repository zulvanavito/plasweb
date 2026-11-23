import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { getAiQuota } from "@/lib/services/student-ai";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const quota = await getAiQuota(db, auth);
    return NextResponse.json(quota, { status: 200 });
  });
}
