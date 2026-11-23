import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import {
  createStudentProfile,
  getStudentProfile,
} from "@/lib/services/student-profile";
import {
  createProfileSchema,
  parseJsonPayload,
} from "@/lib/validation/schemas";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const profile = await getStudentProfile(db, auth);
    return NextResponse.json(profile, { status: 200 });
  });
}

export async function POST(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const body = await parseJsonPayload(request, createProfileSchema);
    const result = await createStudentProfile(db, auth, body);
    return NextResponse.json(result.profile, {
      status: result.created ? 201 : 200,
    });
  });
}
