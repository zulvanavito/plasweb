import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { updateStudentClass } from "@/lib/services/student-profile";
import {
  parseJsonPayload,
  updateClassSchema,
} from "@/lib/validation/schemas";

export async function PATCH(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const body = await parseJsonPayload(request, updateClassSchema);
    const profile = await updateStudentClass(db, auth, body.kelas_id);
    return NextResponse.json(profile, { status: 200 });
  });
}
