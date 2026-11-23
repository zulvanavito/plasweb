import { NextResponse } from "next/server";
import { requireUuidParam, withAuthRoute } from "@/lib/http/route";
import {
  deleteLecturerClass,
  getLecturerClassDetail,
  updateLecturerClass,
} from "@/lib/services/lecturer-analytics";
import {
  lecturerClassPayloadSchema,
  parseJsonPayload,
} from "@/lib/validation/schemas";

export async function GET(
  request: Request,
  context: { params: Promise<{ kelasId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { kelasId } = await context.params;
    const data = await getLecturerClassDetail(
      db,
      auth,
      requireUuidParam(kelasId)
    );
    return NextResponse.json(data, { status: 200 });
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ kelasId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { kelasId } = await context.params;
    const body = await parseJsonPayload(request, lecturerClassPayloadSchema);
    const updated = await updateLecturerClass(
      db,
      auth,
      requireUuidParam(kelasId),
      body
    );
    return NextResponse.json(updated, { status: 200 });
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ kelasId: string }> }
) {
  return withAuthRoute(request, async ({ auth, db }) => {
    const { kelasId } = await context.params;
    const result = await deleteLecturerClass(
      db,
      auth,
      requireUuidParam(kelasId)
    );
    return NextResponse.json(result, { status: 200 });
  });
}
