import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { listClasses } from "@/lib/services/student-profile";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ db }) => {
    const classes = await listClasses(db);
    return NextResponse.json(classes, { status: 200 });
  });
}
