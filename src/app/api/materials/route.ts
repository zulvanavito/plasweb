import { NextResponse } from "next/server";
import { withAuthRoute } from "@/lib/http/route";
import { listMaterials } from "@/lib/services/student-materials";

export async function GET(request: Request) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const materials = await listMaterials(db, auth);
    return NextResponse.json(materials, { status: 200 });
  });
}
